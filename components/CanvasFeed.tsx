'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, BookOpen, Layers, CheckSquare, Square,
  RefreshCw, Sparkles, ExternalLink, Calendar, ArrowUpRight
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import AssignmentModal from './AssignmentModal';
import CourseKnowledgeModal from './CourseKnowledgeModal';
import type { Assignment, Directive } from '@/lib/types';

const COURSES = [
  { code: 'ANTH-202', name: 'Archaeology',                  color: '#9B8DF5', id: 'anth' },
  { code: 'BUSN-296', name: 'Legal Environment',            color: '#60A5FA', id: 'busn296' },
  { code: 'BUSN-110', name: 'Business Bootcamp',            color: '#4ADE80', id: 'busn110' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship',      color: '#C084FC', id: 'ctzn' },
  { code: 'ECON-217', name: 'Microeconomics',               color: '#F87171', id: 'econ' },
  { code: 'MATH-171', name: 'Statistical Decision Making',  color: '#4DD9E0', id: 'math' },
];

function countdown(dueAt: string | null): { text: string; crit: boolean } {
  if (!dueAt) return { text: 'No due date', crit: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { text: 'OVERDUE', crit: true };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0)  return { text: `${d}d ${h % 24}h remaining`, crit: d < 1 };
  if (h > 0)  return { text: `${h}h ${Math.floor((diff % 3600000) / 60000)}m remaining`, crit: h < 12 };
  return { text: `${Math.floor(diff / 60000)}m remaining`, crit: true };
}

export default function CanvasFeed() {
  const assignments       = useAegisStore((s) => s.assignments);
  const directives        = useAegisStore((s) => s.directives);
  const setAssignments    = useAegisStore((s) => s.setAssignments);
  const setAnnouncements  = useAegisStore((s) => s.setAnnouncements);
  const setQuizzes        = useAegisStore((s) => s.setQuizzes);
  const pushLog           = useAegisStore((s) => s.pushLog);
  const startOp           = useAegisStore((s) => s.startOp);
  const endOp             = useAegisStore((s) => s.endOp);
  const setLastCanvasSync = useAegisStore((s) => s.setLastCanvasSync);
  const setActiveTab      = useAegisStore((s) => s.setActiveTab);
  const toggleDirective   = useAegisStore((s) => s.toggleDirective);

  // Sub-tab state for the left panel
  const [leftTab, setLeftTab] = useState<'all' | 'urgent' | 'courses' | 'directives'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedCourse, setSelectedCourse]         = useState<string | null>(null);

  const STATIC_URGENCY: Assignment[] = [
    {
      id: 'u1', courseId: 'econ', courseName: 'ECON-217-50-HONS: Principles of Microeconomics',
      courseCode: 'ECON-217', courseColor: '#7C6BF0',
      name: 'Quiz 5: Market Structures & Monopoly Pricing', dueAt: '2026-10-02T23:59:00',
      pointsPossible: 25, submissionType: ['online_quiz'], submitted: false,
      missing: false, late: false, lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    },
    {
      id: 'u2', courseId: 'math', courseName: 'MATH-171-01: Statistical Decision Making',
      courseCode: 'MATH-171', courseColor: '#7C6BF0',
      name: 'Quiz 3: Normal Distribution & Central Limit Theorem', dueAt: '2026-10-04T23:59:00',
      pointsPossible: 20, submissionType: ['online_quiz'], submitted: false,
      missing: false, late: false, lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    },
    {
      id: 'u3', courseId: 'math', courseName: 'MATH-171-01: Statistical Decision Making',
      courseCode: 'MATH-171', courseColor: '#7C6BF0',
      name: 'Homework 4: Regression Analysis & Hypothesis Testing', dueAt: '2026-10-07T23:59:00',
      pointsPossible: 30, submissionType: ['online_upload'], submitted: false,
      missing: false, late: false, lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    },
    {
      id: 'u4', courseId: 'econ', courseName: 'ECON-217-50-HONS: Principles of Microeconomics',
      courseCode: 'ECON-217', courseColor: '#7C6BF0',
      name: 'Problem Set 3: Elasticity & Deadweight Loss', dueAt: '2026-10-09T23:59:00',
      pointsPossible: 25, submissionType: ['online_upload'], submitted: false,
      missing: false, late: false, lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    },
  ];

  const urgencyList = assignments.length > 0
    ? assignments.filter((a) => !a.submitted && a.dueAt && new Date(a.dueAt).getTime() >= Date.now() - 24 * 3600000 && (new Date(a.dueAt).getTime() - Date.now()) < 10 * 24 * 3600000)
    : STATIC_URGENCY;

  const syncCanvas = useCallback(async () => {
    startOp('canvas-sync');
    pushLog({ source: 'canvas', message: 'Canvas REST → Syncing course deliverables...', level: 'info' });
    try {
      const res  = await fetch('/api/canvas');
      const data = await res.json();
      if (data.assignments)  setAssignments(data.assignments);
      if (data.announcements) setAnnouncements(data.announcements);
      if (data.quizzes)      setQuizzes(data.quizzes);
      setLastCanvasSync(new Date().toISOString());
      pushLog({
        source:  'canvas',
        message: `Canvas synchronized: ${data.assignments?.length ?? 0} deliverables live`,
        level:   'success',
      });
    } catch (err) {
      pushLog({ source: 'canvas', message: `Canvas sync error: ${err}`, level: 'error' });
    } finally {
      endOp('canvas-sync');
    }
  }, [startOp, endOp, pushLog, setAssignments, setAnnouncements, setQuizzes, setLastCanvasSync]);

  useEffect(() => { syncCanvas(); }, []);

  const openDirectiveModal = (d: Directive) => {
    const match = urgencyList.find(u => u.courseCode === d.courseCode) || {
      id: d.id,
      courseId: d.courseCode.toLowerCase(),
      courseName: d.courseCode,
      courseCode: d.courseCode,
      courseColor: COURSES.find(c => c.code === d.courseCode)?.color || '#7C6BF0',
      name: d.text,
      dueAt: d.dueAt,
      pointsPossible: 20,
      submissionType: ['online_assignment'],
      submitted: d.completed,
      missing: false,
      late: false,
      lockdownBrowser: d.tag === 'LOCKDOWN PREP',
      htmlUrl: 'https://longwood.instructure.com',
    };
    setSelectedAssignment(match);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">
      {/* ── Top Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[#9B8DF5]" />
          <span className="text-xs font-bold tracking-widest text-white uppercase">
            CANVAS PIPELINE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('assignments')}
            className="text-[10px] text-stone-300 hover:text-[#7C6BF0] font-bold transition-colors px-2 py-0.5 rounded-sm border border-stone-800 bg-black/40"
          >
            VIEW ALL ↗
          </button>
          <button
            onClick={syncCanvas}
            className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold text-[#7C6BF0] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-all"
          >
            <RefreshCw size={10} />
            SYNC
          </button>
        </div>
      </div>

      {/* ── Left Sub-Navigation Tabs ─────────────────────── */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-sm bg-black/60 border border-stone-800/80 shrink-0">
        {[
          { id: 'all',        label: 'ALL' },
          { id: 'urgent',     label: `URGENT (${urgencyList.length})` },
          { id: 'courses',    label: 'COURSES' },
          { id: 'directives', label: 'DIRECTIVES' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLeftTab(tab.id as any)}
            className="py-1 px-1 rounded-sm text-[9px] font-bold tracking-wider text-center uppercase transition-all"
            style={{
              background: leftTab === tab.id ? '#7C6BF025' : 'transparent',
              color: leftTab === tab.id ? '#B4A5FF' : '#8A8A9A',
              border: leftTab === tab.id ? '1px solid #7C6BF050' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body Area with Full Contrast ──────── */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">

        {/* 1. URGENT DELIVERABLES */}
        {(leftTab === 'all' || leftTab === 'urgent') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">
              <AlertTriangle size={13} />
              <span>URGENCY ALERTS (CLICK TO SOLVE)</span>
            </div>

            {urgencyList.map((a) => {
              const { text: cdText, crit } = countdown(a.dueAt);
              return (
                <motion.div
                  key={a.id}
                  onClick={() => setSelectedAssignment(a)}
                  className="p-3 rounded-sm border cursor-pointer transition-all relative overflow-hidden group"
                  style={{
                    background: '#0D0D14',
                    borderColor: crit ? '#F8717170' : '#7C6BF040',
                  }}
                  whileHover={{ scale: 1.01, borderColor: '#B4A5FF' }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: a.courseColor }} />
                  <div className="ml-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: `${a.courseColor}20`,
                            color: a.courseColor,
                            border: `1px solid ${a.courseColor}40`,
                          }}
                        >
                          {a.courseCode}
                        </span>
                        {a.lockdownBrowser && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm tag-lockdown">
                            LOCKDOWN
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${crit ? 'crit-blink text-red-400' : 'text-[#9B8DF5]'}`}>
                        {cdText}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white mt-1.5 group-hover:text-[#9B8DF5] transition-colors">
                      {a.name}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-800/60 text-[10px]">
                      <span className="text-stone-400">
                        {a.pointsPossible !== null ? `${a.pointsPossible} pts` : 'Canvas Deliverable'}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#9B8DF5] group-hover:translate-x-0.5 transition-transform">
                        <Sparkles size={11} /> SOLVE WITH AI ▶
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 2. ENROLLED COURSES & KNOWLEDGE BASES */}
        {(leftTab === 'all' || leftTab === 'courses') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#9B8DF5] uppercase tracking-wider mb-0.5">
              <span>FALL 2026 COURSES (6)</span>
              <span className="text-[9px] text-stone-400 font-normal">Click to view Knowledge Base</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {COURSES.map((course) => {
                const count = assignments.filter(a => a.courseCode === course.code).length;
                return (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-2.5 rounded-sm border border-stone-800 bg-black/40 hover:border-[#7C6BF0] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: course.color }} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {course.code}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {course.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedCourse(course.code)}
                        className="px-2 py-1 rounded-sm text-[10px] font-bold text-[#9B8DF5] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-all"
                      >
                        KNOWLEDGE BASE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TODAY'S DIRECTIVES */}
        {(leftTab === 'all' || leftTab === 'directives') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#9B8DF5] uppercase tracking-wider mb-0.5">
              <div className="flex items-center gap-1.5">
                <Layers size={13} />
                <span>ACTIVE DIRECTIVES</span>
              </div>
              <span className="text-[10px] text-stone-400">
                {directives.filter(d => !d.completed).length} remaining
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {directives.map((directive) => {
                const { text: cdText, crit } = countdown(directive.dueAt);
                return (
                  <div
                    key={directive.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-sm border transition-all ${
                      directive.completed
                        ? 'bg-black/20 border-stone-900 opacity-50'
                        : 'bg-stone-950/60 border-stone-800/80 hover:border-[#7C6BF0]'
                    }`}
                  >
                    <button
                      onClick={() => toggleDirective(directive.id)}
                      className="mt-0.5 text-[#7C6BF0] hover:text-[#9B8DF5] shrink-0"
                    >
                      {directive.completed ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openDirectiveModal(directive)}
                    >
                      <div
                        className={`text-xs font-medium leading-snug ${
                          directive.completed ? 'line-through text-stone-500' : 'text-stone-200'
                        }`}
                      >
                        {directive.text}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[9px]">
                        <span className="px-1.5 py-0.5 rounded-sm bg-stone-900 border border-stone-800 text-stone-300 font-bold">
                          {directive.courseCode}
                        </span>
                        <span className="text-[#7C6BF0] font-bold">
                          {directive.tag}
                        </span>
                        {!directive.completed && (
                          <span className={`ml-auto font-bold ${crit ? 'crit-blink text-red-400' : 'text-stone-400'}`}>
                            {cdText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Viewers */}
      {selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {selectedCourse && (
        <CourseKnowledgeModal
          courseCode={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}
