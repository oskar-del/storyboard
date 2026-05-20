"use client";
import useSWR from "swr";
import { skillsApi } from "@/lib/api-client";
import type { Skill } from "@/lib/types";

export function SkillsHealth() {
  const { data: skills, isLoading } = useSWR<Skill[]>("/skills", skillsApi.list);

  if (isLoading) return <p className="text-xs text-muted">Loading skills…</p>;
  if (!skills?.length) return <p className="text-xs text-muted">No skills tracked yet.</p>;

  const maxScore = Math.max(...skills.map((s) => s.score), 1);

  return (
    <div className="bg-surface border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
      {skills.slice(0, 10).map((skill) => (
        <div key={skill.id} className="flex items-center gap-3">
          <span className="text-xs text-muted2 w-28 truncate">{skill.name}</span>
          <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all"
              style={{ width: `${Math.round((skill.score / maxScore) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted w-6 text-right">{skill.score}</span>
        </div>
      ))}
    </div>
  );
}
