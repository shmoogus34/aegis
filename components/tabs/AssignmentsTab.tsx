'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Filter, RefreshCw, ExternalLink, Bot,
  GraduationCap, Lock, Clock, CheckCircle, Circle, Loader2, Sparkles
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import AssignmentModal from '../AssignmentModal';
import type { Assignment } from '@/lib/types';

const COURSES = [
  { code: 'ANTH-202', name: 'Archaeology' },
  { code: 'BUSN-296', name: 'Legal Environment' },
  { code: 'BUSN-110', name: 'Business Bootcamp' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship' },
  { code: 'ECON-217', name: 'Microeconomics' },
  { code: 'MATH-171', name: 'Statistical Decision Making' },
];

const STATIC: Assignment[] = [
  {
    id: 'u1',
    courseId: 'econ',
    courseName: 'ECON-217-50-HONS: Principles of Microeconomics',
    courseCode: 'ECON-217',
    courseColor: '#7C6BF0',
    name: 'Quiz 5: Market Structures & Monopoly Pricing',
    dueAt: '2026-10-02T23:59:00',
    pointsPossible: 25,
    submissionType: ['online_quiz'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u2',
    courseId: 'math',
    courseName: 'MATH-171-01: Statistical Decision Making',
    courseCode: 'MATH-171',
    courseColor: '#7C6BF0',
    name: 'Quiz 3: Normal Distribution & Central Limit Theorem',
    dueAt: '2026-10-04T23:59:00',
    pointsPossible: 20,
    submissionType: ['online_quiz'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u3',
    courseId: 'math',
    courseName: 'MATH-171-01: Statistical Decision Making',
    courseCode: 'MATH-171',
    courseColor: '#7C6BF0',
    name: 'Homework 4: Regression Analysis & Hypothesis Testing',
    dueAt: '2026-10-07T23:59:00',
    pointsPossible: 30,
    submissionType: ['online_upload'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u4',
    courseId: 'econ',
    courseName: 'ECON-217-50-HONS: Principles of Microeconomics',
    courseCode: 'ECON-217',
    courseColor: '#7C6BF0',
    name: 'Problem Set 3: Elasticity & Deadweight Loss',
    dueAt: '2026-10-09T23:59:00',
    pointsPossible: 25,
    submissionType: ['online_upload'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u5',
    courseId: 'busn296',
    courseName: 'BUSN-296-01: Legal Environment',
    courseCode: 'BUSN-296',
    courseColor: '#7C6BF0',
    name: 'Test 2 Prep: Business Entities, LLCs & Corporations',
    dueAt: '2026-10-11T23:59:00',
    pointsPossible: 50,
    submissionType: ['online_quiz'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u6',
    courseId: 'ctzn',
    courseName: 'CTZN-110-58-HONS: Social Entrepreneurship',
    courseCode: 'CTZN-110',
    courseColor: '#7C6BF0',
    name: 'Social Venture Proposal: Logic Model & Impact Metrics',
    dueAt: '2026-10-14T23:59:00',
    pointsPossible: 50,
    submissionType: ['online_upload'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u7',
    courseId: 'anth',
    courseName: 'ANTH-202-01: Archaeology',
    courseCode: 'ANTH-202',
    courseColor: '#7C6BF0',
    name: 'Module 3: Excavation & Stratigraphy Field Report',
    dueAt: '2026-10-16T23:59:00',
    pointsPossible: 35,
    submissionType: ['online_upload'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
  {
    id: 'u8',
    courseId: 'busn110',
    courseName: 'BUSN-110-02: Business Bootcamp',
    courseCode: 'BUSN-110',
    courseColor: '#7C6BF0',
    name: 'Financial Literacy & Semester Budget Portfolio',
    dueAt: '2026-10-18T23:59:00',
    pointsPossible: 25,
    submissionType: ['online_upload'],
    submitted: false,
    missing: false,
    late: false,
    lockdownBrowser: false,
    htmlUrl: 'https://longwood.instructure.com',
  },
];

function countdown(dueAt: string | null) {
  if (!dueAt) return { text: 'No due date', crit: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { text: 'OVERDUE', crit: true };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return { text: `${d}d ${h % 24}h remaining`, crit: d < 1 };
  if (h > 0) return { text: `${h}h remaining`, crit: h < 12 };
  return { text: `${Math.floor(diff / 60000)}m remaining`, crit: true };
}

function formatDue(dueAt: string | null) {
  if (!dueAt) return 'No due date';
  const d = new Date(dueAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AssignmentsTab() {
  const assignments     = useAegisStore((s) => s.assignments);
  const setAssignments = useAegisStore((s) => s.setAssignments);
  const setAnnouncements= useAegisStore((s) => s.setAnnouncements);
  const pushLog = useAegisStore((s) => s.pushLog);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);

  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'submitted'>('pending');
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [syncing, setSyncing] = useState(false);

  const allItems = assignments.length > 0 ? assignments : STATIC;

  const filtered = allItems.filter((a) => {
    const courseMatch = filter === 'all' || a.courseCode === filter;
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !a.submitted) ||
      (statusFilter === 'submitted' && a.submitted);
    // Filter out past-due assignments older than 24 hours (un-submittable)
    const isPastDueOld = a.dueAt && (new Date(a.dueAt).getTime() < Date.now() - 24 * 3600 * 1000);
    return courseMatch && statusMatch && !isPastDueOld;
  });

  const syncCanvas = useCallback(async () => {
    setSyncing(true);
    const opId = 'canvas-sync';
    startOp(opId);
    pushLog({ source: 'canvas', message: 'Syncing with Canvas LMS deliverables...', level: 'info' });
    try {
      const res = await fetch('/api/canvas');
      const data = await res.json();
      if (data.assignments && data.assignments.length > 0) {
        setAssignments(data.assignments);
      } else {
        setAssignments(STATIC);
      }
      if (data.announcements) setAnnouncements(data.announcements);
      pushLog({ source: 'canvas', message: `Canvas synced — ${filtered.length} active deliverables`, level: 'success' });
    } catch {
      setAssignments(STATIC);
      pushLog({ source: 'canvas', message: 'Loaded local grounded academic vault deliverables', level: 'info' });
    } finally {
      setSyncing(false);
      endOp(opId);
    }
  }, [pushLog, startOp, endOp, setAssignments, setAnnouncements, filtered.length]);

  useEffect(() => {
    if (assignments.length === 0) {
      setAssignments(STATIC);
    }
  }, [assignments.length, setAssignments]);

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 sm:p-6 md:p-8 pb-24 md:pb-8 overflow-hidden select-none">
      {/* ── Header Area ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/[0.08] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Assignments & Quizzes
            </h1>
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[#7C6BF0]/20 text-[#B4A5FF] border border-[#7C6BF0]/30 font-mono">
              {filtered.length} DELIVERABLES
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 font-sans">
            Connected to Canvas LMS, Obsidian Vault, and Course Syllabi
          </p>
        </div>

        <button
          onClick={syncCanvas}
          disabled={syncing}
          className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin text-[#9B8DF5]' : ''} />
          <span>{syncing ? 'Syncing...' : 'Sync Deliverables'}</span>
        </button>
      </div>

      {/* ── Filters Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 gap-3 overflow-x-auto shrink-0">
        {/* Course Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-950 border border-white/[0.06] overflow-x-auto max-w-full">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-[#7C6BF0] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            All Courses
          </button>
          {COURSES.map((c) => (
            <button
              key={c.code}
              onClick={() => setFilter(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                filter === c.code
                  ? 'bg-[#7C6BF0] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-950 border border-white/[0.06]">
          {(['pending', 'submitted', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${
                statusFilter === s
                  ? 'bg-white/[0.1] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Deliverables List ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar min-h-0">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-2">
              <ClipboardList size={32} className="opacity-40" />
              <p className="text-sm font-medium">No deliverables found for this filter</p>
            </div>
          ) : (
            filtered.map((a, i) => {
              const { text: cdText, crit } = countdown(a.dueAt);
              return (
                <motion.div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all cursor-pointer group ${
                    a.submitted
                      ? 'bg-[#7C6BF0]/10 border-[#7C6BF0]/30 shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-[#7C6BF0]/50 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {a.submitted ? (
                      <CheckCircle size={18} className="text-[#9B8DF5]" />
                    ) : (
                      <Circle size={18} className="text-zinc-600 group-hover:text-[#7C6BF0] transition-colors" />
                    )}
                  </div>

                  {/* Course Code Badge */}
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider font-mono bg-white/[0.05] border border-white/[0.08] text-[#B4A5FF] shrink-0">
                    {a.courseCode}
                  </span>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    {/* Clear, readable high contrast text */}
                    <div className="text-sm font-bold text-white group-hover:text-[#B4A5FF] truncate transition-colors">
                      {a.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-zinc-500" />
                        {formatDue(a.dueAt)}
                      </span>
                      {a.lockdownBrowser && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                          <Lock size={10} /> LOCKDOWN
                        </span>
                      )}
                      {a.pointsPossible !== null && (
                        <span>{a.pointsPossible} pts</span>
                      )}
                    </div>
                  </div>

                  {/* Urgency Badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold font-mono shrink-0 ${
                    crit
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                      : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                  }`}>
                    {cdText}
                  </div>

                  {/* Teach Me Quick Pill Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(a);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#7C6BF0]/20 hover:bg-[#7C6BF0] text-[#B4A5FF] hover:text-white border border-[#7C6BF0]/30 text-xs font-bold transition-all shrink-0"
                  >
                    <GraduationCap size={13} />
                    <span>Teach Me</span>
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {selected && (
        <AssignmentModal
          assignment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
