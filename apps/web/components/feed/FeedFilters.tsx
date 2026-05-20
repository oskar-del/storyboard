"use client";

const TYPES = ["", "session", "decision", "idea", "rejection", "intent", "milestone"];
const STATUSES = ["", "done", "in_progress", "not_started"];

interface Props {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

export function FeedFilters({ value, onChange }: Props) {
  const set = (key: string, v: string) => {
    const next = { ...value };
    if (v) next[key] = v; else delete next[key];
    onChange(next);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={value.type ?? ""}
        onChange={(e) => set("type", e.target.value)}
        className="text-xs bg-surface2 border border-[var(--border)] text-muted2 px-2 py-1.5 rounded-lg outline-none"
      >
        <option value="">All types</option>
        {TYPES.filter(Boolean).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={value.status ?? ""}
        onChange={(e) => set("status", e.target.value)}
        className="text-xs bg-surface2 border border-[var(--border)] text-muted2 px-2 py-1.5 rounded-lg outline-none"
      >
        <option value="">All statuses</option>
        {STATUSES.filter(Boolean).map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Search…"
        value={value.q ?? ""}
        onChange={(e) => set("q", e.target.value)}
        className="text-xs bg-surface2 border border-[var(--border)] text-white px-3 py-1.5 rounded-lg outline-none placeholder:text-muted w-36"
      />
    </div>
  );
}
