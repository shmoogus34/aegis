'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Search, Plus, Filter, Play, Copy,
  Trash2, RotateCcw, Clock, BookOpen, Layers, HelpCircle,
  CalendarCheck, Sparkles, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import type { StudyToolItem, StudyToolType } from '@/lib/studyTools/types';
import StudyToolModal from '@/components/study/StudyToolModal';
import ToolCreationModal from '@/components/study/ToolCreationModal';

export default function StudyLibraryTab() {
  const [tools, setTools] = useState<StudyToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StudyToolType>('all');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');

  // Active Tool Modal
  const [activeTool, setActiveTool] = useState<StudyToolItem | null>(null);

  // Creation Modal
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [creationInitialType, setCreationInitialType] = useState<StudyToolType>('flashcards');

  // Undo Toast state
  const [deletedToolUndo, setDeletedToolUndo] = useState<StudyToolItem | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Load all study tools from server
  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/study-tools', { cache: 'no-store' });
      const data = await res.json();
      if (data.tools) {
        setTools(data.tools);
      }
    } catch (err) {
      console.error('Failed to load study tools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // Check URL on load for ?tool=...&id=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toolId = params.get('id');
      if (toolId && tools.length > 0) {
        const found = tools.find((t) => t.id === toolId);
        if (found) {
          setActiveTool(found);
        }
      }
    }
  }, [tools]);

  // Tool actions
  const handleOpenTool = (tool: StudyToolItem) => {
    setActiveTool(tool);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id }),
      });
      const data = await res.json();
      if (data.tool) {
        setTools((prev) => [data.tool, ...prev]);
      }
    } catch (err) {
      console.error('Failed to duplicate tool:', err);
    }
  };

  const handleDelete = async (tool: StudyToolItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: tool.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTools((prev) => prev.filter((t) => t.id !== tool.id));
        setDeletedToolUndo(tool);

        if (undoTimer) clearTimeout(undoTimer);
        const timer = setTimeout(() => {
          setDeletedToolUndo(null);
        }, 6000);
        setUndoTimer(timer);
      }
    } catch (err) {
      console.error('Failed to delete tool:', err);
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedToolUndo) return;
    try {
      const res = await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', tool: deletedToolUndo }),
      });
      const data = await res.json();
      if (data.tool) {
        setTools((prev) => [data.tool, ...prev]);
        setDeletedToolUndo(null);
      }
    } catch (err) {
      console.error('Failed to restore tool:', err);
    }
  };

  // Filter tools
  const filteredTools = tools.filter((t) => {
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCourse = courseFilter === 'ALL' || t.courseCode === courseFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCourse && matchesSearch;
  });

  const getToolIcon = (type: StudyToolType) => {
    switch (type) {
      case 'flashcards':
        return <Layers size={16} className="text-[#9B8DF5]" />;
      case 'quiz':
        return <HelpCircle size={16} className="text-blue-400" />;
      case 'guide':
        return <BookOpen size={16} className="text-emerald-400" />;
      case 'plan':
        return <CalendarCheck size={16} className="text-amber-400" />;
    }
  };

  const getToolTypeLabel = (type: StudyToolType) => {
    switch (type) {
      case 'flashcards':
        return 'Flashcards';
      case 'quiz':
        return 'Quiz';
      case 'guide':
        return 'Study Guide';
      case 'plan':
        return 'Study Plan';
    }
  };

  const getToolItemCount = (tool: StudyToolItem) => {
    if (tool.type === 'flashcards') {
      const count = (tool.data as any)?.cards?.length || 0;
      return `${count} cards`;
    }
    if (tool.type === 'quiz') {
      const count = (tool.data as any)?.questions?.length || 0;
      return `${count} questions`;
    }
    if (tool.type === 'guide') {
      const count = (tool.data as any)?.sections?.length || 0;
      return `${count} sections`;
    }
    if (tool.type === 'plan') {
      const count = (tool.data as any)?.sessions?.length || 0;
      return `${count} sessions`;
    }
    return '';
  };

  const coursesList = ['ALL', 'ECON-217', 'MATH-171', 'BUSN-296', 'CTZN-110', 'ANTH-202', 'BUSN-110'];

  return (
    <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden select-none">
      {/* ── Sub-header: Navigation, Filters & Actions ── */}
      <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 flex items-center justify-center text-[#9B8DF5] shadow-lg shadow-[#7C6BF0]/10 shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wider uppercase text-white font-sans">
              Study Library
            </h1>
            <p className="text-[10px] sm:text-xs font-mono text-zinc-400">
              Persistent Decks, Practice Exams & Adaptive Curriculum
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCreationInitialType('flashcards');
              setIsCreationOpen(true);
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#7C6BF0] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#7C6BF0]/30 hover:bg-[#6b58e6] transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Create Study Tool</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="px-4 sm:px-8 py-3 border-b border-white/[0.06] bg-zinc-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Tools' },
            { id: 'flashcards', label: 'Flashcards' },
            { id: 'quiz', label: 'Quizzes' },
            { id: 'guide', label: 'Guides' },
            { id: 'plan', label: 'Plans' },
          ].map((tab) => {
            const isSelected = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#7C6BF0] text-white font-bold shadow-md shadow-[#7C6BF0]/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Course Filter Dropdown & Search */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Course filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#7C6BF0]"
          >
            {coursesList.map((c) => (
              <option key={c} value={c} className="bg-zinc-900 text-white">
                {c === 'ALL' ? 'All Courses' : c}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7C6BF0]"
            />
          </div>
        </div>
      </div>

      {/* ── Library Grid ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-48 rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen size={48} className="text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No Study Tools Found</h3>
            <p className="text-sm text-zinc-400 mb-6 font-mono max-w-sm">
              {searchQuery || typeFilter !== 'all' || courseFilter !== 'ALL'
                ? 'Try adjusting your search filters or course selection.'
                : 'Create your first interactive flashcard deck, quiz, or study plan.'}
            </p>
            <button
              onClick={() => {
                setCreationInitialType('flashcards');
                setIsCreationOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C6BF0] text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={14} />
              <span>Create New Tool</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              return (
                <motion.div
                  key={tool.id}
                  onClick={() => handleOpenTool(tool)}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="p-6 rounded-3xl bg-zinc-950/80 border border-white/[0.08] hover:border-[#7C6BF0]/50 shadow-2xl backdrop-blur-xl cursor-pointer flex flex-col justify-between group transition-all"
                >
                  {/* Top Metadata */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          {getToolIcon(tool.type)}
                        </span>
                        <div>
                          <span className="text-[10px] font-mono tracking-widest text-[#9B8DF5] uppercase font-bold">
                            {getToolTypeLabel(tool.type)}
                          </span>
                          <div className="text-xs font-mono text-zinc-400 font-bold">
                            {tool.courseCode}
                          </div>
                        </div>
                      </div>

                      {/* Tool Card Action Icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDuplicate(tool.id, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors"
                          title="Duplicate tool"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(tool, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/[0.08] transition-colors"
                          title="Delete tool"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white font-sans line-clamp-2 leading-snug group-hover:text-[#B4A5FF] transition-colors">
                      {tool.title}
                    </h3>
                  </div>

                  {/* Bottom Stats & Launch CTA */}
                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <span>{getToolItemCount(tool)}</span>
                      <span className="text-zinc-700">&bull;</span>
                      <span className="text-emerald-400 font-bold">{tool.progress}%</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTool(tool);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] group-hover:bg-[#7C6BF0] group-hover:border-[#7C6BF0] text-xs font-bold text-white uppercase tracking-wider transition-all"
                    >
                      <Play size={11} className="fill-current" />
                      <span>{tool.progress > 0 ? 'Resume' : 'Start'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Undo Toast Notification ── */}
      <AnimatePresence>
        {deletedToolUndo && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900 border border-white/[0.15] shadow-2xl backdrop-blur-xl"
          >
            <span className="text-xs text-zinc-300 font-sans">
              Deleted &quot;{deletedToolUndo.title}&quot;
            </span>
            <button
              onClick={handleUndoDelete}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#7C6BF0] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#6b58e6]"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-Screen ~95% Viewport Modal ── */}
      <StudyToolModal
        tool={activeTool}
        isOpen={Boolean(activeTool)}
        onClose={() => setActiveTool(null)}
        onUpdateTool={(updated) => {
          setActiveTool(updated);
          setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onSpawnChildTool={(type, topic, sourceText) => {
          // Open creation modal with prefilled data
          setCreationInitialType(type);
          setIsCreationOpen(true);
        }}
      />

      {/* ── Tool Creation Modal ── */}
      <ToolCreationModal
        isOpen={isCreationOpen}
        onClose={() => setIsCreationOpen(false)}
        initialType={creationInitialType}
        initialCourse={courseFilter !== 'ALL' ? courseFilter : 'ECON-217'}
        onCreated={(newTool) => {
          setTools((prev) => [newTool, ...prev]);
          setActiveTool(newTool);
        }}
      />
    </div>
  );
}
