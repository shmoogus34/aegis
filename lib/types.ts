// lib/types.ts — Shared TypeScript interfaces across A.E.G.I.S.

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  href?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  courseColor: string;
  name: string;
  dueAt: string | null;
  pointsPossible: number | null;
  submissionType: string[];
  submitted: boolean;
  missing: boolean;
  late: boolean;
  lockdownBrowser: boolean;
  htmlUrl: string;
}

export interface Announcement {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  message: string;
  postedAt: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  dueAt: string | null;
  timeLimit: number | null;
  questionCount: number;
  htmlUrl: string;
}

export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isNow?: boolean;
  color?: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  source: 'canvas' | 'openrouter' | 'nvidia' | 'calendar' | 'vault' | 'system';
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
  model?: string;
  provider?: 'openrouter' | 'nvidia' | 'local';
  tokens?: number;
}

export interface Directive {
  id: string;
  text: string;
  courseCode: string;
  tag: string;
  completed: boolean;
  dueAt: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ModelRoute {
  provider: 'openrouter' | 'nvidia';
  domain: string;
  courses: string[];
  model: string;
  modelDisplay: string;
  reason: string;
  color: string;
  contextWindow?: string;
}

export interface VaultFile {
  name: string;
  path: string;
  course: string;
  content?: string;
  lastModified?: string;
}

export type AegisTab = 'command' | 'assignments' | 'study' | 'vault' | 'models' | 'automation';
