'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, FileText, BrainCircuit, ExternalLink,
  Copy, Check, Sparkles, GraduationCap, ChevronRight, Loader2, Send
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

interface Props {
  courseCode: string;
  onClose: () => void;
}

const COURSE_META: Record<string, { name: string; color: string; path: string; files: string[] }> = {
  'ANTH-202': {
    name: 'Archaeology',
    color: '#9B8DF5',
    path: 'ANTH-202-Archaeology',
    files: ['notes.md', 'study-guide.md', 'overview.md', 'assignments.md'],
  },
  'BUSN-296': {
    name: 'Legal Environment of Business',
    color: '#60A5FA',
    path: 'BUSN-296-Legal-Environment',
    files: ['study-guide.md', 'notes.md', 'test1-prep.md', 'overview.md'],
  },
  'BUSN-110': {
    name: 'Business Bootcamp: Student Success',
    color: '#4ADE80',
    path: 'BUSN-110-Business-Bootcamp',
    files: ['study-guide.md', 'notes.md', 'overview.md'],
  },
  'CTZN-110': {
    name: 'Social Entrepreneurship & Global Citizenship',
    color: '#C084FC',
    path: 'CTZN-110-Social-Entrepreneurship',
    files: ['study-guide.md', 'notes.md', 'overview.md'],
  },
  'ECON-217': {
    name: 'Principles of Microeconomics',
    color: '#F87171',
    path: 'ECON-217-Microeconomics',
    files: ['study-guide.md', 'notes.md', 'overview.md'],
  },
  'MATH-171': {
    name: 'Statistical Decision Making',
    color: '#4DD9E0',
    path: 'MATH-171-Statistical-Decision-Making',
    files: ['formula-sheet.md', 'study-guide.md', 'notes.md', 'overview.md'],
  },
};

