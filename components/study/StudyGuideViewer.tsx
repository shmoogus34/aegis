'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, HelpCircle, Layers, CheckCircle, Circle,
  ChevronDown, ChevronUp, Sparkles, Plus, Edit2, Check
} from 'lucide-react';
import type { StudyToolItem, StudyGuideContent, StudyGuideSection } from '@/lib/studyTools/types';

interface Props {
  tool: StudyToolItem;
  onUpdate: (updatedTool: StudyToolItem) => void;
  onGenerateChildTool?: (type: 'quiz' | 'flashcards', topic: string, sourceText: string) => void;
}

export default function StudyGuideViewer({ tool, onUpdate, onGenerateChildTool }: Props) {
  const content = tool.data as StudyGuideContent;
  const [sections, setSections] = useState<StudyGuideSection[]>(content.sections || []);
  const [reviewedSections, setReviewedSections] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Toggle section reviewed
  const handleToggleReviewed = async (sectionId: string) => {
    const updated = { ...reviewedSections, [sectionId]: !reviewedSections[sectionId] };
    setReviewedSections(updated);

    const reviewedCount = Object.values(updated).filter(Boolean).length;
    const progress = Math.round((reviewedCount / (sections.length || 1)) * 100);

    const updatedTool: StudyToolItem = {
      ...tool,
      progress,
      data: {
        ...content,
        sections,
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
      console.error('Failed to sync study guide progress:', err);
    }
  };

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="flex flex-col h-full select-none text-white font-sans overflow-hidden">
      {/* ── Top Bar: Guide Overview & Jump Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4 border-b border-white/[0.08] bg-zinc-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 flex items-center justify-center text-[#9B8DF5]">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight font-sans">
              {content.title || tool.title}
            </h2>
            <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {sections.length} Comprehensive Modules &bull; {tool.courseCode}
            </div>
          </div>
        </div>

        {/* Section Jump Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-xl">
          {sections.map((sec, idx) => {
            const isDone = reviewedSections[sec.id];
            return (
              <a
                key={sec.id}
                href={`#section-${sec.id}`}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>{idx + 1}.</span>
                <span className="truncate max-w-[120px]">{sec.title}</span>
                {isDone && <Check size={11} className="text-emerald-400" />}
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Main Scrollable Study Guide Sections ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        {sections.map((sec, idx) => {
          const isDone = reviewedSections[sec.id];
          const isCollapsed = collapsedSections[sec.id];

          return (
            <motion.section
              key={sec.id}
              id={`section-${sec.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-6 md:p-8 rounded-3xl border transition-all ${
                isDone
                  ? 'bg-zinc-950/60 border-emerald-500/30'
                  : 'bg-zinc-950/80 border-white/[0.1] shadow-2xl'
              } backdrop-blur-xl`}
            >
              {/* Section Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleReviewed(sec.id)}
                    className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title={isDone ? 'Mark as incomplete' : 'Mark as reviewed'}
                  >
                    {isDone ? (
                      <CheckCircle size={22} className="text-emerald-400" />
                    ) : (
                      <Circle size={22} className="text-zinc-600 hover:text-zinc-400" />
                    )}
                  </button>

                  <div>
                    <span className="text-[11px] font-mono tracking-widest text-[#9B8DF5] uppercase">
                      MODULE {idx + 1}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-white font-sans mt-0.5">
                      {sec.title}
                    </h3>
                  </div>
                </div>

                {/* Quick Action Spawn Buttons */}
                <div className="flex items-center gap-2">
                  {onGenerateChildTool && (
                    <>
                      <button
                        onClick={() => {
                          const context = `${sec.title}\n\nKey Ideas:\n${sec.keyIdeas.join(
                            '\n'
                          )}\n\nTerms:\n${sec.terms.map((t) => `${t.term}: ${t.definition}`).join('\n')}`;
                          onGenerateChildTool('quiz', `${sec.title} Quiz`, context);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
                        title="Generate Quiz on this module"
                      >
                        <HelpCircle size={13} className="text-blue-400" />
                        <span>Quiz Me</span>
                      </button>

                      <button
                        onClick={() => {
                          const context = `${sec.title}\n\nKey Ideas:\n${sec.keyIdeas.join(
                            '\n'
                          )}\n\nTerms:\n${sec.terms.map((t) => `${t.term}: ${t.definition}`).join('\n')}`;
                          onGenerateChildTool('flashcards', `${sec.title} Cards`, context);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
                        title="Generate Flashcards on this module"
                      >
                        <Layers size={13} className="text-[#9B8DF5]" />
                        <span>Flashcards</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => toggleCollapse(sec.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-6">
                  {/* 1. Key Ideas */}
                  {sec.keyIdeas && sec.keyIdeas.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
                        Core Principles & Key Ideas
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sec.keyIdeas.map((idea, iIdx) => (
                          <li
                            key={iIdx}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-zinc-200 leading-relaxed font-sans"
                          >
                            <span className="text-[#9B8DF5] font-bold mr-2">&bull;</span>
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 2. Key Terms & Definitions */}
                  {sec.terms && sec.terms.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
                        Key Terminology & Definitions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sec.terms.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1"
                          >
                            <div className="text-sm font-bold text-white font-sans">
                              {t.term}
                            </div>
                            <div className="text-xs text-zinc-400 leading-relaxed font-sans">
                              {t.definition}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Worked Examples */}
                  {sec.workedExamples && sec.workedExamples.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
                        Worked Exam Examples & Applications
                      </h4>
                      <div className="space-y-4">
                        {sec.workedExamples.map((ex, eIdx) => (
                          <div
                            key={eIdx}
                            className="p-5 rounded-2xl bg-[#7C6BF0]/[0.04] border border-[#7C6BF0]/20 flex flex-col gap-3"
                          >
                            <div>
                              <span className="text-[10px] font-mono tracking-wider text-amber-400 uppercase font-bold">
                                PROBLEM SCENARIO:
                              </span>
                              <p className="text-sm font-medium text-white mt-1 font-sans">
                                {ex.problem}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                              <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase font-bold">
                                STEP-BY-STEP SOLUTION:
                              </span>
                              <p className="text-xs text-zinc-300 mt-1 font-mono leading-relaxed whitespace-pre-wrap">
                                {ex.solution}
                              </p>
                            </div>

                            <div className="text-xs text-zinc-400 font-sans italic">
                              <span className="text-zinc-500 not-italic font-bold">Takeaway: </span>
                              {ex.keyTakeaway}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
