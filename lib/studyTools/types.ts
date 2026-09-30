// lib/studyTools/types.ts — Shared Types and Schemas for All A.E.G.I.S. Study Tools

export type StudyToolType = 'flashcards' | 'quiz' | 'guide' | 'plan';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  box: number; // 1 to 5 (Leitner spaced repetition box)
  lastReviewed?: string;
  missed?: boolean;
}

export interface FlashcardsContent {
  topic: string;
  cards: Flashcard[];
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice & true_false
  correctAnswer: string | number; // index (number) for MC, boolean string for TF, or canonical answer string
  explanation: string;
  hint?: string;
}

export interface QuizAttempt {
  id: string;
  timestamp: string;
  score: number;
  total: number;
  percentage: number;
}

export interface QuizContent {
  title: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string | number>;
  gradedShortAnswers: Record<string, { grade: boolean; reason: string }>;
  attempts: QuizAttempt[];
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface WorkedExample {
  problem: string;
  solution: string;
  keyTakeaway: string;
}

export interface StudyGuideSection {
  id: string;
  title: string;
  keyIdeas: string[];
  terms: KeyTerm[];
  workedExamples?: WorkedExample[];
}

export interface StudyGuideContent {
  title: string;
  courseCode?: string;
  sections: StudyGuideSection[];
}

export interface StudySessionItem {
  id: string;
  text: string;
  completed: boolean;
  assignmentId?: string;
  dueAt?: string;
  courseCode?: string;
}

export interface DailyStudySession {
  date: string; // e.g. "Wednesday, Oct 1"
  dayOfWeek: string;
  focus: string;
  estimatedMinutes: number;
  items: StudySessionItem[];
}

export interface StudyPlanContent {
  title: string;
  startDate: string;
  endDate: string;
  sessions: DailyStudySession[];
}

export interface StudyToolItem {
  id: string;
  type: StudyToolType;
  title: string;
  courseCode: string;
  courseName?: string;
  sourceType: 'topic' | 'notes' | 'file' | 'canvas' | 'chat' | 'vault';
  sourceDetails?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  progress: number; // 0 to 100 percentage
  modelUsed: string;
  providerUsed: string;
  data: FlashcardsContent | QuizContent | StudyGuideContent | StudyPlanContent;
}
