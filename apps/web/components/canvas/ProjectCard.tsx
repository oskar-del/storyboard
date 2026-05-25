import Link from "next/link";
import type { Project } from "@/lib/types";

const TYPE_ICONS: Record<string, string> = {
  session: "◈", decision: "✓", idea: "💡", rejection: "✕",
  intent: "🎯", milestone: "🏁", preview: "🖼", discussion: "💬",
};

export function ProjectCard({ project }: { project: Project }) {
  const typeEntries = Object.entries(project.by_type ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Link
      href={`/projects/${encodeURIComponent(project.name)}`}
      className="group block bg-surface border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border2)] transition-all hover:shadow-[0_0_0_1px_rgba(124,107,255,0.15)] cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: project.color ?? "#7c6bff" }}
          />
          <h3 className="font-semibold text-white truncate">{project.name}</h3>
        </div>
        <span className="text-xs text-muted shrink-0">{project.total_blocks} blocks</span>
      </div>

      {/* North star */}
      {project.north_star && (
        <p className="text-xs text-muted2 mb-4 line-clamp-2 leading-relaxed">
          🎯 {project.north_star}
        </p>
      )}

      {/* Type breakdown */}
      <div className="flex flex-wrap gap-1.5">
        {typeEntries.slice(0, 5).map(([type, count]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 text-xs bg-surface2 border border-[var(--border)] px-2 py-0.5 rounded-full text-muted2"
          >
            {TYPE_ICONS[type] ?? "•"} {count} {type}
          </span>
        ))}
      </div>
    </Link>
  );
}
