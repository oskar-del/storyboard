"use client";
import { skillsApi } from "@/lib/api-client";
import { SkillsHealth } from "@/components/skills/SkillsHealth";

export default function SettingsPage() {
  const handleScoreSkills = async () => {
    try {
      const result = await skillsApi.score();
      alert(`Skills scored. Updated: ${result.updated}`);
    } catch {
      alert("Skill scoring failed.");
    }
  };

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>

      {/* MCP Setup */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">MCP Server</h2>
        <div className="bg-surface border border-[var(--border)] rounded-xl p-4 text-sm text-muted2">
          <p className="mb-3">Add to your Claude Desktop config:</p>
          <pre className="bg-bg rounded-lg p-3 text-xs text-green overflow-x-auto">{`{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/path/to/apps/mcp/mcp-server.js"],
      "env": {
        "STORYBOARD_API_URL": "${process.env.NEXT_PUBLIC_API_URL}",
        "STORYBOARD_TOKEN": "<your-token>",
        "STORYBOARD_AUTHOR": "your-name"
      }
    }
  }
}`}</pre>
        </div>
      </section>

      {/* Skills health */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Skills Health</h2>
          <button
            onClick={handleScoreSkills}
            className="text-xs bg-surface2 border border-[var(--border2)] px-3 py-1.5 rounded-lg hover:border-accent/50 transition"
          >
            Re-score
          </button>
        </div>
        <SkillsHealth />
      </section>

      {/* Export */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">Backup</h2>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export`}
          className="inline-block text-sm bg-surface2 border border-[var(--border2)] px-4 py-2 rounded-lg hover:border-white/25 transition"
          download
        >
          💾 Download full backup
        </a>
      </section>
    </div>
  );
}
