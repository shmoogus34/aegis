'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, ChevronLeft, ChevronRight, RotateCcw,
  ThumbsUp, ThumbsDown, Loader2, Sparkles
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

const COURSES = [
  { code: 'ANTH-202', name: 'Archaeology',               color: '#9B8DF5' },
  { code: 'BUSN-296', name: 'Legal Environment',          color: '#60A5FA' },
  { code: 'BUSN-110', name: 'Business Bootcamp',          color: '#4ADE80' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship',   color: '#C084FC' },
  { code: 'ECON-217', name: 'Microeconomics',             color: '#F87171' },
  { code: 'MATH-171', name: 'Statistical Decision Making',color: '#4DD9E0' },
];

interface Card {
  id:       string;
  question: string;
  answer:   string;
  known:    boolean | null;
}

function parseCards(raw: string): Card[] {
  const cards: Card[] = [];
  const lines = raw.split('\n');
  let q = '', a = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Q:') || trimmed.startsWith('**Q:')) {
      q = trimmed.replace(/^\*?\*?Q:\*?\*?\s*/, '').trim();
    } else if (trimmed.startsWith('A:') || trimmed.startsWith('**A:')) {
      a = trimmed.replace(/^\*?\*?A:\*?\*?\s*/, '').trim();
      if (q && a) {
        cards.push({ id: `card-${cards.length}`, question: q, answer: a, known: null });
        q = ''; a = '';
      }
    }
  }
  return cards;
}

