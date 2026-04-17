#!/usr/bin/env python3
"""
score_skills.py — Skill Quality Inspector
Reads every SKILL.md in .claude/skills/, scores it on 6 dimensions, writes skills-data.json.

Run:  python3 score_skills.py
Output: storyboard/skills-data.json (loaded by dashboard)
"""

import json, re, os, math
from pathlib import Path

SKILLS_DIR  = Path(__file__).parent.parent.parent / ".claude" / "skills"
OUTPUT_FILE = Path(__file__).parent / "skills-data.json"

# ── Scoring dimensions ────────────────────────────────────────────────────────
# Each returns (score: int, notes: list[str])

def score_trigger_clarity(text: str, name: str) -> tuple[int, list]:
    """Does the skill clearly define WHEN to use it? (0–22)"""
    score = 0
    notes = []
    triggers = re.findall(r'(?i)(trigger|use when|when to use|use this when|activate|call this|invoke)', text)
    if triggers:
        score += 10
        notes.append(f"✅ Trigger conditions defined ({len(triggers)} references)")
    else:
        notes.append("❌ No explicit trigger conditions — when should Claude use this?")

    # Check for keyword lists
    if re.search(r'(?i)(keyword|phrase|mention|says)', text):
        score += 6
        notes.append("✅ Keyword/phrase triggers present")
    else:
        notes.append("⚠️ No keyword triggers — hard for Claude to auto-activate")

    # Check for negative cases (when NOT to use)
    if re.search(r'(?i)(do not|don\'t|avoid|not for|except|unless|never use)', text):
        score += 6
        notes.append("✅ Exclusion cases defined (when NOT to use)")
    else:
        notes.append("⚠️ Missing exclusion cases — skill may fire inappropriately")

    return min(score, 22), notes

def score_instruction_specificity(text: str, name: str) -> tuple[int, list]:
    """Are the instructions concrete and actionable? (0–22)"""
    score = 0
    notes = []
    words = len(text.split())

    # Word count
    if words >= 400:
        score += 8
        notes.append(f"✅ Detailed instructions ({words} words)")
    elif words >= 150:
        score += 5
        notes.append(f"⚠️ Moderate detail ({words} words) — could be more specific")
    else:
        notes.append(f"❌ Too brief ({words} words) — instructions likely too vague")

    # Step-by-step structure
    steps = len(re.findall(r'(?m)^\s*\d+[\.\)]\s', text))
    if steps >= 3:
        score += 7
        notes.append(f"✅ Numbered steps present ({steps} steps)")
    elif steps > 0:
        score += 3
        notes.append(f"⚠️ Some numbered steps ({steps}) — consider expanding")
    else:
        notes.append("⚠️ No numbered steps — add sequential instructions")

    # Headers / sections
    headers = len(re.findall(r'(?m)^#+\s', text))
    if headers >= 3:
        score += 7
        notes.append(f"✅ Well-structured with {headers} sections")
    elif headers >= 1:
        score += 3
        notes.append(f"⚠️ Only {headers} section header(s) — needs more structure")
    else:
        notes.append("❌ No section headers — hard to navigate")

    return min(score, 22), notes

def score_examples(text: str, name: str) -> tuple[int, list]:
    """Are there worked examples showing input → output? (0–20)"""
    score = 0
    notes = []

    # Code blocks (often examples)
    code_blocks = len(re.findall(r'```', text)) // 2
    if code_blocks >= 2:
        score += 8
        notes.append(f"✅ {code_blocks} code/example blocks")
    elif code_blocks == 1:
        score += 4
        notes.append("⚠️ Only 1 code block — add more examples")
    else:
        notes.append("❌ No code/example blocks")

    # Example keyword
    if re.search(r'(?i)(example|e\.g\.|for instance|sample|demo|like this)', text):
        score += 6
        notes.append("✅ Example language present")
    else:
        notes.append("⚠️ No example language — show don't tell")

    # Input/output pattern
    if re.search(r'(?i)(input|output|result|returns|produces|generates)', text):
        score += 6
        notes.append("✅ Input/output expectations defined")
    else:
        notes.append("⚠️ Input/output not explicitly described")

    return min(score, 20), notes

