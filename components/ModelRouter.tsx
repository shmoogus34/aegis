'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import { ALL_MODELS } from '@/lib/openRouter';

export default function ModelRouter() {
  const activeModal    = useAegisStore((s) => s.activeModal);
  const setActiveModal = useAegisStore((s) => s.setActiveModal);
  const preferredProvider = useAegisStore((s) => s.preferredProvider);
  const setPreferredProvider = useAegisStore((s) => s.setPreferredProvider);

  const isOpen = activeModal === 'model-router';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: '#00000075' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width:      '500px',
              background: '#0D0D11F5',
              borderLeft: '1px solid #7C6BF030',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#7C6BF020' }}
            >
              <div className="flex items-center gap-3">
                <Cpu size={16} style={{ color: '#9B8DF5' }} />
                <div>
                  <div className="text-sm font-bold tracking-[0.2em]" style={{ color: '#9B8DF5' }}>
                    INFERENCE ROUTER
                  </div>
                  <div className="text-[9px] tracking-wider" style={{ color: '#3D3580' }}>
                    OPENROUTER (1B POOL) + NVIDIA NIM CLUSTER
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-sm hover:bg-white/5 transition-colors"
                style={{ color: '#3D3580' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Dual Pool Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-3 rounded-sm text-center"
                  style={{ background: '#7C6BF008', border: '1px solid #7C6BF030' }}
                >
                  <div className="text-xl font-bold text-glow" style={{ color: '#9B8DF5' }}>
                    1,000,000,000
                  </div>
                  <div className="text-[8px] tracking-[0.2em] mt-0.5" style={{ color: '#3D3580' }}>
                    OPENROUTER POOL
                  </div>
                </div>
                <div
                  className="p-3 rounded-sm text-center"
                  style={{ background: '#76B90008', border: '1px solid #76B90030' }}
                >
                  <div className="text-xl font-bold" style={{ color: '#76B900' }}>
                    NVIDIA NIM
                  </div>
                  <div className="text-[8px] tracking-[0.2em] mt-0.5" style={{ color: '#3D3580' }}>
                    DGX HIGH-PERF CLUSTER
                  </div>
                </div>
              </div>

              {/* Provider Selector */}
              <div>
                <div className="text-[9px] tracking-[0.25em] mb-2 font-bold" style={{ color: '#3D3580' }}>
                  ▸ INFERENCE PROVIDER PREFERENCE
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['auto', 'openrouter', 'nvidia'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreferredProvider(p)}
                      className="py-1.5 px-2 rounded-sm text-[9px] font-bold tracking-wider uppercase transition-all"
                      style={{
                        background: preferredProvider === p ? '#7C6BF025' : '#070709',
                        border: `1px solid ${preferredProvider === p ? '#7C6BF060' : '#2A252030'}`,
                        color: preferredProvider === p ? '#B4A5FF' : '#8A8A9A',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Routing Table */}
              <div>
                <div className="text-[9px] tracking-[0.25em] mb-2.5 font-bold" style={{ color: '#3D3580' }}>
                  ▸ DOMAIN ROUTING TABLE ({ALL_MODELS.length} MODELS)
                </div>
                <div className="flex flex-col gap-2">
                  {ALL_MODELS.map((route, i) => (
                    <motion.div
                      key={route.model}
                      className="p-3 rounded-sm"
                      style={{
                        background: `${route.color}08`,
                        border:     `1px solid ${route.color}25`,
                      }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-bold tracking-wider" style={{ color: route.color }}>
                          {route.modelDisplay}
                        </div>
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded-sm uppercase font-bold"
                          style={{
                            background: route.provider === 'nvidia' ? '#76B90020' : '#7C6BF020',
                            color: route.provider === 'nvidia' ? '#76B900' : '#9B8DF5',
                            border: `1px solid ${route.provider === 'nvidia' ? '#76B90040' : '#7C6BF040'}`,
                          }}
                        >
                          {route.provider}
                        </span>
                      </div>
                      <div className="text-[9px] text-stone-400 mb-1.5 leading-snug">
                        {route.reason}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {route.courses.map((c) => (
                          <span
                            key={c}
                            className="text-[8px] px-1.5 py-px rounded-sm"
                            style={{ background: `${route.color}15`, color: route.color, border: `1px solid ${route.color}25` }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Fallback chain */}
              <div>
                <div className="text-[9px] tracking-[0.25em] mb-1.5 font-bold" style={{ color: '#3D3580' }}>
                  ▸ FAILOVER PIPELINE
                </div>
                <div
                  className="p-2.5 rounded-sm text-[9px] leading-relaxed font-mono"
                  style={{ background: '#050507', border: '1px solid #2A252020', color: '#8A8A9A' }}
                >
                  <div>1. Primary Route → <span className="text-emerald-400">SUCCESS</span></div>
                  <div>2. Primary Rate Limit / Timeout → <span className="text-[#9B8DF5]">Automatic Provider Switch</span></div>
                  <div>3. OpenRouter ↔ NVIDIA NIM Cross-Failover → <span className="text-sky-400">Zero Downtime</span></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t text-[9px] tracking-wider"
              style={{ borderColor: '#7C6BF020', color: '#4B3820' }}
            >
              HOTKEY [M] — TOGGLE DRAWER ◈ KEYS: 2 CONNECTED
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
