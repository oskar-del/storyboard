import useSWR from "swr";
import { blocksApi } from "../api-client";
import type { Block } from "../types";

export function useBlocks(params?: Record<string, string>) {
  const key = params ? ["/blocks", params] : "/blocks";
  return useSWR<Block[]>(key, () => blocksApi.list(params), {
    refreshInterval: 10_000, // Tetris mode — live refresh every 10s
  });
}

export function useBlock(id: string) {
  return useSWR<Block>(id ? `/blocks/${id}` : null, () => blocksApi.get(id));
}
