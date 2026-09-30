import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckSquare, Square, Clock, BookOpen,
  ArrowUpRight, AlertCircle, Sparkles, Layers, Play, GraduationCap
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import AssignmentModal from './AssignmentModal';
import StudyToolModal from './study/StudyToolModal';
import type { Assignment } from '@/lib/types';
import type { StudyToolItem } from '@/lib/studyTools/types';

interface DirectiveItem {
  id: string;
  courseCode: string;
  name: string;
  dueAt: string;
  tag: string;
  points: number;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium';
}

const DEFAULT_ITEMS: DirectiveItem[] = [
  {
    id: 'd1',
    courseCode: 'ECON-217',
    name: 'Quiz 5: Market Structures & Monopoly Pricing',
    dueAt: '2026-10-02T23:59:00',
    tag: 'ONLINE QUIZ',
    points: 25,
    completed: false,
    priority: 'critical',
  },
  {
    id: 'd2',
    courseCode: 'MATH-171',
    name: 'Quiz 3: Normal Distribution & Central Limit Theorem',
    dueAt: '2026-10-04T23:59:00',
    tag: 'STATS QUIZ',
    points: 20,
    completed: false,
    priority: 'high',
  },
  {
    id: 'd3',
    courseCode: 'MATH-171',
    name: 'Homework 4: Regression Analysis & Hypothesis Testing',
    dueAt: '2026-10-07T23:59:00',
    tag: 'PROBLEM SET',
    points: 30,
    completed: false,
    priority: 'high',
  },
  {
    id: 'd4',
    courseCode: 'ECON-217',
    name: 'Problem Set 3: Elasticity & Deadweight Loss',
    dueAt: '2026-10-09T23:59:00',
    tag: 'PROBLEM SET',
    points: 25,
    completed: false,
    priority: 'medium',
  },
  {
    id: 'd5',
    courseCode: 'BUSN-296',
    name: 'Test 2 Prep: Business Entities, LLCs & Corps',
    dueAt: '2026-10-11T23:59:00',
    tag: 'EXAM PREP',
    points: 50,
    completed: false,
    priority: 'high',
  },
  {
    id: 'd6',
    courseCode: 'CTZN-110',
    name: 'Social Venture Proposal: Logic Model Draft',
    dueAt: '2026-10-14T23:59:00',
    tag: 'MILESTONE',
    points: 50,
    completed: false,
    priority: 'medium',
  },
];

