'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Copy, Sparkles, ExternalLink, ShieldCheck, AlertTriangle,
  RefreshCw, FileText, ArrowRight, Wand2, Eye, BookOpen, Layers
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

interface DetectionMetrics {
  aiScore: number;
  status: string;
  perplexity: number;
  burstiness: number;
  flaggedSentences: string[];
}

interface Props {
  assignmentName: string;
  courseCode: string;
  rawDraft: string;
  onClose: () => void;
  onSaveToVault?: (text: string) => void;
}

export default function AiDraftReviewModal({
  assignmentName,
  courseCode,
  rawDraft,
  onClose,
  onSaveToVault,
}: Props) {
  const [tone, setTone] = useState<'academic' | 'conversational' | 'analytical'>('academic');
  const [loading, setLoading] = useState(false);
  const [humanizedDraft, setHumanizedDraft] = useState('');
  const [rawMetrics, setRawMetrics] = useState<DetectionMetrics | null>(null);
  const [humanMetrics, setHumanMetrics] = useState<DetectionMetrics | null>(null);
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [savedVault, setSavedVault] = useState(false);

  const pushLog = useAegisStore((s) => s.pushLog);

  // Auto-run humanizer & detection on mount
  useEffect(() => {
    if (rawDraft && rawDraft.trim().length > 0) {
      handleRunHumanizer(tone);
    }
  }, [rawDraft]);

  const handleRunHumanizer = async (selectedTone: 'academic' | 'conversational' | 'analytical') => {
    setLoading(true);
    pushLog({
      source: 'openrouter',
      message: `Running CleverHumanizer & GPTZero comparison for ${courseCode}...`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/humanizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'humanize',
          text: rawDraft,
          courseCode,
          tone: selectedTone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHumanizedDraft(data.humanizedText || rawDraft);
        setRawMetrics(data.originalMetrics);
        setHumanMetrics(data.humanizedMetrics);

        pushLog({
          source: 'openrouter',
          message: `Humanization complete: AI Score reduced from ${data.originalMetrics?.aiScore}% → ${data.humanizedMetrics?.aiScore}%`,
          level: 'success',
        });
      } else {
        console.error('Failed to humanize draft');
      }
    } catch (err) {
      console.error('Humanizer request error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, isRight: boolean) => {
    navigator.clipboard.writeText(text);
    if (isRight) {
      setCopiedRight(true);
      setTimeout(() => setCopiedRight(false), 2000);
    } else {
      setCopiedLeft(true);
      setTimeout(() => setCopiedLeft(false), 2000);
    }
  };

  const openGptZero = () => {
    navigator.clipboard.writeText(rawDraft);
    window.open('https://gptzero.me/', '_blank');
  };

  const openCleverHumanizer = () => {
    navigator.clipboard.writeText(rawDraft);
    window.open('https://cleverhumanizer.ai/', '_blank');
  };

  const handleSaveDraft = () => {
    if (onSaveToVault) {
      onSaveToVault(humanizedDraft || rawDraft);
      setSavedVault(true);
      setTimeout(() => setSavedVault(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        className="w-full max-w-6xl max-h-[92vh] rounded-md border flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: '#0B0B11',
          borderColor: '#7C6BF060',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px #7C6BF020',
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
      >
        {/* ── Modal Header Bar ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ background: '#0E0E16', borderColor: '#2A252040' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-sm flex items-center justify-center font-bold text-sm"
              style={{
                background: 'rgba(212, 163, 89, 0.15)',
                border: '1px solid #7C6BF050',
                color: '#9B8DF5',
              }}
            >
              <Wand2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  ASSIGNMENT DRAFT // AI REVIEW & HUMANIZATION
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7C6BF0] text-[#7C6BF0] border border-[#7C6BF0]">
                  DRAFT ONLY — NOT SUBMITTED
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {courseCode} • {assignmentName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Subheader Notice & Tone Selection ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b shrink-0 text-xs"
          style={{ background: '#09090D', borderColor: '#2A252030' }}
        >
          <div className="flex items-center gap-2 text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Side-by-side comparison with simulated <strong>GPTZero</strong> AI detection and <strong>CleverHumanizer</strong> rewriting.
            </span>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-2">
            <span className="text-stone-400 text-xs">Humanizer Tone:</span>
            {(['academic', 'conversational', 'analytical'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTone(t);
                  handleRunHumanizer(t);
                }}
                disabled={loading}
                className={`px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all ${
                  tone === t
                    ? 'bg-[#7C6BF0] text-[#7C6BF0] border border-[#7C6BF060] shadow-[0_0_10px_#7C6BF020]'
                    : 'bg-black/60 text-stone-400 border border-stone-800 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => handleRunHumanizer(tone)}
              disabled={loading}
              className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded text-xs font-bold text-[#9B8DF5] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Re-run
            </button>
          </div>
        </div>

        {/* ── Side-by-Side Comparison Container ── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-stone-800">

          {/* ════ LEFT COLUMN: Naked AI Draft & GPTZero Analysis ════ */}
          <div className="flex flex-col h-full overflow-hidden p-5 bg-black/30">
            {/* Header / GPTZero Card */}
            <div className="pb-3 mb-3 border-b border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  ORIGINAL DRAFT (RAW AI GENERATION)
                </span>
                <button
                  onClick={openGptZero}
                  className="flex items-center gap-1 text-[11px] font-bold text-stone-300 hover:text-white bg-stone-900 border border-stone-700 px-2 py-0.5 rounded transition-all"
                  title="Copies text and opens GPTZero.me in a new tab"
                >
                  <ExternalLink size={11} />
                  Test on GPTZero.me
                </button>
              </div>

              {/* GPTZero Score Pill */}
              <div className="p-3 rounded bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                    GPTZero Detection Analysis
                  </div>
                  <div className="text-xl font-bold text-rose-400 mt-0.5">
                    {rawMetrics ? `${rawMetrics.aiScore}% AI-Generated` : 'Analyzing...'}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {rawMetrics?.status || 'Calculating sentence perplexity & burstiness...'}
                  </div>
                </div>

                <div className="text-right text-[10px] text-stone-400 font-mono">
                  <div>Perplexity: <span className="text-rose-300">{rawMetrics?.perplexity ?? '—'} (Low)</span></div>
                  <div>Burstiness: <span className="text-rose-300">{rawMetrics?.burstiness ?? '—'} (Uniform)</span></div>
                </div>
              </div>
            </div>

            {/* Raw Text Body */}
            <div className="flex-1 overflow-y-auto pr-2 font-mono text-xs leading-relaxed text-stone-300 whitespace-pre-wrap select-text">
              {rawDraft}
            </div>

            {/* Left Column Copy Button */}
            <div className="pt-3 mt-3 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-mono">
                {rawDraft.split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                onClick={() => copyToClipboard(rawDraft, false)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-white transition-all"
              >
                {copiedLeft ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedLeft ? 'Copied' : 'Copy Raw Draft'}
              </button>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: CleverHumanizer AI Rewrite & Verified Pass ════ */}
          <div className="flex flex-col h-full overflow-hidden p-5 bg-black/40">
            {/* Header / Humanizer Card */}
            <div className="pb-3 mb-3 border-b border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  CLEVERHUMANIZER REWRITE (HUMAN CADENCE)
                </span>
                <button
                  onClick={openCleverHumanizer}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#7C6BF0] hover:text-white bg-[#7C6BF0] border border-[#7C6BF0] px-2 py-0.5 rounded transition-all"
                  title="Copies text and opens CleverHumanizer.ai in a new tab"
                >
                  <ExternalLink size={11} />
                  Open CleverHumanizer.ai
                </button>
              </div>

              {/* Humanized Score Pill */}
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    Post-Humanizer Detection Score
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center gap-2">
                    {humanMetrics ? `${humanMetrics.aiScore}% AI` : (loading ? 'Rewriting...' : '—')}
                    {humanMetrics && humanMetrics.aiScore < 20 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                        PASSED ✅
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-200/80 mt-0.5">
                    {humanMetrics?.status || (loading ? 'Synthesizing varied sentence lengths and human idioms...' : 'Ready')}
                  </div>
                </div>

                <div className="text-right text-[10px] text-stone-400 font-mono">
                  <div>Perplexity: <span className="text-emerald-300">{humanMetrics?.perplexity ?? '—'} (Natural)</span></div>
                  <div>Burstiness: <span className="text-emerald-300">{humanMetrics?.burstiness ?? '—'} (High)</span></div>
                </div>
              </div>
            </div>

            {/* Humanized Text Body */}
            <div className="flex-1 overflow-y-auto pr-2 font-sans text-sm leading-relaxed text-stone-100 whitespace-pre-wrap select-text">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
                  <RefreshCw size={24} className="animate-spin text-[#9B8DF5]" />
                  <p className="text-xs font-mono">CleverHumanizer is rewriting with organic cadence...</p>
                </div>
              ) : (
                humanizedDraft || rawDraft
              )}
            </div>

            {/* Right Column Action Controls */}
            <div className="pt-3 mt-3 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-mono">
                {(humanizedDraft || rawDraft).split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(humanizedDraft || rawDraft, true)}
                  className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded font-bold bg-[#7C6BF0] text-[#7C6BF0] border border-[#7C6BF0] hover:bg-[#7C6BF0] transition-all shadow-[0_0_10px_#7C6BF020]"
                >
                  {copiedRight ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copiedRight ? 'Copied Humanized Text!' : 'Copy Humanized Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Modal Footer ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t shrink-0"
          style={{ background: '#0B0B11', borderColor: '#2A252040' }}
        >
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <span className="text-[#7C6BF0]">🛡️ Academic Notice:</span>
            <span>This draft is stored locally. It will never be submitted to Canvas automatically.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded bg-stone-900 border border-stone-700 text-stone-200 hover:text-white hover:border-stone-500 transition-all"
            >
              {savedVault ? <Check size={14} className="text-emerald-400" /> : <FileText size={14} />}
              {savedVault ? 'Saved to Vault!' : 'Save Draft to Obsidian Vault'}
            </button>

            <button
              onClick={onClose}
              className="text-xs px-5 py-2 rounded font-bold bg-[#7C6BF0] text-black hover:bg-[#7C6BF0] transition-all"
            >
              Done / Return
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
