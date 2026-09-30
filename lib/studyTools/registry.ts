// lib/studyTools/registry.ts — Study Tool Registry with Schemas, Prompts, and Normalizers

import type {
  StudyToolType,
  FlashcardsContent,
  QuizContent,
  StudyGuideContent,
  StudyPlanContent,
} from './types';

export interface GenerationParams {
  topic?: string;
  sourceText?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  courseCode?: string;
  courseName?: string;
  questionFormat?: 'mixed' | 'multiple_choice' | 'true_false' | 'short_answer';
  customInstructions?: string;
  previousQuestions?: string[];
  assignments?: Array<{ name: string; courseCode: string; dueAt: string | null; points?: number | null }>;
}

export interface ToolDefinition<T = any> {
  id: StudyToolType;
  label: string;
  iconName: string;
  description: string;
  defaultCount: number;
  buildPrompt: (params: GenerationParams) => string;
  validateAndNormalize: (parsed: any, params: GenerationParams) => T;
}

export const STUDY_TOOL_REGISTRY: Record<StudyToolType, ToolDefinition> = {
  flashcards: {
    id: 'flashcards',
    label: 'Flashcards',
    iconName: 'Layers',
    description: '3D interactive cards with Leitner spaced repetition and keyboard navigation',
    defaultCount: 10,
    buildPrompt: ({ topic, sourceText, count = 10, difficulty = 'medium', courseCode, customInstructions, previousQuestions }) => `
You are generating rigorous, high-yield study flashcards for ${courseCode || 'course study'}.
Topic / Material: ${topic || 'Key course concepts'}
Difficulty: ${difficulty}
Requested count: ${count}
${customInstructions ? `Specific Student Request / Instructions:\n${customInstructions}\n` : ''}
${previousQuestions && previousQuestions.length > 0 ? `
CRITICAL ANTI-REPETITION MANDATE:
The student has already practiced the following flashcard prompts in past decks:
${previousQuestions.slice(-25).map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}

DO NOT repeat or duplicate ANY of the questions above. Generate completely fresh flashcards exploring different concepts, edge cases, formulas, applications, or examples.
` : ''}
${sourceText ? `Reference Material / Notes:\n"""\n${sourceText.slice(0, 6000)}\n"""\n` : ''}

You MUST return ONLY valid JSON matching this schema:
{
  "topic": "${topic || 'Course Review'}",
  "cards": [
    {
      "front": "Specific question or key concept prompt",
      "back": "Clear, direct, high-yield explanation with concrete example if applicable"
    }
  ]
}

Formatting rules:
- Return plain text inside strings. Never use asterisks, headers, or bullet symbols inside front or back text.
- Do NOT wrap in markdown formatting unless necessary. Return strict parseable JSON.
- Provide exactly ${count} cards.
`,
    validateAndNormalize: (parsed: any, params: GenerationParams): FlashcardsContent => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON: expected an object');
      const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];
      if (rawCards.length === 0) throw new Error('Schema validation error: "cards" array is empty');

      const cards = rawCards.map((c: any, idx: number) => ({
        id: `card-${Date.now()}-${idx + 1}`,
        front: String(c.front || c.question || `Card ${idx + 1}`).trim(),
        back: String(c.back || c.answer || 'No answer provided').trim(),
        box: 1, // Start in Leitner box 1
        missed: false,
      }));

      return {
        topic: String(parsed.topic || params.topic || 'Flashcard Deck').trim(),
        cards,
      };
    },
  },

  quiz: {
    id: 'quiz',
    label: 'Practice Quiz',
    iconName: 'HelpCircle',
    description: 'Multiple choice, true/false, and short answer questions with instant explanation',
    defaultCount: 8,
    buildPrompt: ({ topic, sourceText, count = 8, difficulty = 'medium', courseCode, questionFormat = 'mixed', customInstructions, previousQuestions }) => `
You are generating an interactive practice exam for ${courseCode || 'course study'}.
Topic / Material: ${topic || 'Core exam material'}
Difficulty: ${difficulty}
Requested Question Count: ${count}
Question Format Constraint: ${
  questionFormat === 'multiple_choice'
    ? 'ALL questions MUST be "multiple_choice" with exactly 4 options. Do NOT include true/false or short-answer.'
    : questionFormat === 'true_false'
    ? 'ALL questions MUST be "true_false" with options ["True", "False"].'
    : questionFormat === 'short_answer'
    ? 'ALL questions MUST be "short_answer". Do NOT provide options.'
    : 'Mix mostly multiple-choice questions (4 options), with 1-2 true/false, and 1-2 short-answer questions.'
}
${customInstructions ? `Specific Student Request / Focus Areas:\n${customInstructions}\nStrictly adhere to this request.` : ''}
${previousQuestions && previousQuestions.length > 0 ? `
CRITICAL ANTI-REPETITION MANDATE:
The student has already taken quizzes with the following questions in past tests:
${previousQuestions.slice(-25).map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}

DO NOT repeat, duplicate, or re-ask ANY of the questions above. Generate completely fresh questions testing different nuances, calculations, definitions, or applied problems from the course material.
` : ''}
${sourceText ? `Reference Material / Course Notes:\n"""\n${sourceText.slice(0, 6000)}\n"""\n` : ''}

You MUST return ONLY valid JSON matching this schema:
{
  "title": "${topic || 'Practice Quiz'}",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Clear explanation of why this answer is right and why distractors fail",
      "hint": "Subtle hint pointing toward the principle"
    },
    {
      "type": "true_false",
      "question": "Statement text here",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "Why this statement is true or false",
      "hint": "Consider the core exception"
    },
    {
      "type": "short_answer",
      "question": "Direct quantitative or conceptual question",
      "correctAnswer": "Canonical reference answer phrase or value",
      "explanation": "Full explanation of the correct solution",
      "hint": "Think of the definition"
    }
  ]
}

Rules:
- For multiple_choice and true_false, "correctAnswer" is the 0-based index of the correct item in "options".
- Return plain text in strings. No asterisks or headers.
- Return strict parseable JSON.
`,
    validateAndNormalize: (parsed: any, params: GenerationParams): QuizContent => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON: expected an object');
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (rawQuestions.length === 0) throw new Error('Schema validation error: "questions" array is empty');

      const questions = rawQuestions.map((q: any, idx: number) => {
        const type = (q.type === 'true_false' || q.type === 'short_answer') ? q.type : 'multiple_choice';
        let options = Array.isArray(q.options) ? q.options.map(String) : [];
        if (type === 'true_false' && options.length === 0) {
          options = ['True', 'False'];
        }
        if (type === 'multiple_choice' && options.length < 2) {
          options = ['Option A', 'Option B', 'Option C', 'Option D'];
        }

        let correctAnswer: string | number = q.correctAnswer ?? 0;
        if (type !== 'short_answer') {
          const num = Number(correctAnswer);
          correctAnswer = isNaN(num) ? 0 : Math.max(0, Math.min(options.length - 1, num));
        } else {
          correctAnswer = String(correctAnswer || '').trim();
        }

        return {
          id: `q-${Date.now()}-${idx + 1}`,
          type,
          question: String(q.question || `Question ${idx + 1}`).trim(),
          options: type === 'short_answer' ? undefined : options,
          correctAnswer,
          explanation: String(q.explanation || 'No explanation provided.').trim(),
          hint: q.hint ? String(q.hint).trim() : undefined,
        };
      });

      return {
        title: String(parsed.title || params.topic || 'Practice Quiz').trim(),
        questions,
        currentQuestionIndex: 0,
        userAnswers: {},
        gradedShortAnswers: {},
        attempts: [],
      };
    },
  },

  guide: {
    id: 'guide',
    label: 'Study Guide',
    iconName: 'BookOpen',
    description: 'Structured sections with key ideas, term definitions, and worked examples',
    defaultCount: 3,
    buildPrompt: ({ topic, sourceText, courseCode }) => `
You are generating a comprehensive, beautifully structured study guide for ${courseCode || 'course study'}.
Topic: ${topic || 'Course Study Guide'}
${sourceText ? `Reference Material / Notes:\n"""\n${sourceText.slice(0, 6000)}\n"""\n` : ''}

You MUST return ONLY valid JSON matching this schema:
{
  "title": "${topic || 'Study Guide'}",
  "courseCode": "${courseCode || ''}",
  "sections": [
    {
      "id": "sec-1",
      "title": "Section Title (e.g. Market Equilibrium & Price Elasticity)",
      "keyIdeas": [
        "First key takeaway or fundamental rule in simple language",
        "Second practical mechanism or exam trap"
      ],
      "terms": [
        {
          "term": "Key Vocabulary Term",
          "definition": "Clear, concise definition without fluff"
        }
      ],
      "workedExamples": [
        {
          "problem": "Concrete exam problem or scenario fact pattern",
          "solution": "Step-by-step resolution showing calculation or legal rule application",
          "keyTakeaway": "What this demonstrates for upcoming exams"
        }
      ]
    }
  ]
}

Rules:
- Provide 3 to 4 comprehensive sections.
- Return plain text in strings. No markdown asterisks or pound signs.
- Return strict parseable JSON.
`,
    validateAndNormalize: (parsed: any, params: GenerationParams): StudyGuideContent => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON: expected an object');
      const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
      if (rawSections.length === 0) throw new Error('Schema validation error: "sections" array is empty');

      const sections = rawSections.map((s: any, idx: number) => ({
        id: `sec-${Date.now()}-${idx + 1}`,
        title: String(s.title || `Section ${idx + 1}`).trim(),
        keyIdeas: Array.isArray(s.keyIdeas) ? s.keyIdeas.map(String).map((k: string) => k.trim()) : [],
        terms: Array.isArray(s.terms)
          ? s.terms.map((t: any) => ({
              term: String(t.term || '').trim(),
              definition: String(t.definition || '').trim(),
            }))
          : [],
        workedExamples: Array.isArray(s.workedExamples)
          ? s.workedExamples.map((w: any) => ({
              problem: String(w.problem || '').trim(),
              solution: String(w.solution || '').trim(),
              keyTakeaway: String(w.keyTakeaway || '').trim(),
            }))
          : [],
      }));

      return {
        title: String(parsed.title || params.topic || 'Comprehensive Study Guide').trim(),
        courseCode: params.courseCode,
        sections,
      };
    },
  },

  plan: {
    id: 'plan',
    label: 'Study Plan',
    iconName: 'CalendarCheck',
    description: 'Actionable daily study schedule mapped to upcoming Canvas deliverables',
    defaultCount: 5,
    buildPrompt: ({ topic, assignments = [], courseCode }) => `
You are generating an optimized academic study plan schedule for upcoming Longwood University coursework.
Focus Course / Goal: ${courseCode || topic || 'Upcoming Deliverables'}
Current System Date: Wednesday, September 30, 2026

Upcoming Deliverables from Canvas:
${assignments.map((a) => `- [${a.courseCode}] ${a.name} — Due: ${a.dueAt || 'Upcoming'}`).join('\n')}

Organize the student's study time across the next 5 to 7 days leading up to these deadlines. Break work into realistic 30 to 60 minute focused blocks.

You MUST return ONLY valid JSON matching this schema:
{
  "title": "${topic || 'Upcoming Deliverables Study Plan'}",
  "startDate": "2026-09-30",
  "endDate": "2026-10-07",
  "sessions": [
    {
      "date": "Wednesday, Sep 30",
      "dayOfWeek": "Wednesday",
      "focus": "Review Ch. 5 Monopoly formulas and practice deadweight loss calculation",
      "estimatedMinutes": 45,
      "items": [
        {
          "text": "Complete ECON-217 Monopoly practice problems",
          "courseCode": "ECON-217",
          "dueAt": "2026-10-02T23:59:00"
        }
      ]
    }
  ]
}

Rules:
- Order sessions by date logically.
- Return plain text in strings.
- Return strict parseable JSON.
`,
    validateAndNormalize: (parsed: any, params: GenerationParams): StudyPlanContent => {
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON: expected an object');
      const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      if (rawSessions.length === 0) throw new Error('Schema validation error: "sessions" array is empty');

      const sessions = rawSessions.map((s: any, sIdx: number) => ({
        date: String(s.date || `Day ${sIdx + 1}`).trim(),
        dayOfWeek: String(s.dayOfWeek || '').trim(),
        focus: String(s.focus || 'Course Review').trim(),
        estimatedMinutes: Number(s.estimatedMinutes) || 45,
        items: Array.isArray(s.items)
          ? s.items.map((it: any, iIdx: number) => ({
              id: `plan-item-${Date.now()}-${sIdx}-${iIdx}`,
              text: String(it.text || it.task || 'Study session').trim(),
              completed: Boolean(it.completed),
              courseCode: it.courseCode ? String(it.courseCode) : undefined,
              dueAt: it.dueAt ? String(it.dueAt) : undefined,
            }))
          : [],
      }));

      return {
        title: String(parsed.title || params.topic || 'Academic Study Plan').trim(),
        startDate: String(parsed.startDate || new Date().toISOString().slice(0, 10)),
        endDate: String(parsed.endDate || ''),
        sessions,
      };
    },
  },
};

/** Helper to robustly extract and parse JSON from an LLM response */
export function extractAndParseJson(raw: string): any {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // Find the outermost JSON object or array
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;

  if (firstBrace >= 0 && firstBracket >= 0) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    startIdx = firstBrace;
  } else if (firstBracket >= 0) {
    startIdx = firstBracket;
  }

  if (startIdx >= 0) {
    const isObject = cleaned[startIdx] === '{';
    const lastIdx = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
    if (lastIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, lastIdx + 1);
    }
  }

  // Remove trailing commas before closing braces/brackets which break JSON.parse
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  return JSON.parse(cleaned);
}
