"use client";
import useSWR from "swr";
import { captureApi } from "@/lib/api-client";
import type { RawCapture } from "@/lib/types";

export default function InboxPage() {
  const { data, isLoading, mutate } = useSWR("/capture/raw", captureApi.listRaw);
  const captures: RawCapture[] = data?.captures ?? [];

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <span className="text-xs text-muted bg-surface2 px-2 py-1 rounded-full">
          {captures.length} unprocessed
        </span>
      </div>

      <p className="text-sm text-muted2 mb-6">
        Raw captures from the browser extension — review and confirm blocks to add to your storyboard.
      </p>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-muted text-sm text-center py-8">Loading…</p>}
        {captures.map((cap) => (
          <div
            key={cap.id}
            className="bg-surface border border-[var(--border)] rounded-xl p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{cap.title || "Untitled capture"}</p>
              <p className="text-xs text-muted mt-1">
                {cap.source} · {cap.turnCount} turns · {new Date(cap.captured_at).toLocaleDateString()}
              </p>
            </div>
            <ProcessButton capture={cap} onDone={() => mutate()} />
          </div>
        ))}
        {!isLoading && captures.length === 0 && (
          <p className="text-muted text-center py-12 text-sm">
            Inbox is empty. Raw captures from the browser extension appear here.
          </p>
        )}
      </div>
    </div>
  );
}

function ProcessButton({ capture, onDone }: { capture: RawCapture; onDone: () => void }) {
  const handleProcess = async () => {
    try {
      const result = await captureApi.processTranscript({ transcript: capture.title, rawId: capture.id });
      if (result.ok && result.candidates.length > 0) {
        const saved = await captureApi.confirmCandidates(result.candidates);
        alert(`Saved ${saved.saved} blocks from this capture.`);
        onDone();
      } else {
        alert("No blocks extracted.");
      }
    } catch {
      alert("Processing failed.");
    }
  };

  return (
    <button
      onClick={handleProcess}
      className="text-xs bg-accent/15 text-accent border border-accent/30 px-3 py-1.5 rounded-lg shrink-0 hover:bg-accent/25 transition"
    >
      Process
    </button>
  );
}
