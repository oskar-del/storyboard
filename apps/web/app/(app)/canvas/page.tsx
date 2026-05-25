"use client";
import { useProjects } from "@/lib/hooks/useProjects";
import { ProjectCard } from "@/components/canvas/ProjectCard";
import { FABSpeedDial } from "@/components/capture/FABSpeedDial";

export default function CanvasPage() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted">
        Loading canvas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-accent3">
        Failed to load projects. Is the API running?
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Canvas</h1>
          <p className="text-sm text-muted mt-1">{projects?.length ?? 0} active projects</p>
        </div>
        <SeedButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects?.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {projects?.length === 0 && (
          <p className="text-muted col-span-full text-center py-12">
            No projects yet. Capture your first block to get started.
          </p>
        )}
      </div>

      <FABSpeedDial />
    </div>
  );
}

function SeedButton() {
  const handleSeed = async () => {
    try {
      const { sessionApi } = await import("@/lib/api-client");
      const { seed } = await sessionApi.seed();
      await navigator.clipboard.writeText(seed);
      alert("Session seed copied to clipboard!");
    } catch {
      alert("Failed to generate seed.");
    }
  };

  return (
    <button
      onClick={handleSeed}
      className="bg-surface2 border border-[var(--border2)] text-sm font-medium px-4 py-2 rounded-lg hover:border-accent/50 transition"
    >
      🌱 Seed New Chat
    </button>
  );
}
