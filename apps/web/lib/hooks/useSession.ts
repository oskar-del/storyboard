import useSWR from "swr";
import { sessionApi } from "../api-client";
import type { SessionBrief } from "../types";

export function useSessionBrief() {
  return useSWR<SessionBrief>("/session/start", sessionApi.start, {
    refreshInterval: 30_000,
  });
}
