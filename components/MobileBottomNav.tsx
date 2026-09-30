'use client';

import { Compass, ClipboardList, GraduationCap, FolderOpen, Cpu } from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import type { AegisTab } from '@/lib/types';

const TABS: { id: AegisTab; label: string; icon: any }[] = [
  { id: 'command',     label: 'Core',         icon: Compass },
  { id: 'assignments', label: 'Deliverables', icon: ClipboardList },
  { id: 'study',       label: 'Study',        icon: GraduationCap },
  { id: 'vault',       label: 'Vault',        icon: FolderOpen },
  { id: 'models',      label: 'Models',       icon: Cpu },
];

export default function MobileBottomNav() {
  const activeTab = useAegisStore((s) => s.activeTab);
  const setActiveTab = useAegisStore((s) => s.setActiveTab);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/[0.1] px-2 py-1.5 flex items-center justify-around select-none shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all relative ${
              isActive
                ? 'text-[#B4A5FF]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#7C6BF0]/25 text-[#B4A5FF] shadow-[0_0_12px_rgba(124,107,240,0.4)] scale-110'
                  : ''
              }`}
            >
              <Icon size={18} />
            </div>
            <span
              className={`text-[10px] tracking-tight font-medium mt-0.5 ${
                isActive ? 'font-bold text-white' : 'text-zinc-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