def score_decision_rules(text: str, name: str) -> tuple[int, list]:
    """Does the skill handle edge cases and decisions? (0–16)"""
    score = 0
    notes = []

    # Decision language
    if re.search(r'(?i)(if .{0,40}(then|use|choose|pick|select)|decide|decision|choose between|prefer)', text):
        score += 8
        notes.append("✅ Decision rules present")
    else:
        notes.append("❌ No decision rules — skill won't handle ambiguous cases well")

    # Error / edge case handling
    if re.search(r'(?i)(error|fail|missing|unavailable|fallback|edge case|if not|otherwise)', text):
        score += 8
        notes.append("✅ Edge cases / fallbacks addressed")
    else:
        notes.append("⚠️ No edge case handling — skill may fail silently")

    return min(score, 16), notes

def score_output_format(text: str, name: str) -> tuple[int, list]:
    """Is the expected output format defined? (0–12)"""
    score = 0
    notes = []

    if re.search(r'(?i)(format|structure|output|result|produce|generate|return|write|create)', text):
        score += 6
        notes.append("✅ Output description present")
    else:
        notes.append("❌ Output format not specified")

    if re.search(r'(?i)(file|\.html|\.docx|\.json|\.md|\.pdf|\.csv|\.xlsx|markdown|html|json)', text):
        score += 6
        notes.append("✅ Output file type / format specified")
    else:
        notes.append("⚠️ No specific output format (file type, structure) defined")

    return min(score, 12), notes

def score_length_density(text: str, name: str) -> tuple[int, list]:
    """Appropriate density — not too thin, not bloated (0–8)"""
    words = len(text.split())
    notes = []
    if 300 <= words <= 2000:
        notes.append(f"✅ Good length ({words} words)")
        return 8, notes
    elif words < 150:
        notes.append(f"❌ Too short ({words} words) — likely incomplete")
        return 2, notes
    elif words < 300:
        notes.append(f"⚠️ A bit thin ({words} words)")
        return 5, notes
    else:
        notes.append(f"⚠️ Very long ({words} words) — may overwhelm Claude's context")
        return 5, notes

# ── Main ──────────────────────────────────────────────────────────────────────
def score_skill(skill_dir: Path) -> dict:
    skill_name = skill_dir.name
    md_file = skill_dir / "SKILL.md"
    if not md_file.exists():
        return None

    text = md_file.read_text(encoding="utf-8", errors="ignore")

    s1, n1 = score_trigger_clarity(text, skill_name)
    s2, n2 = score_instruction_specificity(text, skill_name)
    s3, n3 = score_examples(text, skill_name)
    s4, n4 = score_decision_rules(text, skill_name)
    s5, n5 = score_output_format(text, skill_name)
    s6, n6 = score_length_density(text, skill_name)

    total = s1 + s2 + s3 + s4 + s5 + s6
    max_total = 22 + 22 + 20 + 16 + 12 + 8  # = 100

    # Normalise to 100
    score = round(total * 100 / max_total)

    # Grade
    grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 50 else "D"

    return {
        "name": skill_name,
        "score": score,
        "grade": grade,
        "dimensions": [
            {"label": "Trigger clarity",       "score": s1, "max": 22, "notes": n1},
            {"label": "Instruction detail",    "score": s2, "max": 22, "notes": n2},
            {"label": "Examples",              "score": s3, "max": 20, "notes": n3},
            {"label": "Decision rules",        "score": s4, "max": 16, "notes": n4},
            {"label": "Output format",         "score": s5, "max": 12, "notes": n5},
            {"label": "Length/density",        "score": s6, "max":  8, "notes": n6},
        ],
        "word_count": len(text.split()),
    }

def main():
    if not SKILLS_DIR.exists():
        print(f"Skills dir not found: {SKILLS_DIR}")
        return

    results = []
    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        result = score_skill(skill_dir)
        if result:
            results.append(result)
            grade_col = "\033[92m" if result["grade"] == "A" else "\033[93m" if result["grade"] == "B" else "\033[91m"
            print(f"  {grade_col}{result['grade']} {result['score']:3d}/100\033[0m  {result['name']}")

    # Summary
    avg = round(sum(r["score"] for r in results) / len(results)) if results else 0
    a_count = sum(1 for r in results if r["grade"] == "A")
    d_count = sum(1 for r in results if r["grade"] == "D")
    print(f"\n  Skills scored: {len(results)}  |  Average: {avg}/100  |  A: {a_count}  |  Needs work: {d_count}")

    output = {
        "skills": results,
        "summary": {"total": len(results), "average": avg, "scored_at": __import__("datetime").datetime.now().isoformat()},
    }
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"\n✅ Written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
