"use client";
import { useBlocks } from "@/lib/hooks/useBlocks";
import { BlockCard } from "@/components/feed/BlockCard";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { FABSpeedDial } from "@/components/capture/FABSpeedDial";
import { useState } from "react";

export default function FeedPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: blocks, isLoading } = useBlocks(filters);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
        <span className="text-xs text-muted bg-surface2 px-2 py-1 rounded-full">
          ⚡ Live · refreshes every 10s
        </span>
      </div>

      <FeedFilters value={filters} onChange={setFilters} />

      <div className="flex flex-col gap-3 mt-6">
        {isLoading && (
          <p className="text-muted text-sm text-center py-8">Loading…</p>
        )}
        {blocks?.map((block) => (
          <BlockCard key={block.id} block={block} />
        ))}
        {!isLoading && blocks?.length === 0 && (
          <p className="text-muted text-center py-12 text-sm">
            No blocks yet. Use the MCP server or browser extension to capture.
          </p>
        )}
      </div>

      <FABSpeedDial />
    </div>
  );
}
