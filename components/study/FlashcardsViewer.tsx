'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Shuffle, Plus, Edit2, Trash2, Check, X,
  Layers, ChevronLeft, ChevronRight, Award, Flame, BookOpen
} from 'lucide-react';
import type { StudyToolItem, FlashcardsContent, Flashcard } from '@/lib/studyTools/types';

interface Props {
  tool: StudyToolItem;
  onUpdate: (updatedTool: StudyToolItem) => void;
}

export default function FlashcardsViewer({ tool, onUpdate }: Props) {
  const content = tool.data as FlashcardsContent;
  const [cards, setCards] = useState<Flashcard[]>(content.cards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'missed' | 'box1' | 'box2' | 'box3' | 'box4' | 'box5'>('all');

  // Edit / Add Modal state
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // Active cards filtered
  const activeCards = cards.filter((c) => {
    if (filterMode === 'missed') return c.missed;
    if (filterMode.startsWith('box')) {
      const boxNum = parseInt(filterMode.replace('box', ''), 10);
      return (c.box || 1) === boxNum;
    }
    return true;
  });

  const currentCard = activeCards[currentIndex] || activeCards[0];

  // Helper to save cards to server
  const saveCardsToServer = useCallback(
    async (newCards: Flashcard[]) => {
      const masteredCount = newCards.filter((c) => (c.box || 1) >= 4).length;
      const progress = Math.round((masteredCount / (newCards.length || 1)) * 100);

      const updatedTool: StudyToolItem = {
        ...tool,
        progress,
        data: {
          ...content,
          cards: newCards,
        },
      };

      onUpdate(updatedTool);

      try {
        await fetch('/api/study-tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'progress',
            id: tool.id,
            progress,
            data: updatedTool.data,
          }),
        });
      } catch (err) {
        console.error('Failed to sync flashcard progress:', err);
      }
    },
    [tool, content, onUpdate]
  );

  // Handle marking card progress (Leitner system)
  const handleMarkCard = useCallback(
    (gotIt: boolean) => {
      if (!currentCard) return;

      const updated = cards.map((c) => {
        if (c.id === currentCard.id) {
          const currentBox = c.box || 1;
          const nextBox = gotIt ? Math.min(5, currentBox + 1) : 1; // Leitner rule: got it advances, miss resets to 1
          return {
            ...c,
            box: nextBox,
            missed: !gotIt,
            lastReviewed: new Date().toISOString(),
          };
        }
        return c;
      });

      setCards(updated);
      setIsFlipped(false);
      saveCardsToServer(updated);

      // Advance to next card smoothly
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setCurrentIndex(0);
      }
    },
    [currentCard, cards, currentIndex, activeCards.length, saveCardsToServer]
  );

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsFlipped(false);
        setCurrentIndex((i) => (i < activeCards.length - 1 ? i + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsFlipped(false);
        setCurrentIndex((i) => (i > 0 ? i - 1 : activeCards.length - 1));
      } else if (e.key === '1') {
        e.preventDefault();
        handleMarkCard(false); // Still Learning
      } else if (e.key === '2') {
        e.preventDefault();
        handleMarkCard(true); // Got It
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCards.length, handleMarkCard]);

  // Shuffle cards
  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    saveCardsToServer(shuffled);
  };

  // Reset progress
  const handleReset = () => {
    if (confirm('Reset all card progress back to Leitner Box 1?')) {
      const reset = cards.map((c) => ({ ...c, box: 1, missed: false }));
      setCards(reset);
      setCurrentIndex(0);
      setIsFlipped(false);
      saveCardsToServer(reset);
    }
  };

  // Card editor actions
  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setIsCreatingCard(false);
  };

  const openCreateModal = () => {
    setEditingCard(null);
    setEditFront('');
    setEditBack('');
    setIsCreatingCard(true);
  };

  const handleSaveCard = () => {
    if (!editFront.trim() || !editBack.trim()) return;

    let updated: Flashcard[];
    if (isCreatingCard) {
      const newCard: Flashcard = {
        id: `card-${Date.now()}`,
        front: editFront.trim(),
        back: editBack.trim(),
        box: 1,
        missed: false,
      };
      updated = [...cards, newCard];
      setCurrentIndex(updated.length - 1);
    } else if (editingCard) {
      updated = cards.map((c) =>
        c.id === editingCard.id ? { ...c, front: editFront.trim(), back: editBack.trim() } : c
      );
    } else {
      return;
    }

    setCards(updated);
    saveCardsToServer(updated);
    setEditingCard(null);
    setIsCreatingCard(false);
  };

  const handleDeleteCard = (id: string) => {
    if (cards.length <= 1) {
      alert('A deck must have at least one card.');
      return;
    }
    if (confirm('Delete this card?')) {
      const updated = cards.filter((c) => c.id !== id);
      setCards(updated);
      setCurrentIndex(0);
      saveCardsToServer(updated);
    }
  };

  // Box statistics
  const boxCounts = [1, 2, 3, 4, 5].map((b) => cards.filter((c) => (c.box || 1) === b).length);
  const missedCount = cards.filter((c) => c.missed).length;

  return (
    <div className="flex flex-col h-full select-none text-white font-sans">
      {/* ── Top Bar: Leitner Box Status & Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-white/[0.08] bg-zinc-950/60 backdrop-blur-md">
        {/* Leitner Box Indicators */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase mr-1">
            Leitner Boxes:
          </span>
          {[1, 2, 3, 4, 5].map((boxNum) => {
            const count = boxCounts[boxNum - 1];
            const isSelected = filterMode === `box${boxNum}`;
            const isCurrentCardBox = (currentCard?.box || 1) === boxNum;

            return (
              <button
                key={boxNum}
                onClick={() => {
                  setFilterMode(isSelected ? 'all' : (`box${boxNum}` as any));
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-[#7C6BF0] text-white shadow-lg shadow-[#7C6BF0]/30 font-bold'
                    : isCurrentCardBox
                    ? 'bg-[#7C6BF0]/20 text-[#B4A5FF] border border-[#7C6BF0]/50'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                }`}
                title={`Box ${boxNum}: ${count} cards`}
              >
                <span>Box {boxNum}</span>
                <span className="text-[10px] opacity-75 font-semibold">({count})</span>
              </button>
            );
          })}

          {missedCount > 0 && (
            <button
              onClick={() => {
                setFilterMode(filterMode === 'missed' ? 'all' : 'missed');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                filterMode === 'missed'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <Flame size={12} />
              <span>Review Missed ({missedCount})</span>
            </button>
          )}

          {filterMode !== 'all' && (
            <button
              onClick={() => {
                setFilterMode('all');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="text-[11px] text-zinc-400 underline hover:text-white ml-2"
            >
              Show All ({cards.length})
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            title="Randomize card order"
          >
            <Shuffle size={13} />
            <span>Shuffle</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#B4A5FF] bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 hover:bg-[#7C6BF0]/30 transition-all"
            title="Add a new card"
          >
            <Plus size={13} />
            <span>Add Card</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
            title="Reset Leitner Progress"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Main Flashcard Stage ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {activeCards.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No cards in this filter</h3>
            <p className="text-sm text-zinc-400 mb-4">Switch to All Cards to continue studying.</p>
            <button
              onClick={() => setFilterMode('all')}
              className="px-4 py-2 rounded-xl bg-[#7C6BF0] text-white text-xs font-bold uppercase tracking-wider"
            >
              Show All Cards
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* Progress counter & Card Metadata */}
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 mb-3 px-1 font-mono">
              <span className="flex items-center gap-2">
                <span className="text-[#9B8DF5] font-bold">
                  Card {currentIndex + 1} of {activeCards.length}
                </span>
                <span className="text-zinc-600">|</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px]">
                  Box {currentCard?.box || 1}
                </span>
                {currentCard?.missed && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px]">
                    Needs Practice
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(currentCard)}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.08]"
                  title="Edit Card"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDeleteCard(currentCard.id)}
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-white/[0.08]"
                  title="Delete Card"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div
              className="relative w-full cursor-pointer select-none"
              style={{ height: '360px', perspective: '1400px' }}
              onClick={() => setIsFlipped((f) => !f)}
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {/* ── Front Face (Question) ── */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-8 rounded-3xl liquid-glass-card shadow-2xl backdrop-blur-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-[#9B8DF5] uppercase">
                    <span>PROMPT / QUESTION</span>
                    <span className="text-zinc-400">CLICK OR SPACE TO FLIP</span>
                  </div>

                  <div className="my-auto text-center px-4">
                    <p className="text-xl md:text-2xl font-medium text-white leading-relaxed font-sans">
                      {currentCard?.front}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>Press Space to reveal</span>
                    <span>Use ← / → arrows to navigate</span>
                  </div>
                </div>

                {/* ── Back Face (Answer) ── */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-8 rounded-3xl liquid-glass-card border-emerald-500/30 shadow-2xl backdrop-blur-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: '0 28px 56px -14px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.28), inset 0 0 24px 0 rgba(16, 185, 129, 0.12)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-emerald-400 uppercase">
                    <span>ANSWER / EXPLANATION</span>
                    <span className="text-zinc-400">CLICK OR SPACE TO FLIP BACK</span>
                  </div>

                  <div className="my-auto text-center px-4 overflow-y-auto max-h-[220px]">
                    <p className="text-lg md:text-xl font-normal text-zinc-100 leading-relaxed font-sans whitespace-pre-wrap">
                      {currentCard?.back}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span className="text-rose-400 font-semibold">[1] Still Learning</span>
                    <span className="text-emerald-400 font-semibold">[2] Got It</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Navigation & Mastery Response Buttons ── */}
            <div className="w-full flex items-center justify-between mt-6 gap-4">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => (i > 0 ? i - 1 : activeCards.length - 1));
                }}
                className="flex items-center gap-1 px-4 py-2.5 rounded-2xl liquid-glass-pill text-sm text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleMarkCard(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider hover:bg-rose-500/25 transition-all shadow-lg shadow-rose-950/20 active:scale-95 cursor-pointer"
                >
                  <X size={15} />
                  <span>Still Learning (1)</span>
                </button>

                <button
                  onClick={() => handleMarkCard(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/25 transition-all shadow-lg shadow-emerald-950/20 active:scale-95"
                >
                  <Check size={15} />
                  <span>Got It (2)</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => (i < activeCards.length - 1 ? i + 1 : 0));
                }}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Progress Bar ── */}
      <div className="h-1.5 w-full bg-zinc-900">
        <div
          className="h-full bg-gradient-to-r from-[#7C6BF0] to-emerald-400 transition-all duration-300"
          style={{
            width: `${Math.round(
              ((activeCards.length > 0 ? currentIndex + 1 : 0) / (activeCards.length || 1)) * 100
            )}%`,
          }}
        />
      </div>

      {/* ── Edit / Add Card Modal ── */}
      <AnimatePresence>
        {(isCreatingCard || editingCard) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-2xl bg-zinc-950 border border-white/[0.12] shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white">
                  {isCreatingCard ? 'Add New Flashcard' : 'Edit Flashcard'}
                </h3>
                <button
                  onClick={() => {
                    setEditingCard(null);
                    setIsCreatingCard(false);
                  }}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">
                    Front (Question or Prompt)
                  </label>
                  <textarea
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    rows={3}
                    placeholder="Enter front prompt..."
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#7C6BF0] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">
                    Back (Answer & Explanation)
                  </label>
                  <textarea
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    rows={4}
                    placeholder="Enter answer explanation..."
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#7C6BF0] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditingCard(null);
                    setIsCreatingCard(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCard}
                  className="px-5 py-2 rounded-xl bg-[#7C6BF0] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#7C6BF0]/30 hover:bg-[#6b58e6]"
                >
                  Save Card
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
