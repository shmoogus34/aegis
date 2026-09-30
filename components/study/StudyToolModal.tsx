'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Layers, HelpCircle, BookOpen, CalendarCheck,
  Edit2, Check, RefreshCw, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import type { StudyToolItem, StudyToolType } from '@/lib/studyTools/types';
import FlashcardsViewer from './FlashcardsViewer';
import QuizViewer from './QuizViewer';
import StudyGuideViewer from './StudyGuideViewer';
import StudyPlanViewer from './StudyPlanViewer';

interface Props {
  tool: StudyToolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTool: (tool: StudyToolItem) => void;
  onSpawnChildTool?: (type: 'quiz' | 'flashcards', topic: string, sourceText: string) => void;
}

export default function StudyToolModal({
  tool,
  isOpen,
  onClose,
  onUpdateTool,
  onSpawnChildTool,
}: Props) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Synchronize URL query params (?tool=...&id=...)
  useEffect(() => {
    if (isOpen && tool) {
      const url = new URL(window.location.href);
      url.searchParams.set('tool', tool.type);
      url.searchParams.set('id', tool.id);
      window.history.replaceState({}, '', url.toString());
    } else if (!isOpen) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('tool') || url.searchParams.has('id')) {
        url.searchParams.delete('tool');
        url.searchParams.delete('id');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, [isOpen, tool]);

  // Escape key handler to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Rename tool handler
  const handleSaveTitle = async () => {
    if (!tool || !editedTitle.trim() || editedTitle === tool.title) {
      setIsEditingTitle(false);
      return;
    }

    const updated = { ...tool, title: editedTitle.trim() };
    onUpdateTool(updated);
    setIsEditingTitle(false);

    try {
      await fetch('/api/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          id: tool.id,
          newTitle: editedTitle.trim(),
        }),
      });
    } catch (err) {
      console.error('Failed to rename study tool:', err);
    }
  };

  if (!isOpen || !tool) return null;

  const getToolIcon = (type: StudyToolType) => {
    switch (type) {
      case 'flashcards':
        return <Layers size={18} className="text-[#9B8DF5]" />;
      case 'quiz':
        return <HelpCircle size={18} className="text-blue-400" />;
      case 'guide':
        return <BookOpen size={18} className="text-emerald-400" />;
      case 'plan':
        return <CalendarCheck size={18} className="text-amber-400" />;
    }
  };

  const getToolTypeLabel = (type: StudyToolType) => {
    switch (type) {
      case 'flashcards':
        return 'Flashcard Deck';
      case 'quiz':
        return 'Practice Quiz';
      case 'guide':
        return 'Structured Study Guide';
      case 'plan':
        return 'Academic Study Plan';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-[96vw] h-[95vh] rounded-3xl liquid-glass-card shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* ── Modal Top Bar ── */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#7C6BF0]/15 border border-[#7C6BF0]/30 flex items-center justify-center shadow-[0_0_12px_rgba(124,107,240,0.25)]">
              {getToolIcon(tool.type)}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono tracking-widest text-[#9B8DF5] uppercase px-2 py-0.5 rounded-md bg-[#7C6BF0]/15 border border-[#7C6BF0]/30 font-bold">
                  {getToolTypeLabel(tool.type)}
                </span>
                <span className="text-xs font-mono text-zinc-400 font-bold">
                  {tool.courseCode}
                </span>

                {tool.modelUsed && (
                  <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                    &bull; {tool.modelUsed.replace('google/', '').replace('meta-llama/', '')}
                  </span>
                )}
              </div>

              {/* Editable Title */}
              <div className="flex items-center gap-2 mt-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                      autoFocus
                      className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-[#7C6BF0] text-sm text-white font-sans focus:outline-none"
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-base md:text-lg font-bold text-white font-sans leading-none">
                      {tool.title}
                    </h1>
                    <button
                      onClick={() => {
                        setEditedTitle(tool.title);
                        setIsEditingTitle(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-opacity"
                      title="Rename tool"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Close & Escape Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              ESC to close
            </span>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ── Modal Content: Dedicated Interactive Viewers ── */}
        <main className="flex-1 overflow-hidden relative bg-black/40">
          {tool.type === 'flashcards' && (
            <FlashcardsViewer tool={tool} onUpdate={onUpdateTool} />
          )}

          {tool.type === 'quiz' && (
            <QuizViewer tool={tool} onUpdate={onUpdateTool} />
          )}

          {tool.type === 'guide' && (
            <StudyGuideViewer
              tool={tool}
              onUpdate={onUpdateTool}
              onGenerateChildTool={onSpawnChildTool}
            />
          )}

          {tool.type === 'plan' && (
            <StudyPlanViewer tool={tool} onUpdate={onUpdateTool} />
          )}
        </main>
      </motion.div>
    </div>
  );
}