const COURSES = [
  { code: 'ANTH-202', name: 'Archaeology', creds: '3 cr' },
  { code: 'BUSN-296', name: 'Legal Environment', creds: '3 cr' },
  { code: 'BUSN-110', name: 'Business Bootcamp', creds: '1 cr' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship', creds: '3 cr' },
  { code: 'ECON-217', name: 'Microeconomics', creds: '3 cr' },
  { code: 'MATH-171', name: 'Statistical Decision Making', creds: '3 cr' },
];

export default function LeftFloatingWing() {
  const [tab, setTab] = useState<'deliverables' | 'courses'>('deliverables');
  const [items, setItems] = useState<DirectiveItem[]>(DEFAULT_ITEMS);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [recentTool, setRecentTool] = useState<StudyToolItem | null>(null);
  const [activeStudyToolModal, setActiveStudyToolModal] = useState<StudyToolItem | null>(null);

  useEffect(() => {
    fetch('/api/study-tools', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.tools && data.tools.length > 0) {
          setRecentTool(data.tools[0]);
        }
      })
      .catch((err) => console.warn('Failed to load recent study tool:', err));
  }, []);

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const openModal = (item: DirectiveItem) => {
    setSelectedAssignment({
      id: item.id,
      courseId: item.courseCode.toLowerCase(),
      courseName: `${item.courseCode} Course Deliverable`,
      courseCode: item.courseCode,
      courseColor: '#7C6BF0',
      name: item.name,
      dueAt: item.dueAt,
      pointsPossible: item.points,
      submissionType: ['online'],
      submitted: item.completed,
      missing: false,
      late: false,
      lockdownBrowser: item.name.toLowerCase().includes('lockdown'),
      htmlUrl: 'https://longwood.instructure.com',
    });
  };

  const pendingCount = items.filter((i) => !i.completed).length;

  return (
    <>
      <div className="w-full lg:w-80 h-full flex flex-col rounded-3xl liquid-glass-card p-4 overflow-hidden select-none">
        {/* Subtle, Low-Contrast Section Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-4 shrink-0">
          <button
            onClick={() => setTab('deliverables')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              tab === 'deliverables'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Deliverables ({pendingCount})
          </button>
          <button
            onClick={() => setTab('courses')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
              tab === 'courses'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Courses (6)
          </button>
        </div>

        {tab === 'deliverables' ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Metric Card: Next Urgent Deadline (Dynamic) */}
            {(() => {
              const urgentItem = items.find((i) => !i.completed) || items[0];
              if (!urgentItem) return null;
              const dueFormatted = new Date(urgentItem.dueAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              return (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                      Immediate Priority
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold border border-rose-500/25">
                      {urgentItem.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {urgentItem.name}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-zinc-400 font-mono">
                    <span>{urgentItem.courseCode} ({urgentItem.points} pts)</span>
                    <span className="text-rose-300 font-medium">Due {dueFormatted}, 11:59 PM</span>
                  </div>
                  {/* Delicate sparkline/progress indicator */}
                  <div className="w-full h-1 bg-white/[0.05] rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#7C6BF0] to-[#9B8DF5] w-3/4 rounded-full" />
                  </div>
                </div>
              );
            })()}

            {/* Continue Where You Left Off Card */}
            {recentTool && (
              <div
                onClick={() => setActiveStudyToolModal(recentTool)}
                className="p-3 rounded-xl bg-[#7C6BF0]/[0.08] border border-[#7C6BF0]/30 hover:border-[#7C6BF0]/60 transition-all cursor-pointer group shrink-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#B4A5FF] flex items-center gap-1 font-mono">
                    <GraduationCap size={11} /> Continue Studying
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {recentTool.progress}% done
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate group-hover:text-[#B4A5FF] transition-colors">
                  {recentTool.title}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-zinc-400 font-mono">
                  <span>{recentTool.courseCode}</span>
                  <span className="flex items-center gap-1 text-[#9B8DF5] font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>Resume</span>
                    <Play size={9} className="fill-current" />
                  </span>
                </div>
                <div className="w-full h-1 bg-white/[0.05] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C6BF0] to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${recentTool.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Checklist Module with Soft-Cornered Containers */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
              {items.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => openModal(item)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-[#7C6BF0]/20 border-[#7C6BF0]/40 shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-[#7C6BF0]/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    <button
                      onClick={(e) => toggleItem(item.id, e)}
                      className="mt-0.5 shrink-0 transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare size={16} className="text-[#B4A5FF]" />
                      ) : (
                        <Square size={16} className="text-zinc-600 hover:text-zinc-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Text remains 100% READABLE and HIGH CONTRAST even when checked off */}
                      <div
                        className={`text-xs font-semibold leading-snug transition-colors ${
                          item.completed
                            ? 'text-zinc-100 line-through'
                            : 'text-white'
                        }`}
                      >
                        {item.name}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-zinc-200 border border-white/[0.1]">
                          {item.courseCode}
                        </span>
                        <span className="text-[#B4A5FF] font-semibold">
                          {item.tag}
                        </span>
                        <span className="ml-auto text-zinc-300 font-medium">
                          {item.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
            {COURSES.map((course) => (
              <div
                key={course.code}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono">{course.code}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{course.creds}</span>
                </div>
                <div className="text-xs text-zinc-400 truncate">{course.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {activeStudyToolModal && (
        <StudyToolModal
          tool={activeStudyToolModal}
          isOpen={Boolean(activeStudyToolModal)}
          onClose={() => setActiveStudyToolModal(null)}
          onUpdateTool={(up) => {
            setActiveStudyToolModal(up);
            setRecentTool(up);
          }}
        />
      )}
    </>
  );
}
