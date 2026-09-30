'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderBar          from '@/components/HeaderBar';
import LeftFloatingWing   from '@/components/LeftFloatingWing';
import RightFloatingWing  from '@/components/RightFloatingWing';
import AssignmentsTab     from '@/components/tabs/AssignmentsTab';
import StudyLibraryTab    from '@/components/tabs/StudyLibraryTab';
import VaultTab           from '@/components/tabs/VaultTab';
import ModelHubTab        from '@/components/tabs/ModelHubTab';
import ModelRouter        from '@/components/ModelRouter';
import ObsidianDrawer     from '@/components/ObsidianDrawer';
import JarvisOrb          from '@/components/JarvisOrb';
import MobileBottomNav   from '@/components/MobileBottomNav';
import { useAegisStore }  from '@/lib/store';

export default function AegisPage() {
  const activeTab      = useAegisStore((s) => s.activeTab);
  const setActiveTab   = useAegisStore((s) => s.setActiveTab);
  const activeModal    = useAegisStore((s) => s.activeModal);
  const setActiveModal = useAegisStore((s) => s.setActiveModal);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileView, setMobileView] = useState<'core' | 'deliverables' | 'jarvis'>('core');

  const stormIframeRef = useRef<HTMLIFrameElement | null>(null);

  const postToStorm = (message: any) => {
    if (stormIframeRef.current?.contentWindow) {
      stormIframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  // Sync with URL query parameters (?tool=...&id=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tool') || params.get('id')) {
        setActiveTab('study');
      }
    }
  }, [setActiveTab]);

  // Forward pointer movement to storm iframe so cursor tracking is fluid everywhere
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      postToStorm({
        type: 'POINTER_MOVE',
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') { setActiveModal(null); return; }
      if (e.key === '1') { setActiveTab('command'); }
      if (e.key === '2') { setActiveTab('assignments'); }
      if (e.key === '3') { setActiveTab('study'); }
      if (e.key === '4') { setActiveTab('vault'); }
      if (e.key === '5') { setActiveTab('models'); }
      if (e.key === 'f' || e.key === 'F') { setFocusMode((v) => !v); }
      if (e.key === 'm' || e.key === 'M') {
        setActiveModal(activeModal === 'model-router' ? null : 'model-router');
      }
      if (e.key === 'o' || e.key === 'O') {
        setActiveModal(activeModal === 'obsidian' ? null : 'obsidian');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeModal, setActiveModal, setActiveTab]);

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none bg-black text-white font-sans">
      {/* ── HeaderBar ─────────────────────────────────────── */}
      <HeaderBar />

      {/* ── Dynamic Tab View Area ────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'command' && (
            <motion.div
              key="command"
              className="h-full w-full relative overflow-hidden bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── 1. Center Stage Canvas (Three.js Star Core Storm) ── */}
              <iframe
                ref={stormIframeRef}
                src="/storm/index.html"
                className="absolute inset-0 w-full h-full border-0 pointer-events-auto bg-black"
                title="A.E.G.I.S. Star Core Storm"
              />

              {/* ── Mobile Mode Switcher (Visible on mobile/tablet, hidden on desktop) ── */}
              <div className="lg:hidden absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center p-1 rounded-full bg-zinc-950/85 backdrop-blur-xl border border-white/[0.1] shadow-2xl pointer-events-auto">
                <button
                  onClick={() => setMobileView('core')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    mobileView === 'core'
                      ? 'bg-[#7C6BF0] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🌌 Core
                </button>
                <button
                  onClick={() => setMobileView('deliverables')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    mobileView === 'deliverables'
                      ? 'bg-[#7C6BF0] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📋 Tasks
                </button>
                <button
                  onClick={() => setMobileView('jarvis')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    mobileView === 'jarvis'
                      ? 'bg-[#7C6BF0] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎙️ Jarvis
                </button>
              </div>

              {/* ── 2. Aegis Script with deep dark shadow for prominent visibility ── */}
              <div
                className={`absolute top-14 lg:top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center select-none transition-opacity ${
                  mobileView !== 'core' ? 'opacity-0 pointer-events-none lg:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="px-6 sm:px-10 py-2 sm:py-2.5 rounded-3xl bg-black/45 backdrop-blur-md border border-white/[0.05] shadow-[0_12px_45px_rgba(0,0,0,0.95)]">
                  <h1
                    className="text-5xl sm:text-7xl lg:text-8xl font-normal tracking-wide text-white leading-tight"
                    style={{
                      fontFamily: 'Seramonde, Georgia, serif',
                      textShadow: '0 4px 20px #000000, 0 10px 45px #000000, 0 0 35px rgba(124, 107, 240, 0.6)',
                    }}
                  >
                    Aegis
                  </h1>
                  <p className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-[0.35em] text-zinc-300 font-semibold font-sans mt-0.5">
                    Academic Operating System
                  </p>
                </div>
              </div>

              {/* ── 3. Desktop Floating Wings (Hidden on Mobile) ── */}
              <AnimatePresence>
                {!focusMode && (
                  <>
                    {/* Left Column Overlay (Desktop) */}
                    <motion.aside
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.2 }}
                      className="hidden lg:block absolute left-6 top-6 bottom-16 z-20 pointer-events-auto"
                    >
                      <LeftFloatingWing />
                    </motion.aside>

                    {/* Right Column Overlay (Desktop) */}
                    <motion.aside
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.2 }}
                      className="hidden lg:block absolute right-6 top-6 bottom-16 z-20 pointer-events-auto"
                    >
                      <RightFloatingWing />
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>

              {/* ── 4. Mobile View Overlays (Active when user taps Tasks or Jarvis) ── */}
              <AnimatePresence>
                {mobileView === 'deliverables' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="lg:hidden absolute inset-x-3 top-14 bottom-14 z-20 pointer-events-auto max-w-lg mx-auto"
                  >
                    <LeftFloatingWing />
                  </motion.div>
                )}

                {mobileView === 'jarvis' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="lg:hidden absolute inset-x-3 top-14 bottom-14 z-20 pointer-events-auto max-w-lg mx-auto"
                  >
                    <RightFloatingWing />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── 5. Center Controls: Focus Core & Open Vault ── */}
              <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 rounded-full bg-zinc-950/85 border border-white/[0.08] backdrop-blur-xl shadow-2xl pointer-events-auto ${
                  mobileView !== 'core' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className="hidden lg:inline-block px-4 py-1.5 rounded-full text-xs font-bold text-[#B4A5FF] bg-[#7C6BF0]/20 border border-[#7C6BF0]/30 hover:bg-[#7C6BF0]/30 transition-all"
                >
                  {focusMode ? 'SHOW WINGS' : 'FOCUS CORE'}
                </button>
                <button
                  onClick={() => setActiveModal('obsidian')}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  📖 OPEN VAULT
                </button>
                <button
                  onClick={() => setMobileView('jarvis')}
                  className="lg:hidden px-4 py-1.5 rounded-full text-xs font-bold text-[#B4A5FF] bg-[#7C6BF0]/20 border border-[#7C6BF0]/30 transition-all flex items-center gap-1.5"
                >
                  🎙️ TALK TO JARVIS
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'assignments' && (
            <motion.div
              key="assignments"
              className="h-full bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AssignmentsTab />
            </motion.div>
          )}

          {activeTab === 'study' && (
            <motion.div
              key="study"
              className="h-full bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <StudyLibraryTab />
            </motion.div>
          )}

          {activeTab === 'vault' && (
            <motion.div
              key="vault"
              className="h-full bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <VaultTab />
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div
              key="models"
              className="h-full bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ModelHubTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── 5. Docked Bottom Bar: Slim Status Strip ── */}
      <footer className="hidden md:flex h-9 border-t border-white/[0.06] bg-black/90 backdrop-blur-md px-8 items-center justify-between z-30 shrink-0 select-none text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300 font-semibold">VAULT: 242 NODES</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span>6 ENROLLED COURSES</span>
          <span className="text-zinc-700">|</span>
          <span>FARMVILLE, VA</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[#9B8DF5] font-semibold">GEMINI 3.8 FLASH (PRIMARY)</span>
          <span className="text-zinc-700">|</span>
          <span>ELEVENLABS MEMORY ENGINE</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">PORT 3001</span>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <MobileBottomNav />

      {/* ── Modals & Global Floating Voice on other tabs ── */}
      <ModelRouter />
      <ObsidianDrawer />
      {activeTab !== 'command' && <JarvisOrb />}
    </div>
  );
}
