"use client";
import { useState } from "react";
import { blocksApi } from "@/lib/api-client";

const QUICK_TYPES = [
  { type: "idea",     label: "💡 Idea",     status: "not_started" },
  { type: "decision", label: "✓ Decision",  status: "done" },
  { type: "session",  label: "◈ Session",   status: "done" },
];

export function FABSpeedDial() {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");

  const handleCapture = async (type: string, status: string) => {
    setCapturing(type);
  };

  const handleSubmit = async (type: string, status: string) => {
    if (!title.trim()) return;
    try {
      await blocksApi.create({
        type: type as any,
        title: title.trim(),
        project: project || "Storyboard",
        status: status as any,
        _live: true,
      });
      setTitle("");
      setProject("");
      setCapturing(null);
      setOpen(false);
    } catch (err) {
      alert("Capture failed. Is the API running?");
    }
  };

  if (capturing) {
    const typeInfo = QUICK_TYPES.find((t) => t.type === capturing)!;
    return (
      <div className="fixed bottom-6 right-6 bg-surface border border-[var(--border2)] rounded-2xl p-4 w-72 shadow-2xl z-50">
        <p className="text-sm font-semibold mb-3">{typeInfo.label}</p>
        <input
          autoFocus
          type="text"
          placeholder="Title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(capturing, typeInfo.status); if (e.key === "Escape") setCapturing(null); }}
          className="w-full bg-bg border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent mb-2"
        />
        <input
          type="text"
          placeholder="Project (optional)"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="w-full bg-bg border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit(capturing, typeInfo.status)}
            className="flex-1 bg-accent text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90 transition"
          >
            Capture
          </button>
          <button
            onClick={() => setCapturing(null)}
            className="px-3 py-2 bg-surface2 text-muted text-sm rounded-lg hover:text-white transition"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && QUICK_TYPES.map((t) => (
        <button
          key={t.type}
          onClick={() => handleCapture(t.type, t.status)}
          className="bg-surface border border-[var(--border2)] text-sm font-medium px-4 py-2 rounded-xl shadow hover:border-accent/50 transition animate-in fade-in slide-in-from-bottom-1"
        >
          {t.label}
        </button>
      ))}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-accent text-white text-xl font-bold shadow-[0_0_30px_rgba(124,107,255,0.4)] hover:opacity-90 transition flex items-center justify-center"
      >
        {open ? "✕" : "+"}
      </button>
    </div>
  );
}
