"use client";

import { useState, useEffect } from "react";
import { skillsApi } from "@/lib/api-client";
import { SkillsHealth } from "@/components/skills/SkillsHealth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingInvite {
  email: string;
  sent_at: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <InviteSection />
      <MCPSection />
      <SkillsSection />
      <BackupSection />
    </div>
  );
}

// ── Invite collaborators ───────────────────────────────────────────────────────

function InviteSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    setLoadingInvites(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(`${API_URL}/api/v1/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setPendingInvites(json.invites ?? []);
      }
    } catch { /* silent */ }
    setLoadingInvites(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(`${API_URL}/api/v1/invites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Invite failed");
      } else {
        setStatus("sent");
        setEmail("");
        // Refresh list
        await fetchInvites();
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again");
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold mb-1">Invite collaborators</h2>
      <p className="text-xs text-muted2 mb-4">
        Storyboard is invite-only. Invite someone and they'll get an email with
        a magic link — no password required.
      </p>

      <form onSubmit={handleInvite} className="flex gap-3 mb-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@example.com"
          className="flex-1 bg-bg border border-[var(--border2)] rounded-xl px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent transition"
        />
        <button
          type="submit"
          disabled={status === "sending" || !email.trim()}
          className="bg-accent text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "✓ Sent!" : "Send invite"}
        </button>
      </form>

      {errorMsg && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {errorMsg}
        </p>
      )}

      {/* Pending invites list */}
      {!loadingInvites && pendingInvites.length > 0 && (
        <div className="bg-surface border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border)] text-xs text-muted font-medium uppercase tracking-wider">
            Pending invites
          </div>
          {pendingInvites.map((inv) => (
            <div
              key={inv.email}
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-sm">{inv.email}</span>
              <span className="text-xs text-muted">
                {new Date(inv.sent_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loadingInvites && pendingInvites.length === 0 && (
        <p className="text-xs text-muted">No pending invites yet.</p>
      )}
    </section>
  );
}

// ── MCP setup ─────────────────────────────────────────────────────────────────

function MCPSection() {
  const [copied, setCopied] = useState(false);

  const snippet = `{
  "mcpServers": {
    "storyboard": {
      "command": "node",
      "args": ["/path/to/apps/mcp/mcp-server.js"],
      "env": {
        "STORYBOARD_API_URL": "${API_URL}",
        "STORYBOARD_TOKEN": "<your-token>",
        "STORYBOARD_AUTHOR": "your-name"
      }
    }
  }
}`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <h2 className="text-base font-semibold mb-3">MCP Server</h2>
      <div className="bg-surface border border-[var(--border)] rounded-xl p-4 text-sm text-muted2">
        <div className="flex items-center justify-between mb-3">
          <span>Add to your Claude Desktop config:</span>
          <button
            onClick={copySnippet}
            className="text-xs text-accent hover:underline"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-bg rounded-lg p-3 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
          {snippet}
        </pre>
      </div>
    </section>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────

function SkillsSection() {
  const [status, setStatus] = useState<"idle" | "scoring" | "done" | "error">("idle");

  async function handleScoreSkills() {
    setStatus("scoring");
    try {
      const result = await skillsApi.score();
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
      console.log("Skills updated:", result.updated);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Skills Health</h2>
        <button
          onClick={handleScoreSkills}
          disabled={status === "scoring"}
          className="text-xs bg-surface2 border border-[var(--border2)] px-3 py-1.5 rounded-lg hover:border-accent/50 transition disabled:opacity-50"
        >
          {status === "scoring" ? "Scoring…" : status === "done" ? "✓ Updated" : status === "error" ? "Failed" : "Re-score"}
        </button>
      </div>
      <SkillsHealth />
    </section>
  );
}

// ── Backup ────────────────────────────────────────────────────────────────────

function BackupSection() {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Backup</h2>
      <p className="text-xs text-muted2 mb-3">
        Downloads a full JSON snapshot of all your blocks, projects, and skills.
      </p>
      <a
        href={`${API_URL}/api/v1/export`}
        className="inline-flex items-center gap-2 text-sm bg-surface2 border border-[var(--border2)] px-4 py-2 rounded-lg hover:border-white/25 transition"
        download
      >
        💾 Download full backup
      </a>
    </section>
  );
}