function FlipCard({ card, flipped, onFlip }: { card: Card; flipped: boolean; onFlip: () => void }) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ height: '280px', perspective: '1200px' }}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        {/* Front — Question */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-sm"
          style={{
            backfaceVisibility: 'hidden',
            background:  '#0D0D11',
            border:      '1px solid #7C6BF030',
            boxShadow:   '0 0 40px #7C6BF010',
          }}
        >
          <div className="text-[9px] tracking-[0.3em] mb-6" style={{ color: '#3D3580' }}>QUESTION — CLICK TO REVEAL</div>
          <div className="text-[15px] font-medium text-center leading-relaxed" style={{ color: '#F0E6D3' }}>
            {card.question}
          </div>
          <div className="mt-6 text-[9px]" style={{ color: '#4B3820' }}>click to flip</div>
        </div>

        {/* Back — Answer */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-sm"
          style={{
            backfaceVisibility: 'hidden',
            transform:   'rotateY(180deg)',
            background:  '#0A0A0E',
            border:      '1px solid #4ADE8030',
            boxShadow:   '0 0 40px #4ADE8010',
          }}
        >
          <div className="text-[9px] tracking-[0.3em] mb-6 text-glow-green" style={{ color: '#4ADE80' }}>ANSWER</div>
          <div className="text-[13px] text-center leading-relaxed" style={{ color: '#C8B89A' }}>
            {card.answer}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function StudyTab() {
  const [courseIdx, setCourseIdx] = useState(1); // default to BUSN-296 (exam prep)
  const [topic, setTopic]         = useState('');
  const [cards, setCards]         = useState<Card[]>([]);
  const [idx, setIdx]             = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [score, setScore]         = useState({ known: 0, study: 0 });

  const pushLog = useAegisStore((s) => s.pushLog);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);

  const course = COURSES[courseIdx];

  const generate = useCallback(async () => {
    setGenerating(true);
    setCards([]);
    setIdx(0);
    setFlipped(false);
    setScore({ known: 0, study: 0 });

    const opId = 'study-drill-tab';
    startOp(opId);
    pushLog({
      source: 'openrouter',
      message: `Study Drill → Generating flashcards for ${course.code}${topic ? ': ' + topic : ''}`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/openrouter', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:     'study-drill',
          courseCode: course.code,
          courseName: course.name,
          topic:      topic || undefined,
          stream:     false,
        }),
      });
      const data = await res.json();
      if (data.text) {
        const parsed = parseCards(data.text);
        setCards(parsed.length > 0 ? parsed : [
          { id: 'fallback', question: 'No structured cards returned. Raw content:', answer: data.text.slice(0, 400), known: null }
        ]);
        pushLog({
          source: 'openrouter',
          message: `Study Drill: ${parsed.length} flashcards generated via ${data.model}`,
          level:  'success',
          model:  data.model,
          tokens: data.tokens,
        });
      } else {
        pushLog({ source: 'openrouter', message: `Drill error: ${data.error}`, level: 'error' });
      }
    } catch (err) {
      pushLog({ source: 'openrouter', message: `Drill failed: ${err}`, level: 'error' });
    } finally {
      setGenerating(false);
      endOp(opId);
    }
  }, [course, topic, pushLog, startOp, endOp]);

  const markKnown = useCallback((known: boolean) => {
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, known } : c));
    setScore((s) => ({ ...s, known: s.known + (known ? 1 : 0), study: s.study + (known ? 0 : 1) }));
    setFlipped(false);
    setTimeout(() => setIdx((i) => Math.min(i + 1, cards.length - 1)), 300);
  }, [idx, cards.length]);

  const restart = useCallback(() => {
    setIdx(0);
    setFlipped(false);
    setScore({ known: 0, study: 0 });
    setCards((prev) => prev.map((c) => ({ ...c, known: null })));
  }, []);

  const card = cards[idx];
  const done = idx >= cards.length && cards.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header bar ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-3 border-b shrink-0"
        style={{ borderColor: '#2A252020', background: '#09090C' }}
      >
        <BrainCircuit size={14} style={{ color: '#7C6BF0' }} />
        <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: '#7C6BF0' }}>
          STUDY MODE
        </span>

        {/* Course selector */}
        <select
          value={courseIdx}
          onChange={(e) => setCourseIdx(Number(e.target.value))}
          className="px-3 py-1 rounded-sm text-[10px] tracking-wider outline-none appearance-none cursor-pointer"
          style={{
            background:  '#7C6BF010',
            border:      '1px solid #7C6BF030',
            color:       course.color,
            minWidth:    '180px',
          }}
        >
          {COURSES.map((c, i) => (
            <option key={c.code} value={i} style={{ background: '#0D0D11', color: c.color }}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>

        {/* Topic input */}
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (optional — e.g. Tort Law, Elasticity)"
          className="flex-1 px-3 py-1 rounded-sm text-[10px] outline-none"
          style={{
            background:  '#0D0D11',
            border:      '1px solid #2A252025',
            color:       '#C8B89A',
          }}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
        />

        <motion.button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-wider"
          style={{ background: '#7C6BF015', border: '1px solid #7C6BF040', color: '#9B8DF5' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {generating ? 'GENERATING...' : 'GENERATE CARDS'}
        </motion.button>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* Empty state */}
          {cards.length === 0 && !generating && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <BrainCircuit size={40} style={{ color: '#7C6BF020' }} />
              <div className="text-[11px] tracking-wider text-center" style={{ color: '#4B3820' }}>
                Select a course and click Generate Cards to start your study session.
                <br />
                <span style={{ color: '#3D3580' }}>AI will generate 8 exam-style Q&A flashcards.</span>
              </div>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed animate-spin" style={{ borderColor: course.color }} />
              <div className="text-[11px] tracking-wider" style={{ color: course.color }}>
                Generating flashcards for {course.code}...
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <motion.div
              className="flex flex-col items-center gap-6 py-12"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-2xl font-bold" style={{ color: '#9B8DF5' }}>Session Complete!</div>
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#4ADE80' }}>{score.known}</div>
                  <div className="text-[9px] tracking-wider mt-1" style={{ color: '#3D3580' }}>I KNEW IT</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#F87171' }}>{score.study}</div>
                  <div className="text-[9px] tracking-wider mt-1" style={{ color: '#3D3580' }}>STUDY MORE</div>
                </div>
              </div>
              <div className="text-[11px]" style={{ color: '#3D3580' }}>
                Accuracy: {cards.length > 0 ? Math.round(score.known / cards.length * 100) : 0}%
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={restart}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold"
                  style={{ background: '#7C6BF015', border: '1px solid #7C6BF040', color: '#9B8DF5' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <RotateCcw size={11} /> Restart Session
                </motion.button>
                <motion.button
                  onClick={generate}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold"
                  style={{ background: '#4ADE8015', border: '1px solid #4ADE8030', color: '#4ADE80' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Sparkles size={11} /> New Cards
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Active flashcard */}
          {card && !done && (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#2A252030' }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${(idx / cards.length) * 100}%`, background: course.color }}
                  />
                </div>
                <span className="text-[9px] shrink-0" style={{ color: '#3D3580' }}>
                  {idx + 1} / {cards.length}
                </span>
                <div className="flex items-center gap-2 text-[9px]">
                  <span style={{ color: '#4ADE80' }}>✓ {score.known}</span>
                  <span style={{ color: '#F87171' }}>✗ {score.study}</span>
                </div>
              </div>

              {/* Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <motion.button
                  onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
                  disabled={idx === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px]"
                  style={{ background: '#2A252015', color: '#3D3580', opacity: idx === 0 ? 0.3 : 1 }}
                  whileHover={idx > 0 ? { scale: 1.02 } : {}}
                >
                  <ChevronLeft size={12} /> Prev
                </motion.button>

                {flipped ? (
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => markKnown(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[11px] font-bold"
                      style={{ background: '#F8717115', border: '1px solid #F8717130', color: '#F87171' }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ThumbsDown size={12} /> Study More
                    </motion.button>
                    <motion.button
                      onClick={() => markKnown(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[11px] font-bold"
                      style={{ background: '#4ADE8015', border: '1px solid #4ADE8030', color: '#4ADE80' }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ThumbsUp size={12} /> I Knew It
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => setFlipped(true)}
                    className="px-6 py-2 rounded-sm text-[11px] font-bold tracking-wider"
                    style={{ background: `${course.color}15`, border: `1px solid ${course.color}40`, color: course.color }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    SHOW ANSWER
                  </motion.button>
                )}

                <motion.button
                  onClick={() => { setIdx((i) => Math.min(i + 1, cards.length - 1)); setFlipped(false); }}
                  disabled={idx === cards.length - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px]"
                  style={{ background: '#2A252015', color: '#3D3580', opacity: idx === cards.length - 1 ? 0.3 : 1 }}
                  whileHover={idx < cards.length - 1 ? { scale: 1.02 } : {}}
                >
                  Next <ChevronRight size={12} />
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
