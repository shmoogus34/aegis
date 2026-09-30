'use client';

import { useEffect, useState } from 'react';
import { Compass, ClipboardList, GraduationCap, FolderOpen, Cpu } from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import type { AegisTab } from '@/lib/types';

const TABS: { id: AegisTab; label: string; icon: React.ReactNode }[] = [
  { id: 'command',     label: 'CORE',        icon: <Compass size={14} /> },
  { id: 'assignments', label: 'ASSIGNMENTS', icon: <ClipboardList size={14} /> },
  { id: 'study',       label: 'STUDY',       icon: <GraduationCap size={14} /> },
  { id: 'vault',       label: 'VAULT',       icon: <FolderOpen size={14} /> },
  { id: 'models',      label: 'MODELS',      icon: <Cpu size={14} /> },
];

function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) {
    return (
      <div className="text-right">
        <div className="text-2xl font-bold font-mono tracking-widest text-white opacity-0">00:00:00</div>
        <div className="text-xs text-zinc-500 font-mono tracking-widest opacity-0">TUE, SEP 29, 2026</div>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const hh  = pad(time.getHours());
  const mm  = pad(time.getMinutes());
  const ss  = pad(time.getSeconds());
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: '2-digit', year: 'numeric'
  }).toUpperCase();

  return (
    <div className="text-right select-none shrink-0 font-mono">
      <div className="text-base sm:text-2xl font-extrabold tracking-widest text-white leading-none">
        {hh}
        <span className="opacity-40 animate-pulse">:</span>
        {mm}
        <span className="opacity-40 animate-pulse">:</span>
        <span className="text-[#9B8DF5]">{ss}</span>
      </div>
      <div className="text-[9px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] font-semibold text-zinc-400 mt-0.5 sm:mt-1 uppercase">
        {dateStr}
      </div>
    </div>
  );
}

export default function HeaderBar() {
  const activeTab = useAegisStore((s) => s.activeTab);
  const setActiveTab = useAegisStore((s) => s.setActiveTab);

  return (
    <header
      className="relative flex items-center justify-between px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 border-b border-white/[0.08] z-50 shrink-0 select-none"
      style={{
        background: 'rgba(7, 7, 10, 0.75)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Top-Left: Large Prominent Brand with / V2 and Muted Subline ── */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-base sm:text-lg font-bold text-[#9B8DF5] shadow-lg shadow-[#7C6BF0]/10">
          ⬡
        </div>
        <div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-base sm:text-xl font-black tracking-[0.2em] text-white font-sans">
              AEGIS
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 font-mono">
              / V2
            </span>
          </div>
          <div className="hidden sm:block text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-medium">
            ACADEMIC OPERATING SYSTEM
          </div>
        </div>
      </div>

      {/* ── Top-Center: Floating Pill-Shaped Segmented Switch Bar (Desktop / Tablet) ── */}
      <nav className="hidden md:flex items-center p-1 rounded-full bg-zinc-950/80 border border-white/[0.08] backdrop-blur-md shadow-2xl">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#7C6BF0] text-white shadow-lg shadow-[#7C6BF0]/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-zinc-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Top-Right: Prominent Digital Clock with Date ── */}
      <LiveClock />
    </header>
  );
}
