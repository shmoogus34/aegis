'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Calendar, Terminal, LayoutList } from 'lucide-react';
import CommandDeck from './CommandDeck';
import ScheduleTimeline from './ScheduleTimeline';
import AgentTerminal from './AgentTerminal';

export default function RightPanelHub() {
  const [activeSubTab, setActiveSubTab] = useState<'commands' | 'schedule' | 'terminal' | 'split'>('commands');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Sub-Tabs Header ───────────────────────────────── */}
      <div className="flex items-center justify-between p-2 border-b border-stone-800/80 bg-black/40 shrink-0">
        <div className="grid grid-cols-4 gap-1 w-full">
          {[
            { id: 'commands', label: 'COMMANDS', icon: <Zap size={11} /> },
            { id: 'schedule', label: 'SCHEDULE', icon: <Calendar size={11} /> },
            { id: 'terminal', label: 'TERMINAL', icon: <Terminal size={11} /> },
            { id: 'split',    label: 'ALL / SPLIT', icon: <LayoutList size={11} /> },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-all"
                style={{
                  background: isActive ? '#7C6BF025' : 'transparent',
                  border: `1px solid ${isActive ? '#7C6BF060' : 'transparent'}`,
                  color: isActive ? '#B4A5FF' : '#8A8A9A',
                }}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Dynamic Sub-View Content ──────────────────────── */}
      <div className="flex-1 overflow-hidden p-3 min-h-0">
        <AnimatePresence mode="wait">
          {activeSubTab === 'commands' && (
            <motion.div
              key="commands"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CommandDeck />
            </motion.div>
          )}

          {activeSubTab === 'schedule' && (
            <motion.div
              key="schedule"
              className="h-full flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ScheduleTimeline />
            </motion.div>
          )}

          {activeSubTab === 'terminal' && (
            <motion.div
              key="terminal"
              className="h-full flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AgentTerminal />
            </motion.div>
          )}

          {activeSubTab === 'split' && (
            <motion.div
              key="split"
              className="h-full flex flex-col gap-3 overflow-y-auto pr-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="shrink-0">
                <CommandDeck />
              </div>
              <div className="h-64 shrink-0 border-t border-stone-800 pt-2">
                <ScheduleTimeline />
              </div>
              <div className="h-64 shrink-0 border-t border-stone-800 pt-2">
                <AgentTerminal />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
