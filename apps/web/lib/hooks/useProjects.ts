import useSWR from "swr";
import { projectsApi } from "../api-client";
import type { Project } from "../types";

export function useProjects() {
  return useSWR<Project[]>("/projects", projectsApi.list);
}
