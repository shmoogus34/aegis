'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Trash2 } from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import type { AgentLog } from '@/lib/types';

const SOURCE_COLORS: Record<string, string> = {
  canvas:      '#4DD9E0',
  openrouter:  '#9B8DF5',
  nvidia:      '#76B900',
  calendar:    '#C084FC',
  vault:       '#4ADE80',
  system:      '#94A3B8',
};

const LEVEL_COLORS: Record<string, string> = {
  info:    '#E2E8F0',
  success: '#4ADE80',
  warn:    '#FBBF24',
  error:   '#F87171',
};

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function LogEntry({ log }: { log: AgentLog }) {
  const srcColor = SOURCE_COLORS[log.source] ?? '#94A3B8';
  const lvlColor = LEVEL_COLORS[log.level]   ?? '#E2E8F0';

  return (
    <motion.div
      className="flex items-start gap-2 py-1 px-1.5 hover:bg-white/[0.04] rounded-sm transition-colors"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
    >
      {/* Timestamp */}
      <span className="text-[10px] shrink-0 font-mono text-stone-400">
        {formatLogTime(log.timestamp)}
      </span>

      {/* Source tag */}
      <span
        className="text-[10px] shrink-0 font-bold tracking-wider uppercase font-mono px-1 rounded-sm"
        style={{
          background: `${srcColor}15`,
          color: srcColor,
          border: `1px solid ${srcColor}30`,
        }}
      >
        {log.source.toUpperCase()}
      </span>

      {/* Level indicator */}
      <span className="text-[10px] shrink-0 font-bold" style={{ color: lvlColor }}>
        {log.level === 'success' ? '✓' : log.level === 'error' ? '✗' : log.level === 'warn' ? '⚠' : '›'}
      </span>

      {/* Message */}
      <span className="text-xs leading-snug flex-1 font-mono text-stone-200">
        {log.message}
      </span>

      {/* Token count */}
      {log.tokens && (
        <span className="text-[9px] shrink-0 font-mono text-[#9B8DF5]/80 bg-[#7C6BF0] px-1 rounded-sm border border-[#7C6BF0]">
          {log.tokens.toLocaleString()} tok
        </span>
      )}
    </motion.div>
  );
}

export default function AgentTerminal() {
  const logs      = useAegisStore((s) => s.agentLogs);
  const clearLogs = useAegisStore((s) => s.clearLogs);
  const activeOps = useAegisStore((s) => s.activeOps);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const isActive = activeOps.size > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800 shrink-0 mb-1.5">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-[#9B8DF5]" />
          <span className="text-xs font-bold tracking-widest text-white uppercase">
            AGENT LOG TERMINAL
          </span>
          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-bold bg-[#7C6BF0] text-[#7C6BF0] border border-[#7C6BF0] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C6BF0]" />
              RUNNING ({activeOps.size})
            </div>
          )}
        </div>

        <button
          onClick={clearLogs}
          className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-red-400 px-2 py-0.5 rounded-sm border border-stone-800 bg-black/40 transition-colors"
          title="Clear logs"
        >
          <Trash2 size={11} />
          CLEAR
        </button>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 rounded-sm border border-stone-900 bg-black/60 flex flex-col gap-1 min-h-0">
        {logs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
