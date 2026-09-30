'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Bot, FileText, X, Sparkles, Clock, Lock,
  ExternalLink, Copy, Check, ChevronDown, BookOpen, Send, Loader2,
  Layers, HelpCircle
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import { cleanAiResponse } from '@/lib/cleanAiResponse';
import AiDraftReviewModal from './AiDraftReviewModal';
import StudyToolModal from './study/StudyToolModal';
import type { StudyToolItem } from '@/lib/studyTools/types';

interface AssignmentDetail {
  id: string;
  name: string;
  description: string;
  dueAt: string | null;
  pointsPossible: number | null;
  submissionTypes: string[];
  htmlUrl: string;
  lockdownBrowser: boolean;
  rubric: any;
  submitted: boolean;
  courseId: string;
  courseCode?: string;
  groundedContext?: string;
  linkedResources?: any[];
}

interface Props {
  assignment: {
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    courseColor: string;
    name: string;
    dueAt: string | null;
    pointsPossible?: number | null;
    htmlUrl?: string;
    lockdownBrowser?: boolean;
  };
  onClose: () => void;
}

type AIAction = 'teach' | 'complete' | 'notes' | 'custom';

const ACTION_CONFIG = {
  teach: {
    label: 'Teach Me',
    icon: <GraduationCap size={15} />,
    prompt: (a: AssignmentDetail, cc: string) =>
      `You are an expert tutor for ${cc}.
Assignment: "${a.name}"
Instructions & Context: ${a.description ? a.description.replace(/<[^>]+>/g, ' ').slice(0, 1200) : ''}
${a.groundedContext ? `\n\nCOURSE NOTES & SYLLABUS KNOWLEDGE:\n${a.groundedContext.slice(0, 6000)}\n` : ''}

INSTRUCTIONS:
1. Explain the fundamental concepts, theories, and formulas needed for this deliverable in plain, crystal-clear words.
2. If this is an economics/math quiz (e.g. Quiz 5 on Market Structures, Elasticity, or Statistics), define each concept cleanly with simple concrete examples and formulas.
3. Call out common traps and test tricks professors love to include.
4. Provide 3 quick practice conceptual questions with straight-up simple answers.
5. Keep it punchy, practical, and highly readable.`,
  },
  complete: {
    label: 'Draft Assignment',
    icon: <Bot size={15} />,
    prompt: (a: AssignmentDetail, cc: string) =>
      `You are an elite student co-pilot for ${cc}.
Assignment: "${a.name}"
Instructions: ${a.description ? a.description.replace(/<[^>]+>/g, ' ').slice(0, 1400) : 'Complete the required submission.'}
${a.rubric ? `Rubric criteria: ${JSON.stringify(a.rubric).slice(0, 600)}` : ''}
${a.groundedContext ? `\n\nCOURSE NOTES & SYLLABUS KNOWLEDGE:\n${a.groundedContext.slice(0, 6000)}\n` : ''}

TASK:
Write a complete, structured rough draft for this assignment based on the instructions, rubric, and course notes.
- Use plain, straightforward vocabulary (never use pompous words like "delve", "plethora", "tapestry", "in conclusion").
- Directly address every prompt requirement with substantive facts from the course material.
- Organize with clear headings and paragraphs.
- Note: This is a rough draft for student review only.`,
  },
  notes: {
    label: 'Study Notes',
    icon: <FileText size={15} />,
    prompt: (a: AssignmentDetail, cc: string) =>
      `Generate clean, high-yield Markdown study notes for ${cc} based on: "${a.name}".
Context: ${a.description ? a.description.replace(/<[^>]+>/g, ' ').slice(0, 1000) : ''}
${a.groundedContext ? `\n\nCOURSE NOTES & SYLLABUS KNOWLEDGE:\n${a.groundedContext.slice(0, 5000)}\n` : ''}

Format as structured Obsidian notes:
- # ${a.name} — Study Notes
- ## Core Definitions & Rules
- ## Real-World Applications & Examples
- ## Exam Traps & High-Yield Summary`,
  },
};

