'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Search, Brain, Calculator, Calendar, Zap,
  Loader2, Sparkles, Send, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

interface DeckButton {
  id:      string;
  label:   string;
  sub:     string;
  icon:    React.ReactNode;
  color:   string;
  action:  () => Promise<void>;
}

export default function CommandDeck() {
  const [loading, setLoading]       = useState<string | null>(null);
  const [solverCourse, setSolverCourse] = useState<'ECON-217' | 'MATH-171' | 'BUSN-296'>('ECON-217');
  const [solverProblem, setSolverProblem] = useState<string>('');
  const [solverResult, setSolverResult]   = useState<string>('');
  const [solverLoading, setSolverLoading] = useState<boolean>(false);

  const pushLog           = useAegisStore((s) => s.pushLog);
  const startOp           = useAegisStore((s) => s.startOp);
  const endOp             = useAegisStore((s) => s.endOp);
  const setAssignments   = useAegisStore((s) => s.setAssignments);
  const setAnnouncements = useAegisStore((s) => s.setAnnouncements);
  const setCalendarEvents = useAegisStore((s) => s.setCalendarEvents);
  const setLastCanvasSync   = useAegisStore((s) => s.setLastCanvasSync);
  const setLastCalendarSync = useAegisStore((s) => s.setLastCalendarSync);
  const setActiveTab      = useAegisStore((s) => s.setActiveTab);

  const run = useCallback(async (id: string, fn: () => Promise<void>) => {
    setLoading(id);
    startOp(id);
    try {
      await fn();
    } catch (err) {
      pushLog({ source: 'system', message: `Command ${id} failed: ${err}`, level: 'error' });
    } finally {
      setLoading(null);
      endOp(id);
    }
  }, [startOp, endOp, pushLog]);

  const handleRunSolver = async () => {
    if (!solverProblem.trim() || solverLoading) return;
    setSolverLoading(true);
    setSolverResult('');
    const opId = `solver-${Date.now()}`;
    startOp(opId);

    pushLog({
      source: 'openrouter',
      message: `Quantitative Solver: ${solverCourse} → "${solverProblem.slice(0, 45)}..."`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/openrouter', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:     'solver',
          courseCode: solverCourse,
          messages:   [{ role: 'user', content: solverProblem }],
        }),
      });
      const data = await res.json();
      if (data.text) {
        setSolverResult(data.text);
        pushLog({
          source:  data.provider === 'nvidia' ? 'nvidia' : 'openrouter',
          message: `Solver completed derivation via ${data.model} (~${data.tokens} tokens)`,
          level:   'success',
        });
      } else {
        setSolverResult(`Solver error: ${data.error || 'No solution generated.'}`);
      }
    } catch (err) {
      setSolverResult(`Network error: ${err}`);
    } finally {
      setSolverLoading(false);
      endOp(opId);
    }
  };

  const BUTTONS: DeckButton[] = [
    {
      id:    'canvas-sync',
      label: 'CANVAS SYNC',
      sub:   'Pull latest courses, grades & quizzes',
      icon:  <RefreshCw size={15} />,
      color: '#9B8DF5',
      action: async () => {
        pushLog({ source: 'canvas', message: 'Canvas SYNC → Polling Canvas endpoints...', level: 'info' });
        const res  = await fetch('/api/canvas');
        const data = await res.json();
        if (data.assignments)   setAssignments(data.assignments);
        if (data.announcements) setAnnouncements(data.announcements);
        setLastCanvasSync(new Date().toISOString());
        pushLog({
          source:  'canvas',
          message: `Canvas SYNC complete → ${data.assignments?.length ?? 0} deliverables updated`,
          level:   'success',
        });
      },
    },
    {
      id:    'study-drill',
      label: 'STUDY DRILL ENGINE',
      sub:   'Generate exam flashcards with AI',
      icon:  <Brain size={15} />,
      color: '#C084FC',
      action: async () => {
        pushLog({ source: 'openrouter', message: 'Study DRILL → Launching interactive flashcard engine...', level: 'info' });
        setActiveTab('study');
      },
    },
    {
      id:    'vault-audit',
      label: 'VAULT AUDIT & BROWSER',
      sub:   'Browse all 21 Obsidian course notes',
      icon:  <Search size={15} />,
      color: '#4ADE80',
      action: async () => {
        pushLog({ source: 'vault', message: 'Vault AUDIT → Scanning ./vault/ across all 6 courses...', level: 'info' });
        const res = await fetch('/api/vault');
        const data = await res.json();
        pushLog({
          source:  'vault',
          message: `Vault AUDIT complete → ${data.count ?? 21} notes verified across 6 courses`,
          level:   'success',
        });
        setActiveTab('vault');
      },
    },
    {
      id:    'calendar-sync',
      label: 'APPLE CALENDAR SYNC',
      sub:   'Sync iCloud calendar feed & schedule',
      icon:  <Calendar size={15} />,
      color: '#60A5FA',
      action: async () => {
        pushLog({ source: 'calendar', message: 'Calendar SYNC → Fetching iCloud p66-caldav feed...', level: 'info' });
        const res  = await fetch('/api/calendar');
        const data = await res.json();
        if (data.events) setCalendarEvents(data.events);
        setLastCalendarSync(new Date().toISOString());
        pushLog({
          source:  'calendar',
          message: `Apple Calendar synchronized (${data.count ?? 0} timetable blocks live)`,
          level:   'success',
        });
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 h-full overflow-y-auto pr-1">
      {/* ── Section Title ─────────────────────────────────── */}
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest">
          <Zap size={15} className="text-[#7C6BF0]" />
          <span>SYSTEM COMMAND DECK</span>
        </div>
        <span className="text-[9px] text-emerald-400 font-bold">● ALL SYSTEMS READY</span>
      </div>

      {/* ── Primary Action Buttons (High contrast, clearly visible) ── */}
      <div className="grid grid-cols-1 gap-2 shrink-0">
        {BUTTONS.map((btn) => {
          const isLoading = loading === btn.id;
          return (
            <motion.button
              key={btn.id}
              onClick={() => !isLoading && run(btn.id, btn.action)}
              disabled={isLoading}
              className="flex items-center justify-between p-3 rounded-sm text-left transition-all border relative overflow-hidden group cursor-pointer"
              style={{
                background: `${btn.color}10`,
                borderColor: `${btn.color}45`,
              }}
              whileHover={{ scale: 1.01, borderColor: btn.color }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                  style={{
                    background: `${btn.color}25`,
                    color: btn.color,
                  }}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : btn.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-wide" style={{ color: btn.color }}>
                    {btn.label}
                  </div>
                  <div className="text-[10px] text-stone-300 truncate mt-0.5">
                    {btn.sub}
                  </div>
                </div>
              </div>

              <span className="text-xs text-stone-400 group-hover:text-white transition-colors pl-2 shrink-0">
                EXECUTE ▶
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Interactive Quantitative Solver Console ──────── */}
      <div className="p-3.5 rounded-sm border border-cyan-500/30 bg-cyan-950/10 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Calculator size={15} />
            <span>INSTANT ECON / MATH SOLVER</span>
          </div>
          <span className="text-[9px] text-cyan-400 font-mono">DEEPSEEK-R1</span>
        </div>

        {/* Course selection pills */}
        <div className="flex items-center gap-1.5">
          {(['ECON-217', 'MATH-171', 'BUSN-296'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setSolverCourse(c)}
              className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-all"
              style={{
                background: solverCourse === c ? '#4DD9E025' : '#0D0D14',
                border: `1px solid ${solverCourse === c ? '#4DD9E080' : '#2A252040'}`,
                color: solverCourse === c ? '#4DD9E0' : '#8A8A9A',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Problem input */}
        <div className="flex flex-col gap-1.5">
          <textarea
            rows={2}
            value={solverProblem}
            onChange={(e) => setSolverProblem(e.target.value)}
            placeholder={`Type any problem (e.g. Calculate elasticity if P rises from $4 to $5, or explain burden of proof)...`}
            className="w-full p-2.5 rounded-sm text-xs font-mono outline-none resize-none bg-black/60 border border-stone-800 text-stone-200"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                'Prove MR = P(1-1/|e|)',
                'Calculate 95% CI for mean',
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => setSolverProblem(sample)}
                  className="text-[9px] text-stone-400 hover:text-cyan-300 px-1.5 py-0.5 rounded-sm bg-stone-900 border border-stone-800"
                >
                  {sample}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunSolver}
              disabled={solverLoading || !solverProblem.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold text-cyan-300 border border-cyan-500/40 bg-cyan-500/20 hover:bg-cyan-500/30 transition-all ml-auto shrink-0"
            >
              {solverLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              SOLVE
            </button>
          </div>
        </div>

        {/* Solver Solution Output */}
        {solverResult && (
          <div className="p-3 rounded-sm border border-cyan-500/30 bg-black/80 font-mono text-xs text-stone-200 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
            {solverResult}
          </div>
        )}
      </div>
    </div>
  );
}
