// lib/store.ts — Zustand global store for A.E.G.I.S.

import { create } from 'zustand';
import type { Assignment, Announcement, Quiz, CalEvent, AgentLog, Directive, VaultFile, AegisTab } from './types';

interface AegisStore {
  // ── Navigation Tabs ───────────────────────────────────────
  activeTab: AegisTab;
  setActiveTab: (tab: AegisTab) => void;

  // ── Canvas ────────────────────────────────────────────────
  assignments:   Assignment[];
  announcements: Announcement[];
  quizzes:       Quiz[];
  selectedAssignment: Assignment | null;
  setAssignments:        (a: Assignment[])   => void;
  setAnnouncements:      (a: Announcement[]) => void;
  setQuizzes:            (q: Quiz[])         => void;
  setSelectedAssignment: (a: Assignment | null) => void;

  // ── Calendar ──────────────────────────────────────────────
  calendarEvents: CalEvent[];
  setCalendarEvents: (e: CalEvent[]) => void;

  // ── Directives ────────────────────────────────────────────
  directives: Directive[];
  setDirectives:       (d: Directive[]) => void;
  toggleDirective:     (id: string)     => void;

  // ── Agent Terminal ────────────────────────────────────────
  agentLogs: AgentLog[];
  pushLog:   (log: Omit<AgentLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  // ── Three.js Sphere / Graph ───────────────────────────────
  spherePulse:     boolean;
  setSpherePulse:  (v: boolean) => void;

  // ── Active Operations ─────────────────────────────────────
  activeOps:     Set<string>;
  startOp:       (id: string) => void;
  endOp:         (id: string) => void;

  // ── Vault ─────────────────────────────────────────────────
  vaultFiles:    VaultFile[];
  setVaultFiles: (f: VaultFile[]) => void;

  // ── Modal State ───────────────────────────────────────────
  activeModal: 'model-router' | 'obsidian' | 'automation' | 'assignment-detail' | null;
  setActiveModal: (m: 'model-router' | 'obsidian' | 'automation' | 'assignment-detail' | null) => void;

  // ── Preferred Model Provider ──────────────────────────────
  preferredProvider: 'openrouter' | 'nvidia' | 'auto';
  setPreferredProvider: (p: 'openrouter' | 'nvidia' | 'auto') => void;

  // ── Canvas Sync Status ────────────────────────────────────
  lastCanvasSync:   string | null;
  lastCalendarSync: string | null;
  setLastCanvasSync:   (t: string) => void;
  setLastCalendarSync: (t: string) => void;
}

export const useAegisStore = create<AegisStore>((set, get) => ({
  // Navigation Tabs
  activeTab: 'command',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Canvas
  assignments:        [],
  announcements:      [],
  quizzes:            [],
  selectedAssignment: null,
  setAssignments:        (a) => set({ assignments: a }),
  setAnnouncements:      (a) => set({ announcements: a }),
  setQuizzes:            (q) => set({ quizzes: q }),
  setSelectedAssignment: (a) => set({ selectedAssignment: a }),

  // Calendar
  calendarEvents:    [],
  setCalendarEvents: (e) => set({ calendarEvents: e }),

  // Directives — seeded with today's active deliverables
  directives: [
    {
      id: 'd1',
      text: 'Quiz 5: Market Structures & Monopoly Pricing',
      courseCode: 'ECON-217',
      tag: 'ONLINE QUIZ',
      completed: false,
      dueAt: '2026-10-02T23:59:00',
      priority: 'critical',
    },
    {
      id: 'd2',
      text: 'Quiz 3: Normal Distribution & Central Limit Theorem',
      courseCode: 'MATH-171',
      tag: 'STATS QUIZ',
      completed: false,
      dueAt: '2026-10-04T23:59:00',
      priority: 'high',
    },
    {
      id: 'd3',
      text: 'Homework 4: Regression Analysis & Hypothesis Testing',
      courseCode: 'MATH-171',
      tag: 'PROBLEM SET',
      completed: false,
      dueAt: '2026-10-07T23:59:00',
      priority: 'high',
    },
    {
      id: 'd4',
      text: 'Problem Set 3: Elasticity & Deadweight Loss',
      courseCode: 'ECON-217',
      tag: 'PROBLEM SET',
      completed: false,
      dueAt: '2026-10-09T23:59:00',
      priority: 'medium',
    },
    {
      id: 'd5',
      text: 'Test 2 Prep: Business Entities, LLCs & Corporations',
      courseCode: 'BUSN-296',
      tag: 'EXAM PREP',
      completed: false,
      dueAt: '2026-10-11T23:59:00',
      priority: 'high',
    },
    {
      id: 'd6',
      text: 'Social Venture Proposal: Logic Model & Impact Metrics',
      courseCode: 'CTZN-110',
      tag: 'PROPOSAL',
      completed: false,
      dueAt: '2026-10-14T23:59:00',
      priority: 'medium',
    },
  ],
  setDirectives:   (d) => set({ directives: d }),
  toggleDirective: (id) =>
    set((s) => ({
      directives: s.directives.map((d) =>
        d.id === id ? { ...d, completed: !d.completed } : d
      ),
    })),

  // Agent Logs
  agentLogs: [
    {
      id: 'boot-1',
      timestamp: new Date().toISOString(),
      source: 'system',
      message: 'A.E.G.I.S. v2.0 boot sequence initiated. All subsystems online.',
      level: 'success',
    },
    {
      id: 'boot-2',
      timestamp: new Date().toISOString(),
      source: 'canvas',
      message: 'Canvas REST client connected → longwood.instructure.com',
      level: 'info',
    },
    {
      id: 'boot-3',
      timestamp: new Date().toISOString(),
      source: 'calendar',
      message: 'Apple Calendar feed connected → iCloud p66-caldav active',
      level: 'info',
    },
    {
      id: 'boot-4',
      timestamp: new Date().toISOString(),
      source: 'openrouter',
      message: 'OpenRouter Multi-API router active → 1B token pool loaded',
      level: 'success',
    },
    {
      id: 'boot-5',
      timestamp: new Date().toISOString(),
      source: 'nvidia',
      message: 'NVIDIA NIM API cluster connected → Meta Llama 3.2, GLM-5.3 & GPT-OSS active',
      level: 'success',
    },
  ],
  pushLog: (log) =>
    set((s) => {
      const newLog: AgentLog = {
        ...log,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      const logs = [...s.agentLogs, newLog];
      return { agentLogs: logs.slice(-100) };
    }),
  clearLogs: () => set({ agentLogs: [] }),

  // Sphere / Graph
  spherePulse:    false,
  setSpherePulse: (v) => set({ spherePulse: v }),

  // Active Ops
  activeOps: new Set<string>(),
  startOp:   (id) =>
    set((s) => {
      const ops = new Set(s.activeOps);
      ops.add(id);
      return { activeOps: ops, spherePulse: ops.size > 0 };
    }),
  endOp: (id) =>
    set((s) => {
      const ops = new Set(s.activeOps);
      ops.delete(id);
      return { activeOps: ops, spherePulse: ops.size > 0 };
    }),

  // Vault
  vaultFiles:    [],
  setVaultFiles: (f) => set({ vaultFiles: f }),

  // Modals
  activeModal:    null,
  setActiveModal: (m) => set({ activeModal: m }),

  // Provider preference
  preferredProvider: 'auto',
  setPreferredProvider: (p) => set({ preferredProvider: p }),

  // Sync timestamps
  lastCanvasSync:      null,
  lastCalendarSync:    null,
  setLastCanvasSync:   (t) => set({ lastCanvasSync: t }),
  setLastCalendarSync: (t) => set({ lastCalendarSync: t }),
}));