function formatDue(dueAt: string | null): string {
  if (!dueAt) return 'No due date';
  const d = new Date(dueAt);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function countdownStr(dueAt: string | null): { text: string; crit: boolean } {
  if (!dueAt) return { text: '', crit: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { text: 'OVERDUE', crit: true };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return { text: `${d}d ${h % 24}h left`, crit: d < 1 };
  return { text: `${h}h ${Math.floor((diff % 3600000) / 60000)}m left`, crit: h < 12 };
}

export default function AssignmentModal({ assignment, onClose }: Props) {
  const [detail, setDetail] = useState<AssignmentDetail>({
    id: assignment.id,
    name: assignment.name,
    description: '<p>Loading course notes and assignment details from syllabus and vault...</p>',
    dueAt: assignment.dueAt,
    pointsPossible: assignment.pointsPossible ?? null,
    submissionTypes: [],
    htmlUrl: assignment.htmlUrl ?? 'https://longwood.instructure.com',
    lockdownBrowser: assignment.lockdownBrowser ?? false,
    rubric: null,
    submitted: false,
    courseId: assignment.courseId,
    courseCode: assignment.courseCode,
  });

  const [loading, setLoading] = useState(true);
  const [activeAI, setActiveAI] = useState<AIAction | null>(null);
  const [aiText, setAIText] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHumanizerModal, setShowHumanizerModal] = useState(false);
  const [activeStudyTool, setActiveStudyTool] = useState<StudyToolItem | null>(null);
  const [generatingToolType, setGeneratingToolType] = useState<'flashcards' | 'quiz' | null>(null);

  const handleGenerateStudyTool = async (toolType: 'flashcards' | 'quiz') => {
    setGeneratingToolType(toolType);
    try {
      const res = await fetch('/api/study-tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: toolType,
          topic: assignment.name,
          courseCode: assignment.courseCode,
          courseName: assignment.courseName,
          difficulty: 'medium',
          count: toolType === 'flashcards' ? 10 : 8,
          sourceText: detail.groundedContext || detail.description?.replace(/<[^>]+>/g, ' ') || undefined,
        }),
      });
      const data = await res.json();
      if (data.tool) {
        setActiveStudyTool(data.tool);
      }
    } catch (err) {
      console.error('Failed to generate study tool from assignment:', err);
    } finally {
      setGeneratingToolType(null);
    }
  };

  const pushLog = useAegisStore((s) => s.pushLog);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);
  const aiRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchDetail() {
      try {
        const query = new URLSearchParams({
          courseId: assignment.courseId,
          assignmentId: assignment.id,
          courseCode: assignment.courseCode,
          name: assignment.name,
          dueAt: assignment.dueAt || '',
        });
        const res = await fetch(`/api/canvas/detail?${query.toString()}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setDetail((prev) => ({
            ...prev,
            ...data,
            name: data.name || assignment.name,
            courseCode: assignment.courseCode,
          }));
        }
      } catch (e) {
        console.warn('Assignment detail fetch error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => { mounted = false; };
  }, [assignment]);

  const triggerAI = useCallback(async (action: AIAction, customQ?: string) => {
    setActiveAI(action);
    setAILoading(true);
    setAIText('');

    const opId = `ai-${action}-${Date.now()}`;
    startOp(opId);

    const isCustom = action === 'custom';
    const cfg = isCustom ? null : ACTION_CONFIG[action as keyof typeof ACTION_CONFIG];
    const promptContent = isCustom && customQ
      ? `Student question for ${assignment.courseCode} ("${detail.name}"):\n"${customQ}"\n\nInstructions & Context:\n${detail.description?.replace(/<[^>]+>/g, ' ').slice(0, 1000)}\n\n${detail.groundedContext ? `COURSE NOTES & VAULT KNOWLEDGE:\n${detail.groundedContext.slice(0, 5000)}` : ''}`
      : cfg!.prompt(detail, assignment.courseCode);

    const actionLabel = isCustom ? 'Custom AI Query' : cfg!.label;

    pushLog({
      source: 'openrouter',
      message: `AI Triggered: "${actionLabel}" → ${assignment.courseCode} ("${detail.name}") [Task-Optimized Model]`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesis',
          courseCode: assignment.courseCode,
          courseName: assignment.courseCode,
          selectedModelId: 'smart',
          messages: [{ role: 'user', content: promptContent }],
        }),
      });
      const data = await res.json();

      if (data.text && data.text.trim().length > 0) {
        setAIText(cleanAiResponse(data.text));
        if (action === 'complete') {
          setShowHumanizerModal(true);
        }
        pushLog({
          source: data.provider === 'nvidia' ? 'nvidia' : 'openrouter',
          message: `"${actionLabel}" completed via ${data.model} (~${data.tokens ?? '?'} tokens)`,
          level: 'success',
        });
      } else {
        setAIText(`Inference error: ${data.error || 'No content returned from AI provider. Please check connection.'}`);
      }
    } catch (err) {
      setAIText(`Connection error: ${err}`);
    } finally {
      setAILoading(false);
      endOp(opId);
      setTimeout(() => aiRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    }
  }, [detail, assignment, pushLog, startOp, endOp]);

  const copyResult = useCallback(() => {
    if (!aiText) return;
    navigator.clipboard.writeText(aiText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [aiText]);

  const { text: cdText, crit } = countdownStr(assignment.dueAt);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(16px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08]"
          style={{ background: '#0B0B11E6', backdropFilter: 'blur(24px)' }}
          initial={{ scale: 0.96, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-[#7C6BF0]/20 text-[#B4A5FF] border border-[#7C6BF0]/30 font-mono">
                {assignment.courseCode}
              </span>
              {assignment.lockdownBrowser && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <Lock size={11} /> LOCKDOWN BROWSER
                </span>
              )}
              {detail.pointsPossible !== null && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                  {detail.pointsPossible} PTS
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {cdText && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${crit ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800 text-zinc-300'}`}>
                  {cdText}
                </span>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2 font-sans tracking-wide">
                {assignment.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Clock size={13} className="text-[#9B8DF5]" />
                <span>Due: {formatDue(assignment.dueAt)}</span>
              </div>
            </div>

            {/* AI Action Buttons — Clean Rounded Pills */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-sans">
                  <Sparkles size={14} className="text-[#9B8DF5]" />
                  AI Co-Pilot Actions (Grounded in Vault & Syllabus)
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Auto-routes to best model</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {(Object.entries(ACTION_CONFIG) as [AIAction, typeof ACTION_CONFIG['teach']][]).map(([key, cfg]) => {
                  const isActive = activeAI === key && aiLoading;
                  return (
                    <button
                      key={key}
                      onClick={() => triggerAI(key)}
                      disabled={aiLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all disabled:opacity-50 ${
                        activeAI === key
                          ? 'bg-[#7C6BF0] text-white shadow-lg shadow-[#7C6BF0]/25'
                          : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                      }`}
                    >
                      {isActive ? <Loader2 size={14} className="animate-spin text-white" /> : cfg.icon}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}

                <button
                  onClick={() => handleGenerateStudyTool('flashcards')}
                  disabled={Boolean(generatingToolType) || aiLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all disabled:opacity-50 bg-[#7C6BF0]/20 text-[#B4A5FF] hover:bg-[#7C6BF0] hover:text-white border border-[#7C6BF0]/40 shadow-sm"
                >
                  {generatingToolType === 'flashcards' ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Layers size={14} />
                  )}
                  <span>Flashcards</span>
                </button>

                <button
                  onClick={() => handleGenerateStudyTool('quiz')}
                  disabled={Boolean(generatingToolType) || aiLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all disabled:opacity-50 bg-[#7C6BF0]/20 text-[#B4A5FF] hover:bg-[#7C6BF0] hover:text-white border border-[#7C6BF0]/40 shadow-sm"
                >
                  {generatingToolType === 'quiz' ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <HelpCircle size={14} />
                  )}
                  <span>Practice Quiz</span>
                </button>
              </div>

              {/* Custom question bar */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customQuestion.trim() && triggerAI('custom', customQuestion)}
                  placeholder={`Ask anything about ${assignment.name} or course concepts...`}
                  className="flex-1 bg-black/40 border border-white/[0.08] rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7C6BF0] transition-colors"
                />
                <button
                  onClick={() => customQuestion.trim() && triggerAI('custom', customQuestion)}
                  disabled={!customQuestion.trim() || aiLoading}
                  className="px-4 py-2 rounded-full bg-[#7C6BF0]/20 hover:bg-[#7C6BF0] text-[#B4A5FF] hover:text-white border border-[#7C6BF0]/40 text-xs font-bold tracking-wider transition-all disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
            </div>

            {/* AI Response Card */}
            {(aiText || aiLoading) && (
              <div ref={aiRef} className="rounded-xl bg-[#0F0F18] border border-[#7C6BF0]/30 p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B4A5FF]">
                    <Sparkles size={14} />
                    <span>AI RESPONSE — {activeAI ? ACTION_CONFIG[activeAI as keyof typeof ACTION_CONFIG]?.label || 'Custom' : ''}</span>
                  </div>
                  {aiText && (
                    <button
                      onClick={copyResult}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-3 py-6 justify-center text-zinc-400 text-xs font-mono">
                    <Loader2 size={18} className="animate-spin text-[#9B8DF5]" />
                    <span>Synthesizing knowledge from Obsidian vault and course syllabus...</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-[#7C6BF0]/40">
                    {aiText}
                  </div>
                )}
              </div>
            )}

            {/* Description & Course Content */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-sans">
                Assignment & Course Overview
              </h3>
              <div
                className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: detail.description }}
              />
            </div>
          </div>

          {/* Bottom Dock Bar */}
          <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Course: {assignment.courseName}</span>
            <a
              href={detail.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <span>Open in Canvas LMS</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Humanizer & AI percentage review modal */}
      {showHumanizerModal && aiText && (
        <AiDraftReviewModal
          onClose={() => setShowHumanizerModal(false)}
          assignmentName={detail.name}
          courseCode={assignment.courseCode}
          rawDraft={aiText}
        />
      )}

      {/* Generated Study Tool Modal */}
      {activeStudyTool && (
        <StudyToolModal
          tool={activeStudyTool}
          isOpen={Boolean(activeStudyTool)}
          onClose={() => setActiveStudyTool(null)}
          onUpdateTool={(up) => setActiveStudyTool(up)}
        />
      )}
    </AnimatePresence>
  );
}
