import type { Block } from "@/lib/types";
import clsx from "clsx";

const TYPE_COLORS: Record<string, string> = {
  session:    "border-accent",
  decision:   "border-green",
  idea:       "border-yellow",
  rejection:  "border-muted",
  intent:     "border-accent2",
  milestone:  "border-orange",
  preview:    "border-accent3",
  discussion: "border-accent2",
};

const TYPE_ICONS: Record<string, string> = {
  session: "◈", decision: "✓", idea: "💡", rejection: "✕",
  intent: "🎯", milestone: "🏁", preview: "🖼", discussion: "💬",
};

const STATUS_DOT: Record<string, string> = {
  done:        "bg-green",
  in_progress: "bg-yellow animate-pulse",
  not_started: "bg-muted",
};

export function BlockCard({ block }: { block: Block }) {
  const borderColor = TYPE_COLORS[block.type] ?? "border-[var(--border)]";

  return (
    <div
      className={clsx(
        "bg-surface border border-[var(--border)] rounded-xl p-4 border-l-2",
        borderColor
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{TYPE_ICONS[block.type] ?? "•"}</span>
          <p className="text-sm font-medium text-white leading-snug truncate">{block.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[block.status])} />
          <span className="text-xs text-muted">{block.date ?? ""}</span>
        </div>
      </div>

      {/* Project + type */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted2 bg-surface2 px-1.5 py-0.5 rounded">{block.project}</span>
        <span className="text-xs text-muted">{block.type}</span>
        {block._live && (
          <span className="text-xs text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">live</span>
        )}
      </div>

      {/* Summary */}
      {block.summary && (
        <p className="text-xs text-muted2 line-clamp-2 leading-relaxed">{block.summary}</p>
      )}

      {/* Chips */}
      {block.chips && block.chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {block.chips.slice(0, 4).map((chip) => (
            <span
              key={chip}
              className="text-xs text-muted bg-surface2 border border-[var(--border)] px-1.5 py-0.5 rounded"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