export default function CourseKnowledgeModal({ courseCode, onClose }: Props) {
  const meta = COURSE_META[courseCode] || {
    name: courseCode,
    color: '#7C6BF0',
    path: `${courseCode}`,
    files: ['overview.md', 'notes.md', 'study-guide.md'],
  };

  const [activeFile, setActiveFile] = useState<string>(meta.files[0] || 'notes.md');
  const [content, setContent]       = useState<string>('');
  const [loading, setLoading]       = useState<boolean>(true);
  const [copied, setCopied]         = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading]   = useState<boolean>(false);

  const setActiveTab = useAegisStore((s) => s.setActiveTab);
  const pushLog      = useAegisStore((s) => s.pushLog);

  // Fetch vault file content
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/vault?path=${encodeURIComponent(`${meta.path}/${activeFile}`)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setContent(data.content || '');
        } else {
          if (isMounted) setContent(`# ${courseCode} — ${activeFile}\n\nNote loaded from local Obsidian vault repository.`);
        }
      } catch (err) {
        if (isMounted) setContent(`# ${courseCode}\nFailed to load note: ${err}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [meta.path, activeFile, courseCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const askAiTutor = async (promptOverride?: string) => {
    const q = promptOverride || aiQuestion;
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse('');

    pushLog({
      source: 'openrouter',
      message: `AI Course Tutor: ${courseCode} → "${q.slice(0, 45)}..."`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesis',
          courseCode: courseCode,
          courseName: meta.name,
          messages: [{
            role: 'user',
            content: `You are the master professor for ${courseCode} (${meta.name}). The student asks:\n"${q}"\n\nProvide an insightful, structured, authoritative explanation with concrete examples and key takeaways.`,
          }],
        }),
      });
      const data = await res.json();
      setAiResponse(data.text || 'No response generated.');
    } catch (err) {
      setAiResponse(`Error connecting to AI: ${err}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: '#00000088', backdropFilter: 'blur(10px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-sm overflow-hidden"
          style={{
            background: '#0B0B0F',
            border: `1px solid ${meta.color}60`,
            boxShadow: `0 0 35px ${meta.color}25, 0 20px 50px rgba(0,0,0,0.8)`,
          }}
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          {/* ── Top Bar ────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-b shrink-0"
            style={{
              borderColor: `${meta.color}35`,
              background: 'linear-gradient(90deg, #111118 0%, #0B0B0F 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: meta.color }} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-widest" style={{ color: meta.color }}>
                    {courseCode}
                  </span>
                  <span className="text-xs text-stone-300 font-bold">
                    {meta.name}
                  </span>
                </div>
                <div className="text-[9px] text-stone-400">
                  OBSIDIAN VAULT KNOWLEDGE BASE // ACTIVE ENROLLMENT
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  setActiveTab('study');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold text-[#9B8DF5] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-colors"
              >
                <BrainCircuit size={12} />
                FLASHCARDS
              </button>
              <button
                onClick={() => {
                  onClose();
                  setActiveTab('assignments');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold text-blue-400 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
              >
                <BookOpen size={12} />
                ASSIGNMENTS
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-sm text-stone-400 hover:text-white transition-colors ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── File Selection Sub-Tabs ────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-2 border-b shrink-0"
            style={{ borderColor: '#2A252030', background: '#08080C' }}
          >
            <div className="flex items-center gap-1.5">
              {meta.files.map((file) => {
                const isActive = activeFile === file;
                return (
                  <button
                    key={file}
                    onClick={() => setActiveFile(file)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold tracking-wider uppercase transition-all"
                    style={{
                      background: isActive ? `${meta.color}25` : 'transparent',
                      border: `1px solid ${isActive ? `${meta.color}60` : '#2A252030'}`,
                      color: isActive ? '#FFFFFF' : '#8A8A9A',
                    }}
                  >
                    <FileText size={11} style={{ color: isActive ? meta.color : '#3D3580' }} />
                    {file.replace('.md', '')}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-sm text-[#9B8DF5] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-colors"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'COPIED' : 'COPY NOTE'}
            </button>
          </div>

          {/* ── Content Viewer & Interactive AI Tutor ──────────── */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

            {/* Quick Ask AI Tutor Box */}
            <div className="p-3.5 rounded-sm border" style={{ background: '#0D0D14', borderColor: '#2A252035' }}>
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#7C6BF0]">
                <Sparkles size={13} />
                <span>Ask the AI Tutor for {courseCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`e.g., Explain the top 3 concepts likely to be on the ${courseCode} exam...`}
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAiTutor()}
                  className="flex-1 px-3 py-2 rounded-sm text-xs outline-none font-mono"
                  style={{ background: '#070709', border: '1px solid #2A252045', color: '#F0E6D2' }}
                />
                <button
                  onClick={() => askAiTutor()}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-bold text-[#9B8DF5] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-all"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  ASK
                </button>
              </div>

              {/* Quick Prompt Pill Buttons */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[10px] text-stone-400">Quick drills:</span>
                {[
                  'Explain key concepts in simple terms',
                  'Give me 3 practice exam questions',
                  'Summarize the formulas / doctrine',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setAiQuestion(prompt);
                      askAiTutor(prompt);
                    }}
                    className="text-[10px] px-2.5 py-0.5 rounded-sm text-stone-300 hover:text-white border border-stone-800 bg-stone-900/60 hover:border-[#7C6BF0] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* AI Response Display */}
              {aiResponse && (
                <div className="mt-3 p-4 rounded-sm border border-[#7C6BF0] bg-black/60 font-mono text-xs text-stone-200 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {aiResponse}
                </div>
              )}
            </div>

            {/* Markdown Note Text */}
            <div className="p-6 rounded-sm border border-stone-800 bg-black/40">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-stone-400 text-xs">
                  <Loader2 size={16} className="animate-spin text-[#7C6BF0]" />
                  <span>Loading vault note...</span>
                </div>
              ) : (
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-stone-200"
                >
                  {content}
                </pre>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
