'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, FileText, ChevronRight, ChevronDown, Database } from 'lucide-react';
import { useAegisStore } from '@/lib/store';

const VAULT_TREE = [
  {
    course: 'ANTH-202', name: 'Archaeology', color: '#9B8DF5',
    files: ['overview.md', 'notes.md', 'study-guide.md', 'assignments.md'],
  },
  {
    course: 'BUSN-296', name: 'Legal Environment', color: '#60A5FA',
    files: ['overview.md', 'notes.md', 'study-guide.md', 'test1-prep.md'],
  },
  {
    course: 'BUSN-110', name: 'Business Bootcamp', color: '#4ADE80',
    files: ['overview.md', 'notes.md', 'study-guide.md'],
  },
  {
    course: 'CTZN-110', name: 'Social Entrepreneurship', color: '#C084FC',
    files: ['overview.md', 'notes.md', 'study-guide.md'],
  },
  {
    course: 'ECON-217', name: 'Microeconomics', color: '#F87171',
    files: ['overview.md', 'notes.md', 'study-guide.md'],
  },
  {
    course: 'MATH-171', name: 'Statistical Decision Making', color: '#4DD9E0',
    files: ['overview.md', 'notes.md', 'study-guide.md', 'formula-sheet.md'],
  },
];

const SAMPLE_CONTENT: Record<string, string> = {
  'BUSN-296/study-guide.md': `# BUSN-296 Test 1 Study Guide
## Legal Environment of Business

### Unit 1: Legal Foundations
- **Constitutional Law**: Commerce Clause, Due Process, Equal Protection
- **Sources of Law**: Constitutional > Statutory > Common Law > Administrative
- **Court System**: Federal vs. State jurisdiction

### Unit 2: Torts
- **Negligence**: Duty → Breach → Causation → Damages
- **Intentional Torts**: Battery, Assault, False Imprisonment, Defamation
- **Strict Liability**: Applies regardless of fault (e.g., ultrahazardous activities)

### Unit 3: Contract Law
- **Elements**: Offer + Acceptance + Consideration + Capacity + Legality
- **Breach & Remedies**: Compensatory, Consequential, Punitive, Nominal
- **UCC vs. Common Law**: UCC governs goods, Common Law governs services`,

  'ECON-217/notes.md': `# ECON-217 Lecture Notes
## Principles of Microeconomics

### Supply & Demand
- **Law of Demand**: Price ↑ → Qty Demanded ↓ (ceteris paribus)
- **Law of Supply**: Price ↑ → Qty Supplied ↑
- **Equilibrium**: Where Qd = Qs

### Elasticity
- **PED** = %ΔQd / %ΔP
  - |PED| > 1: Elastic (luxuries)
  - |PED| < 1: Inelastic (necessities)
- **Cross-Price Elasticity**: Positive = substitutes, Negative = complements

### Consumer Theory
- **Utility Maximization**: MU_x/P_x = MU_y/P_y
- **Budget Constraint**: P_x·X + P_y·Y = I`,
};

export default function ObsidianDrawer() {
  const activeModal    = useAegisStore((s) => s.activeModal);
  const setActiveModal = useAegisStore((s) => s.setActiveModal);
  const isOpen = activeModal === 'obsidian';

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>('BUSN-296/study-guide.md');

  const toggleCourse = (code: string) =>
    setExpanded((e) => ({ ...e, [code]: !e[code] }));

  const content = selected ? SAMPLE_CONTENT[selected] : null;

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
            className="fixed left-0 top-0 bottom-0 z-50 flex"
            style={{ width: '680px' }}
            initial={{ x: -680 }}
            animate={{ x: 0 }}
            exit={{ x: -680 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* File tree */}
            <div
              className="flex flex-col w-56 shrink-0 border-r"
              style={{
                background:  '#0A0A0E',
                borderColor: '#2A252030',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-3 py-3.5 border-b"
                style={{ borderColor: '#2A252030' }}
              >
                <Database size={12} style={{ color: '#4ADE80' }} />
                <span className="text-[10px] font-bold tracking-widest" style={{ color: '#4ADE80' }}>
                  OBSIDIAN VAULT
                </span>
              </div>

              {/* Tree */}
              <div className="flex-1 overflow-y-auto py-2">
                {VAULT_TREE.map((dir) => (
                  <div key={dir.course}>
                    <button
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.03] transition-colors text-left"
                      onClick={() => toggleCourse(dir.course)}
                    >
                      <div className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: dir.color }} />
                      {expanded[dir.course]
                        ? <ChevronDown size={10} style={{ color: '#3D3580' }} />
                        : <ChevronRight size={10} style={{ color: '#3D3580' }} />
                      }
                      <span className="text-[9px] font-bold tracking-wider" style={{ color: dir.color }}>
                        {dir.course}
                      </span>
                    </button>
                    {expanded[dir.course] && (
                      <div className="ml-5">
                        {dir.files.map((file) => {
                          const key = `${dir.course}/${file}`;
                          return (
                            <button
                              key={file}
                              className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-white/[0.03] transition-colors text-left"
                              style={{
                                background: selected === key ? '#7C6BF010' : 'transparent',
                                borderLeft: selected === key ? `2px solid ${dir.color}60` : '2px solid transparent',
                              }}
                              onClick={() => setSelected(key)}
                            >
                              <FileText size={9} style={{ color: '#4B3820' }} />
                              <span className="text-[9px]" style={{ color: selected === key ? '#E0E0E8' : '#3D3580' }}>
                                {file}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Markdown viewer */}
            <div
              className="flex-1 flex flex-col"
              style={{ background: '#0D0D11F0', backdropFilter: 'blur(20px)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3.5 border-b"
                style={{ borderColor: '#2A252030' }}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} style={{ color: '#4ADE80' }} />
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: '#4ADE80' }}>
                    {selected ?? 'Select a file'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-sm hover:bg-white/5"
                  style={{ color: '#3D3580' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {content ? (
                  <pre
                    className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono"
                    style={{ color: '#C8B89A' }}
                  >
                    {content}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="text-[10px] tracking-widest" style={{ color: '#4B3820' }}>
                      ◈ SELECT A FILE FROM THE VAULT TREE
                    </div>
                    <div className="text-[9px]" style={{ color: '#4B3820' }}>
                      ./vault/ — 6 courses, 18+ notes
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 border-t text-[9px] tracking-wider"
                style={{ borderColor: '#2A252030', color: '#4B3820' }}
              >
                HOTKEY [O] — TOGGLE OBSIDIAN VAULT ◈ VAULT: ./vault/
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
