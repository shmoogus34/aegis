'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, CheckCircle2, XCircle, RotateCcw,
  Sparkles, Award, Flame, ChevronRight, ChevronLeft,
  Lightbulb, Check, X, Send, Edit2, Loader2
} from 'lucide-react';
import type { StudyToolItem, QuizContent, QuizQuestion } from '@/lib/studyTools/types';

interface Props {
  tool: StudyToolItem;
  onUpdate: (updatedTool: StudyToolItem) => void;
}

export default function QuizViewer({ tool, onUpdate }: Props) {
  const content = tool.data as QuizContent;
  const [questions, setQuestions] = useState<QuizQuestion[]>(content.questions || []);
  const [currentIndex, setCurrentIndex] = useState(content.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>(
    content.userAnswers || {}
  );
  const [gradedShortAnswers, setGradedShortAnswers] = useState<
    Record<string, { grade: boolean; reason: string }>
  >(content.gradedShortAnswers || {});

  // Short answer input state
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [isGradingShortAnswer, setIsGradingShortAnswer] = useState(false);

  // Quiz state
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [retakeFilter, setRetakeFilter] = useState<string[] | null>(null);

  // Active question list (either all or retake missed)
  const activeQuestions = retakeFilter
    ? questions.filter((q) => retakeFilter.includes(q.id))
    : questions;

  const currentQ = activeQuestions[currentIndex] || activeQuestions[0];
  const isAnswered = currentQ ? userAnswers[currentQ.id] !== undefined : false;

  // Auto-save quiz progress to server
  const saveQuizState = useCallback(
    async (
      newAnswers: Record<string, string | number>,
      newGraded: Record<string, { grade: boolean; reason: string }>,
      newIndex: number
    ) => {
      // Calculate progress
      const answeredCount = Object.keys(newAnswers).length;
      const progress = Math.round((answeredCount / (questions.length || 1)) * 100);

      const updatedTool: StudyToolItem = {
        ...tool,
        progress,
        data: {
          ...content,
          questions,
          userAnswers: newAnswers,
          gradedShortAnswers: newGraded,
          currentQuestionIndex: newIndex,
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
        console.error('Failed to sync quiz progress:', err);
      }
    },
    [tool, content, questions, onUpdate]
  );

  // Check if answer is correct
  const checkIsCorrect = useCallback(
    (q: QuizQuestion, ans: string | number | undefined): boolean => {
      if (ans === undefined) return false;
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        return Number(ans) === Number(q.correctAnswer);
      }
      if (q.type === 'short_answer') {
        return gradedShortAnswers[q.id]?.grade ?? false;
      }
      return false;
    },
    [gradedShortAnswers]
  );

  // Select Multiple Choice / True-False option
  const handleSelectOption = (optionIndex: number) => {
    if (!currentQ || isAnswered) return;

    const newAnswers = { ...userAnswers, [currentQ.id]: optionIndex };
    setUserAnswers(newAnswers);

    const isCorrect = Number(optionIndex) === Number(currentQ.correctAnswer);
    if (isCorrect) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    saveQuizState(newAnswers, gradedShortAnswers, currentIndex);
  };

  // Submit Short Answer for AI Grading
  const handleSubmitShortAnswer = async () => {
    if (!currentQ || !shortAnswerInput.trim() || isAnswered) return;

    setIsGradingShortAnswer(true);
    const submittedText = shortAnswerInput.trim();

    try {
      const res = await fetch('/api/study-tools/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          canonicalAnswer: currentQ.correctAnswer,
          studentAnswer: submittedText,
        }),
      });

      const result = await res.json();
      const gradeResult = {
        grade: Boolean(result.correct),
        reason: result.reason || 'Answer evaluated by AI.',
      };

      const newAnswers = { ...userAnswers, [currentQ.id]: submittedText };
      const newGraded = { ...gradedShortAnswers, [currentQ.id]: gradeResult };

      setUserAnswers(newAnswers);
      setGradedShortAnswers(newGraded);

      if (gradeResult.grade) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }

      saveQuizState(newAnswers, newGraded, currentIndex);
    } catch (err) {
      console.error('AI grading failed:', err);
    } finally {
      setIsGradingShortAnswer(false);
    }
  };

  // Manual Override for Short Answer
  const handleOverrideGrade = (questionId: string) => {
    const current = gradedShortAnswers[questionId];
    if (!current) return;

    const toggled = {
      grade: !current.grade,
      reason: current.grade ? 'Overridden to Incorrect by user' : 'Overridden to Correct by user',
    };

    const newGraded = { ...gradedShortAnswers, [questionId]: toggled };
    setGradedShortAnswers(newGraded);
    saveQuizState(userAnswers, newGraded, currentIndex);
  };

  // Keyboard navigation shortcuts (1, 2, 3, 4 for options)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (!isAnswered && (currentQ?.type === 'multiple_choice' || currentQ?.type === 'true_false')) {
        if (e.key === '1') handleSelectOption(0);
        if (e.key === '2') handleSelectOption(1);
        if (e.key === '3' && currentQ.options && currentQ.options.length > 2) handleSelectOption(2);
        if (e.key === '4' && currentQ.options && currentQ.options.length > 3) handleSelectOption(3);
      }

      if (e.key === 'ArrowRight' && isAnswered) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, currentQ, currentIndex]);

  // Advance to next or finish
  const handleNext = () => {
    setShowHint(false);
    setShortAnswerInput('');
    if (currentIndex < activeQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveQuizState(userAnswers, gradedShortAnswers, nextIdx);
    } else {
      setIsCompleted(true);
    }
  };

  // Retake Missed Only
  const handleRetakeMissed = () => {
    const missedIds = questions
      .filter((q) => !checkIsCorrect(q, userAnswers[q.id]))
      .map((q) => q.id);

    if (missedIds.length === 0) {
      alert('You got every question right! Great job.');
      return;
    }

    const resetAnswers = { ...userAnswers };
    const resetGraded = { ...gradedShortAnswers };
    missedIds.forEach((id) => {
      delete resetAnswers[id];
      delete resetGraded[id];
    });

    setRetakeFilter(missedIds);
    setUserAnswers(resetAnswers);
    setGradedShortAnswers(resetGraded);
    setCurrentIndex(0);
    setIsCompleted(false);
    saveQuizState(resetAnswers, resetGraded, 0);
  };

  // Restart Entire Quiz
  const handleRestartFull = () => {
    setUserAnswers({});
    setGradedShortAnswers({});
    setCurrentIndex(0);
    setRetakeFilter(null);
    setIsCompleted(false);
    setStreak(0);
    saveQuizState({}, {}, 0);
  };

  // Score calculations
  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => checkIsCorrect(q, userAnswers[q.id])).length;
  const scorePercent = Math.round((correctCount / (totalQuestions || 1)) * 100);

  const getLetterGrade = (pct: number) => {
    if (pct >= 93) return { grade: 'A', color: 'text-emerald-400' };
    if (pct >= 90) return { grade: 'A-', color: 'text-emerald-400' };
    if (pct >= 87) return { grade: 'B+', color: 'text-blue-400' };
    if (pct >= 83) return { grade: 'B', color: 'text-blue-400' };
    if (pct >= 80) return { grade: 'B-', color: 'text-blue-400' };
    if (pct >= 70) return { grade: 'C', color: 'text-amber-400' };
    return { grade: 'Needs Review', color: 'text-rose-400' };
  };

  return (
    <div className="flex flex-col h-full select-none text-white font-sans">
      {/* ── Top Bar: Quiz Status & Streak ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.08] bg-zinc-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[#9B8DF5] uppercase tracking-wider">
            {retakeFilter ? 'RETAKING MISSED' : 'PRACTICE QUIZ'}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs font-mono text-zinc-400">
            Question {currentIndex + 1} of {activeQuestions.length}
          </span>
        </div>

        {/* Streak Counter */}
        <div className="flex items-center gap-4">
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold"
            >
              <Flame size={14} className="text-amber-400 animate-pulse" />
              <span>{streak} Streak!</span>
            </motion.div>
          )}

          <div className="text-xs font-mono text-zinc-400">
            Score: <span className="text-emerald-400 font-bold">{correctCount}</span> / {totalQuestions}
          </div>
        </div>
      </div>

      {/* ── Main Stage Area ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center">
        {isCompleted ? (
          /* ── Results Summary Screen ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl p-8 rounded-3xl liquid-glass-card shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 flex items-center justify-center text-[#B4A5FF] mb-4 shadow-[0_0_20px_rgba(124,107,240,0.3)]">
              <Award size={36} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Quiz Completed!</h2>
            <p className="text-sm text-zinc-400 mb-6 font-mono">
              Here is your performance breakdown for {tool.title}
            </p>

            {/* Score Showcase */}
            <div className="flex items-center justify-center gap-8 mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] w-full">
              <div>
                <div className="text-4xl font-extrabold text-white font-mono">{scorePercent}%</div>
                <div className="text-xs font-mono text-zinc-400 mt-1 uppercase">Accuracy</div>
              </div>
              <div className="h-10 w-[1px] bg-white/[0.1]" />
              <div>
                <div className={`text-4xl font-extrabold font-mono ${getLetterGrade(scorePercent).color}`}>
                  {getLetterGrade(scorePercent).grade}
                </div>
                <div className="text-xs font-mono text-zinc-400 mt-1 uppercase">Rating</div>
              </div>
              <div className="h-10 w-[1px] bg-white/[0.1]" />
              <div>
                <div className="text-4xl font-extrabold text-emerald-400 font-mono">
                  {correctCount}/{totalQuestions}
                </div>
                <div className="text-xs font-mono text-zinc-400 mt-1 uppercase">Correct</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              {correctCount < totalQuestions && (
                <button
                  onClick={handleRetakeMissed}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Retake Missed Only ({totalQuestions - correctCount})</span>
                </button>
              )}

              <button
                onClick={handleRestartFull}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-btn text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restart All</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── Active Question Screen ── */
          <div className="w-full max-w-2xl flex flex-col gap-6">
            {/* Question Card */}
            <div className="p-8 rounded-3xl liquid-glass-card shadow-2xl backdrop-blur-2xl">
              {/* Question Badge & Type */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-4">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] uppercase text-[#9B8DF5]">
                  {currentQ?.type.replace('_', ' ')}
                </span>
                {currentQ?.hint && !isAnswered && (
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Lightbulb size={13} />
                    <span>{showHint ? 'Hide Hint' : 'Need a hint?'}</span>
                  </button>
                )}
              </div>

              {/* Hint Card */}
              {showHint && currentQ?.hint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs mb-4 flex items-start gap-2"
                >
                  <Lightbulb size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>{currentQ.hint}</span>
                </motion.div>
              )}

              {/* Question Text */}
              <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed mb-6 font-sans">
                {currentQ?.question}
              </h3>

              {/* ── Multiple Choice & True/False Options ── */}
              {(currentQ?.type === 'multiple_choice' || currentQ?.type === 'true_false') && (
                <div className="flex flex-col gap-3">
                  {currentQ?.options?.map((opt, oIdx) => {
                    const isSelected = userAnswers[currentQ.id] === oIdx;
                    const isCorrectAnswer = Number(currentQ.correctAnswer) === oIdx;

                    let btnStyle =
                      'liquid-glass-pill text-zinc-200 hover:text-white cursor-pointer';

                    if (isAnswered) {
                      if (isCorrectAnswer) {
                        btnStyle =
                          'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 shadow-lg shadow-emerald-950/30';
                      } else if (isSelected && !isCorrectAnswer) {
                        btnStyle =
                          'bg-rose-500/20 border-rose-500/60 text-rose-200 shadow-lg shadow-rose-950/30';
                      } else {
                        btnStyle = 'opacity-40 bg-transparent border-white/[0.04] text-zinc-500';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(oIdx)}
                        className={`flex items-center justify-between p-4 rounded-2xl border text-left text-sm md:text-base transition-all font-sans ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                            {oIdx + 1}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isAnswered && isCorrectAnswer && (
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                        )}
                        {isAnswered && isSelected && !isCorrectAnswer && (
                          <XCircle size={18} className="text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Short Answer Input Stage ── */}
              {currentQ?.type === 'short_answer' && (
                <div className="flex flex-col gap-4">
                  {!isAnswered ? (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={shortAnswerInput}
                        onChange={(e) => setShortAnswerInput(e.target.value)}
                        placeholder="Type your answer here in your own words..."
                        rows={3}
                        className="w-full p-4 rounded-2xl liquid-glass-input text-sm md:text-base text-white focus:outline-none resize-none"
                      />
                      <button
                        onClick={handleSubmitShortAnswer}
                        disabled={!shortAnswerInput.trim() || isGradingShortAnswer}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-btn text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isGradingShortAnswer ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>AI Evaluating Answer...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Submit for AI Evaluation</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <div className="text-xs font-mono text-zinc-400 uppercase mb-1">
                          Your Answer:
                        </div>
                        <div className="text-sm text-zinc-200">{userAnswers[currentQ.id]}</div>
                      </div>

                      {/* AI Evaluation result */}
                      <div
                        className={`p-4 rounded-xl border flex flex-col gap-2 ${
                          gradedShortAnswers[currentQ.id]?.grade
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                            {gradedShortAnswers[currentQ.id]?.grade ? (
                              <>
                                <Check size={14} className="text-emerald-400" />
                                <span>Correct Answer</span>
                              </>
                            ) : (
                              <>
                                <X size={14} className="text-rose-400" />
                                <span>Needs Work</span>
                              </>
                            )}
                          </span>

                          <button
                            onClick={() => handleOverrideGrade(currentQ.id)}
                            className="text-[11px] underline opacity-80 hover:opacity-100"
                          >
                            Override: Mark as {gradedShortAnswers[currentQ.id]?.grade ? 'Incorrect' : 'Correct'}
                          </button>
                        </div>
                        <p className="text-xs opacity-90">{gradedShortAnswers[currentQ.id]?.reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Explanation Drawer (Appears after answering) ── */}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col gap-2"
                >
                  <div className="text-xs font-mono font-bold text-[#B4A5FF] uppercase tracking-wider">
                    Explanation
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                    {currentQ?.explanation}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Next Question Control */}
            {isAnswered && (
              <div className="flex items-center justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C6BF0] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#7C6BF0]/30 hover:bg-[#6b58e6] transition-all"
                >
                  <span>
                    {currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'View Results'}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Progress Bar ── */}
      <div className="h-1.5 w-full bg-zinc-900">
        <div
          className="h-full bg-gradient-to-r from-[#7C6BF0] to-emerald-400 transition-all duration-300"
          style={{
            width: `${Math.round(
              ((Object.keys(userAnswers).length || 0) / (questions.length || 1)) * 100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}
