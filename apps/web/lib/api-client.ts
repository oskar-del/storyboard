import { createClient } from "@/lib/supabase/client";
import type { Block, Project, Skill, RawCapture, SessionBrief } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Blocks ────────────────────────────────────────────────────────────────────
export const blocksApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<Block[]>("GET", `/api/v1/blocks${qs}`);
  },
  get: (id: string) => apiFetch<Block>("GET", `/api/v1/blocks/${id}`),
  create: (body: Partial<Block> & { project: string; type: string; title: string }) =>
    apiFetch<Block>("POST", "/api/v1/blocks", body),
  update: (id: string, body: { status?: string; note?: string }) =>
    apiFetch<Block>("PATCH", `/api/v1/blocks/${id}`, body),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => apiFetch<Project[]>("GET", "/api/v1/projects"),
};

// ── Session ───────────────────────────────────────────────────────────────────
export const sessionApi = {
  start: () => apiFetch<SessionBrief>("GET", "/api/v1/session/start"),
  seed: (params?: { project?: string; format?: string; category?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ seed: string }>("GET", `/api/v1/session/seed${qs}`);
  },
};

// ── Skills ────────────────────────────────────────────────────────────────────
export const skillsApi = {
  list: () => apiFetch<Skill[]>("GET", "/api/v1/skills"),
  score: () => apiFetch<{ ok: boolean; updated: number }>("POST", "/api/v1/skills/score"),
};

// ── Capture ───────────────────────────────────────────────────────────────────
export const captureApi = {
  listRaw: () => apiFetch<{ captures: RawCapture[] }>("GET", "/api/v1/capture/raw"),
  processTranscript: (body: { transcript: string; rawId?: string; project?: string }) =>
    apiFetch<{ ok: boolean; candidates: unknown[] }>("POST", "/api/v1/capture/process", body),
  confirmCandidates: (approved: unknown[]) =>
    apiFetch<{ ok: boolean; saved: number }>("POST", "/api/v1/capture/confirm", { approved }),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  full: () => {
    return fetch(`${API_URL}/api/v1/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("sb-token") ?? ""}` },
    });
  },
};
