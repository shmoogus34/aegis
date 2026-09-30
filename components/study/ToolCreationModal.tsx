'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Sparkles, Layers, HelpCircle, BookOpen, CalendarCheck,
  Loader2, AlertCircle, ShieldCheck, Sliders, Check
} from 'lucide-react';
import type { StudyToolType, StudyToolItem } from '@/lib/studyTools/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tool: StudyToolItem) => void;
  initialType?: StudyToolType;
  initialCourse?: string;
  initialTopic?: string;
}

const COURSES = [
  { code: 'ECON-217', name: 'Microeconomics (Quiz 5 Prep)', color: '#F87171' },
  { code: 'MATH-171', name: 'Statistical Decision Making (CLT & Regression)', color: '#4DD9E0' },
  { code: 'BUSN-296', name: 'Legal Environment (Business Law)', color: '#60A5FA' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship (Logic Model)', color: '#C084FC' },
  { code: 'ANTH-202', name: 'Archaeology (Stratigraphy & Dating)', color: '#9B8DF5' },
  { code: 'BUSN-110', name: 'Business Bootcamp (Finance & Study Habits)', color: '#4ADE80' },
];

const PRESETS: Record<string, string[]> = {
  'ECON-217': [
    'Quiz 5: Monopoly Pricing & Deadweight Loss',
    'Price Elasticity of Demand & Supply',
    'Perfect Competition vs Oligopoly',
  ],
  'MATH-171': [
    'Central Limit Theorem & Normal Distribution',
    'Simple Linear Regression & Correlation r',
    'Confidence Intervals & Hypothesis Testing',
  ],
  'BUSN-296': [
    'Test 2: LLCs, Corporations & Fiduciary Duty',
    'Negligence: 4 Elements & Defenses',
    'Contract Formation: Offer, Acceptance, Consideration',
  ],
  'CTZN-110': [
    'Theory of Change & Logic Model Framework',
    'B-Corps vs Traditional Nonprofits',
    'UN Sustainable Development Goals (SDGs)',
  ],
  'ANTH-202': [
    'Stratigraphy, Harris Matrix & Law of Superposition',
    'Relative vs Absolute Dating (Radiocarbon & K-Ar)',
    'Site Formation Processes (C-transforms & N-transforms)',
  ],
  'BUSN-110': [
    '50/30/20 Budgeting & Student Loan Types',
    'Eisenhower Priority Matrix & Time Management',
    'Active Recall & Spaced Repetition Study Habits',
  ],
};

export default function ToolCreationModal({
  isOpen,
  onClose,
  onCreated,
  initialType = 'quiz',
  initialCourse = 'ECON-217',
  initialTopic = '',
}: Props) {
  const [type, setType] = useState<StudyToolType>(initialType);
  const [courseCode, setCourseCode] = useState(initialCourse);
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(15);
  const [customCountInput, setCustomCountInput] = useState('');
  const [questionFormat, setQuestionFormat] = useState<'mixed' | 'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [customInstructions, setCustomInstructions] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    const selectedCourse = COURSES.find((c) => c.code === courseCode);
    const finalCount = customCountInput ? parseInt(customCountInput, 10) || count : count;

    try {
      const res = await fetch('/api/study-tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          topic: topic.trim() || `${courseCode} Study Material`,
          courseCode,
          courseName: selectedCourse?.name,
          difficulty,
          count: type === 'guide' ? 4 : type === 'plan' ? 5 : finalCount,
          questionFormat: type === 'quiz' ? questionFormat : undefined,
          customInstructions: customInstructions.trim() || undefined,
          sourceText: customNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate study tool.');
      }

      onCreated(data.tool);
      onClose();
    } catch (err: any) {
      console.error('Study tool generation error:', err);
      setErrorMsg(err?.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toolTypes: { id: StudyToolType; label: string; icon: any; desc: string }[] = [
    {
      id: 'quiz',
      label: 'Practice Quiz',
      icon: HelpCircle,
      desc: 'Configurable questions (e.g. 15 all multiple choice) with instant explanations',
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: Layers,
      desc: '3D interactive cards with Leitner spaced repetition',
    },
    {
      id: 'guide',
      label: 'Study Guide',
      icon: BookOpen,
      desc: 'Structured sections with key ideas, terms, and worked examples',
    },
    {
      id: 'plan',
      label: 'Study Plan',
      icon: CalendarCheck,
      desc: 'Realistic daily study schedule mapped to upcoming Canvas deadlines',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl liquid-glass-card rounded-3xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 flex items-center justify-center text-[#9B8DF5] shadow-[0_0_15px_rgba(124,107,240,0.3)]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight font-sans">
                  Create AI Study Tool
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#7C6BF0]/25 text-[#B4A5FF] border border-[#7C6BF0]/40 flex items-center gap-1">
                  <ShieldCheck size={11} /> Anti-Repeat
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Google Gemini 3.8 Flash Direct · Memory Grounded
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tool Type Grid */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2.5">
              1. Select Study Tool Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {toolTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#7C6BF0]/25 border-[#9B8DF5] text-white shadow-[0_0_20px_rgba(124,107,240,0.35)]'
                        : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon size={20} className={isSelected ? 'text-[#B4A5FF]' : 'text-zinc-500'} />
                    <span className="text-xs font-bold font-sans mt-2">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Course Selection */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2.5">
              2. Target Course
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {COURSES.map((c) => {
                const isSelected = courseCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCourseCode(c.code);
                      if (PRESETS[c.code] && PRESETS[c.code].length > 0) {
                        setTopic(PRESETS[c.code][0]);
                      }
                    }}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#7C6BF0]/20 border-[#7C6BF0]/60 text-white font-bold shadow-[0_0_12px_rgba(124,107,240,0.2)]'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-mono">{c.code}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Topic & Suggestions */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              3. Topic or Exam Material
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quiz 5: Market Structures & Monopoly Pricing"
              className="w-full px-4 py-3 rounded-2xl liquid-glass-input text-sm text-white focus:outline-none"
            />

            {/* Topic Presets */}
            {PRESETS[courseCode] && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-[11px] font-mono text-zinc-500">Suggestions:</span>
                {PRESETS[courseCode].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopic(preset)}
                    className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] text-zinc-400 hover:text-white hover:bg-white/[0.08] truncate max-w-xs transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Quiz Specific Options: Format Selection */}
          {type === 'quiz' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={13} className="text-[#9B8DF5]" />
                  Question Format
                </label>
                <span className="text-[11px] font-mono text-[#9B8DF5]">
                  {questionFormat === 'multiple_choice' ? 'All Multiple Choice (4 Options)' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'multiple_choice', label: 'All Multiple Choice', hint: '4 options each' },
                  { id: 'mixed', label: 'Mixed Formats', hint: 'MC + T/F + short ans' },
                  { id: 'true_false', label: 'All True / False', hint: 'Strict T/F' },
                  { id: 'short_answer', label: 'All Short Answer', hint: 'Direct answers' },
                ].map((fmt) => {
                  const isSelected = questionFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setQuestionFormat(fmt.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#7C6BF0]/25 border-[#9B8DF5] text-white shadow-[0_0_15px_rgba(124,107,240,0.3)]'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="text-xs font-bold font-sans">{fmt.label}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{fmt.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Item Count & Difficulty */}
          {(type === 'flashcards' || type === 'quiz') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  Number of {type === 'flashcards' ? 'Cards' : 'Questions'}
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 8, 10, 15, 20, 25].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setCount(num);
                        setCustomCountInput('');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        count === num && !customCountInput
                          ? 'bg-[#7C6BF0] text-white shadow-[0_0_12px_rgba(124,107,240,0.4)]'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  Difficulty Level
                </label>
                <div className="flex items-center gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono uppercase font-bold transition-all ${
                        difficulty === diff
                          ? 'bg-white/[0.12] text-white border border-white/[0.2] shadow-sm'
                          : 'bg-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. Custom Prompting / Instructions */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Specific Instructions & Constraints (Optional)
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Focus on graph analysis and calculations only; avoid simple definitional questions"
              className="w-full px-4 py-3 rounded-2xl liquid-glass-input text-xs text-white focus:outline-none"
            />
          </div>

          {/* 7. Reference Material / Notes */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Additional Reference Text / Paste Notes (Optional)
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Paste specific lecture slides, chapter excerpts, or formulas to ground the generator..."
              rows={2}
              className="w-full p-3.5 rounded-2xl liquid-glass-input text-xs text-white focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-white/[0.08] bg-white/[0.02]">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Anti-Repetition Enabled (Unique Questions Guaranteed)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleCreate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl liquid-glass-btn text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Generating ({count} Qs)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Generate with Gemini 3.8 Flash</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
