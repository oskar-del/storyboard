export type BlockType =
  | "session"
  | "decision"
  | "idea"
  | "milestone"
  | "rejection"
  | "intent"
  | "preview"
  | "discussion"
  | "compaction";

export type BlockStatus = "done" | "in_progress" | "not_started";

export interface Block {
  id: string;
  user_id: string;
  project: string;
  type: BlockType;
  status: BlockStatus;
  title: string;
  summary?: string;
  seed?: string;
  task?: string;
  chips?: string[];
  decisions?: string[];
  ideas?: string[];
  tags?: string[];
  heat?: string;
  replacedBy?: string;
  _live?: boolean;
  _source?: string;
  _url?: string;
  _author?: string;
  _captured: string;
  ts?: number;
  date?: string;
}

export interface Project {
  id: string;
  name: string;
  north_star?: string;
  color: string;
  total_blocks: number;
  by_type: Record<string, number>;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  score: number;
  last_scored_at?: string;
}

export interface RawCapture {
  id: string;
  title: string;
  source: string;
  url?: string;
  turnCount: number;
  processed: boolean;
  captured_at: string;
}

export interface SessionBrief {
  sprintDay: number;
  lastSession?: { title: string; project: string };
  lastDecisions: string[];
  hottestProject?: string;
  todayCount: number;
  pendingIdeas: Array<{ title: string; project: string }>;
  inProgress: Array<{ title: string; project: string }>;
  totalBlocks: number;
}
