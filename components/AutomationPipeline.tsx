'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Workflow, ArrowRight, CheckCircle } from 'lucide-react';
import { useAegisStore } from '@/lib/store';

const PIPELINE_STEPS = [
  {
    id: '1',
    label: 'Canvas MCP Pull',
    sub:   'Fetch assignments, rubrics, announcements via REST API',
    color: '#4DD9E0',
    icon:  '⬇',
  },
  {
    id: '2',
    label: 'Extract Rubric',
    sub:   'Parse assignment description → structured rubric JSON via Claude Sonnet',
    color: '#9B8DF5',
    icon:  '⬡',
  },
  {
    id: '3',
    label: 'Draft Notes in Obsidian',
    sub:   'Write structured lecture notes + study guide to ./vault/[COURSE]/',
    color: '#4ADE80',
    icon:  '✎',
  },
  {
    id: '4',
    label: 'Create Calendar Block',
    sub:   'Add study prep event to Apple Calendar 48h before due date',
    color: '#C084FC',
    icon:  '◷',
  },
];

export default function AutomationPipeline() {
  const activeModal    = useAegisStore((s) => s.activeModal);
  const setActiveModal = useAegisStore((s) => s.setActiveModal);
  const isOpen = activeModal === 'automation';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: '#00000070' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          />

          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px]"
            style={{
              background:     '#0D0D11F8',
              border:         '1px solid #7C6BF030',
              backdropFilter: 'blur(20px)',
              borderRadius:   '2px',
            }}
            initial={{ opacity: 0, scale: 0.95, y: '-48%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-48%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#7C6BF020' }}
            >
              <div className="flex items-center gap-3">
                <Workflow size={16} style={{ color: '#C084FC' }} />
                <div>
                  <div className="text-sm font-bold tracking-[0.2em]" style={{ color: '#C084FC' }}>
                    AUTOMATION PIPELINE
                  </div>
                  <div className="text-[9px] tracking-wider mt-0.5" style={{ color: '#3D3580' }}>
                    CANVAS → OBSIDIAN → APPLE CALENDAR
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-sm hover:bg-white/5"
                style={{ color: '#3D3580' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Pipeline visualization */}
            <div className="p-6">
              <div className="flex flex-col gap-2">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.id}>
                    <motion.div
                      className="flex items-start gap-4 p-4 rounded-sm"
                      style={{
                        background: `${step.color}08`,
                        border:     `1px solid ${step.color}25`,
                      }}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {/* Step number + icon */}
                      <div
                        className="w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${step.color}20`, color: step.color, border: `1px solid ${step.color}40` }}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] font-bold tracking-widest" style={{ color: step.color }}>
                            STEP {step.id}: {step.label.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: '#3D3580' }}>
                          {step.sub}
                        </div>
                      </div>
                      <CheckCircle size={14} style={{ color: `${step.color}40` }} className="shrink-0 mt-0.5" />
                    </motion.div>

                    {/* Connector arrow */}
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="flex items-center justify-center py-1">
                        <motion.div
                          animate={{ y: [0, 2, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight
                            size={14}
                            className="rotate-90"
                            style={{ color: PIPELINE_STEPS[i + 1].color, opacity: 0.5 }}
                          />
                        </motion.div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Trigger info */}
              <div
                className="mt-4 p-3 rounded-sm text-[10px] leading-loose"
                style={{ background: '#050507', border: '1px solid #2A252015', color: '#3D3580' }}
              >
                <span style={{ color: '#C084FC' }}>TRIGGER:</span> Assignment detected with due_at within 72h<br />
                <span style={{ color: '#C084FC' }}>CADENCE:</span> Runs automatically every 30 minutes<br />
                <span style={{ color: '#C084FC' }}>MODELS:</span> Claude Sonnet 4.5 (extraction) + Gemini Flash (notes)
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t text-[9px] tracking-wider"
              style={{ borderColor: '#7C6BF020', color: '#4B3820' }}
            >
              HOTKEY [A] — TOGGLE MODAL ◈ PIPELINE STATUS: STANDBY
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
