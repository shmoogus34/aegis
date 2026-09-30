'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck, Clock, CheckCircle2, Circle, Plus,
  Calendar, Check, AlertCircle, ChevronRight
} from 'lucide-react';
import type { StudyToolItem, StudyPlanContent, DailyStudySession, StudySessionItem } from '@/lib/studyTools/types';

interface Props {
  tool: StudyToolItem;
  onUpdate: (updatedTool: StudyToolItem) => void;
}

export default function StudyPlanViewer({ tool, onUpdate }: Props) {
  const content = tool.data as StudyPlanContent;
  const [sessions, setSessions] = useState<DailyStudySession[]>(content.sessions || []);
  const [newTaskInput, setNewTaskInput] = useState<{ dayIndex: number; text: string } | null>(null);

  // Toggle item completion
  const handleToggleTask = async (sIdx: number, itemId: string) => {
    const updatedSessions = sessions.map((s, idx) => {
      if (idx !== sIdx) return s;
      return {
        ...s,
        items: s.items.map((it) => (it.id === itemId ? { ...it, completed: !it.completed } : it)),
      };
    });

    setSessions(updatedSessions);

    // Calculate overall completion progress
    let totalTasks = 0;
    let completedTasks = 0;
    updatedSessions.forEach((s) => {
      s.items.forEach((it) => {
        totalTasks += 1;
        if (it.completed) completedTasks += 1;
      });
    });

    const progress = Math.round((completedTasks / (totalTasks || 1)) * 100);

    const updatedTool: StudyToolItem = {
      ...tool,
      progress,
      data: {
        ...content,
        sessions: updatedSessions,
      },
    };

    onUpdate(updatedTool);

    try {
      await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'progress',
          id: tool.id,
          progress,
          data: updatedTool.data,
        }),
      });
    } catch (err) {
      console.error('Failed to sync study plan progress:', err);
    }
  };

  // Add custom task to a specific day
  const handleAddTask = async (dayIndex: number) => {
    if (!newTaskInput || !newTaskInput.text.trim()) return;

    const newItem: StudySessionItem = {
      id: `task-${Date.now()}`,
      text: newTaskInput.text.trim(),
      completed: false,
    };

    const updatedSessions = sessions.map((s, idx) => {
      if (idx !== dayIndex) return s;
      return {
        ...s,
        items: [...s.items, newItem],
      };
    });

    setSessions(updatedSessions);
    setNewTaskInput(null);

    const updatedTool: StudyToolItem = {
      ...tool,
      data: {
        ...content,
        sessions: updatedSessions,
      },
    };

    onUpdate(updatedTool);

    try {
      await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          tool: updatedTool,
        }),
      });
    } catch (err) {
      console.error('Failed to save added task:', err);
    }
  };

  // Summary counts
  let totalTasks = 0;
  let completedTasks = 0;
  let totalMinutes = 0;
  sessions.forEach((s) => {
    totalMinutes += s.estimatedMinutes || 0;
    s.items.forEach((it) => {
      totalTasks += 1;
      if (it.completed) completedTasks += 1;
    });
  });

  return (
    <div className="flex flex-col h-full select-none text-white font-sans overflow-hidden">
      {/* ── Top Bar: Plan Overview ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b border-white/[0.08] bg-zinc-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 flex items-center justify-center text-[#9B8DF5]">
            <CalendarCheck size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight font-sans">
              {content.title || tool.title}
            </h2>
            <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {sessions.length} Daily Sessions &bull; ~{totalMinutes} Study Minutes Total
            </div>
          </div>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-zinc-400">
            Progress: <span className="text-emerald-400 font-bold">{completedTasks}</span> / {totalTasks} Tasks
          </div>
          <div className="w-32 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C6BF0] to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.round((completedTasks / (totalTasks || 1)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-white">
            {Math.round((completedTasks / (totalTasks || 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* ── Timeline of Daily Study Sessions ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
        {sessions.map((day, sIdx) => {
          const allDayTasksDone = day.items.length > 0 && day.items.every((it) => it.completed);

          return (
            <motion.div
              key={sIdx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.05 }}
              className={`p-6 rounded-3xl border transition-all ${
                allDayTasksDone
                  ? 'bg-zinc-950/60 border-emerald-500/30'
                  : 'bg-zinc-950/80 border-white/[0.1] shadow-2xl'
              } backdrop-blur-xl`}
            >
              {/* Day Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs font-bold text-[#9B8DF5]">
                    {day.date}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">{day.focus}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-zinc-500" />
                    <span>~{day.estimatedMinutes} mins</span>
                  </span>
                  {allDayTasksDone && (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check size={13} /> Day Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Task Items Checklist */}
              <div className="space-y-2.5">
                {day.items.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(sIdx, task.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      task.completed
                        ? 'bg-white/[0.02] border-white/[0.04] text-zinc-500 line-through'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-200 hover:bg-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <button className="mt-0.5 shrink-0">
                      {task.completed ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <Circle size={18} className="text-zinc-600 hover:text-zinc-400" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-sans">{task.text}</span>

                      {task.courseCode && (
                        <span className="px-2 py-0.5 rounded-md bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 text-[10px] font-mono text-[#B4A5FF]">
                          {task.courseCode}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add new task input row */}
                {newTaskInput?.dayIndex === sIdx ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newTaskInput.text}
                      onChange={(e) => setNewTaskInput({ dayIndex: sIdx, text: e.target.value })}
                      placeholder="Enter task description..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#7C6BF0]"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(sIdx)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddTask(sIdx)}
                      className="px-3 py-2 rounded-xl bg-[#7C6BF0] text-white text-xs font-bold"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setNewTaskInput(null)}
                      className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewTaskInput({ dayIndex: sIdx, text: '' })}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-mono mt-2 px-2 py-1"
                  >
                    <Plus size={13} />
                    <span>Add Task to this day</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
