"use client";
import { useBlocks } from "@/lib/hooks/useBlocks";
import { BlockCard } from "@/components/feed/BlockCard";
import { FABSpeedDial } from "@/components/capture/FABSpeedDial";
import { use } from "react";

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const projectName = decodeURIComponent(slug);
  const { data: blocks, isLoading } = useBlocks({ project: projectName, limit: "50" });

  const decisions = blocks?.filter((b) => b.type === "decision") ?? [];
  const ideas = blocks?.filter((b) => b.type === "idea") ?? [];
  const sessions = blocks?.filter((b) => b.type === "session") ?? [];

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
        <div className="flex gap-4 mt-2 text-xs text-muted">
          <span>{sessions.length} sessions</span>
          <span>{decisions.length} decisions</span>
          <span>{ideas.length} ideas</span>
        </div>
      </div>

      {/* Decisions section */}
      {decisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted2 uppercase tracking-widest mb-3">Decisions</h2>
          <div className="flex flex-col gap-2">
            {decisions.map((b) => <BlockCard key={b.id} block={b} />)}
          </div>
        </section>
      )}

      {/* All blocks */}
      <section>
        <h2 className="text-sm font-semibold text-muted2 uppercase tracking-widest mb-3">All Activity</h2>
        <div className="flex flex-col gap-3">
          {isLoading && <p className="text-muted text-sm text-center py-8">Loading…</p>}
          {blocks?.map((b) => <BlockCard key={b.id} block={b} />)}
        </div>
      </section>

      <FABSpeedDial />
    </div>
  );
}
