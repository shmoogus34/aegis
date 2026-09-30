// lib/openRouter.ts — Unified Multi-Provider AI Routing Engine (OpenRouter + NVIDIA NIM)

import type { ModelRoute } from './types';
import { CENTRAL_SYSTEM_PROMPT } from './systemPrompt';
import { cleanAiResponse } from './cleanAiResponse';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const NVIDIA_BASE     = 'https://integrate.api.nvidia.com/v1';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const NVIDIA_API_KEY     = process.env.NVIDIA_API_KEY ?? '';
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY ?? '';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Call Google Generative Language / AI Studio Interactions API directly for Gemini 3.8 Flash */
export async function callGoogleGeminiInteractions(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    rawOutput?: boolean;
    useSearch?: boolean;
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('1147~')) {
    throw new Error('Valid GEMINI_API_KEY required for Google AI Studio execution');
  }

  // Format system prompt and conversational turns for the input field
  const sysMsg = messages.find((m) => m.role === 'system');
  const userAndAssistant = messages.filter((m) => m.role !== 'system');

  let formattedInput = '';
  if (sysMsg) {
    formattedInput += `[System Instructions]:\n${sysMsg.content}\n\n`;
  }
  if (userAndAssistant.length === 1 && userAndAssistant[0].role === 'user') {
    formattedInput += userAndAssistant[0].content;
  } else {
    formattedInput += userAndAssistant
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');
  }

  const payload: any = {
    model: 'models/gemini-3.8-flash',
    input: formattedInput,
    generation_config: {
      max_output_tokens: options?.max_tokens ?? 65536,
      thinking_level: 'medium',
    },
  };

  if (options?.useSearch) {
    payload.tools = [{ type: 'google_search' }];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  // Execute with 1 retry for transient spikes
  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 4000));
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google AI Studio (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const steps = Array.isArray(data.steps) ? data.steps : [];
      let outputText = '';
      for (const step of steps) {
        if (step.type === 'model_output' && Array.isArray(step.content)) {
          for (const item of step.content) {
            if (item.type === 'text' && typeof item.text === 'string') {
              outputText += item.text;
            }
          }
        }
      }

      if (outputText.trim().length > 0) {
        return options?.rawOutput ? outputText : cleanAiResponse(outputText);
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Gemini 3.8 Direct Interactions] Attempt ${attempt + 1} error:`, err?.message || err);
    }
  }

  throw lastErr || new Error('No output from Gemini 3.8 Flash Interactions API');
}

/** Legacy wrapper forwarding to direct Gemini 3.8 Flash Interactions API */
export async function callGoogleGemini(
  messages: ChatMessage[],
  model: string = 'models/gemini-3.8-flash',
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  return callGoogleGeminiInteractions(messages, options);
}

/** Intelligent Task-Based Model Evaluator: selects the best model for the exact query */
export function selectBestModelForTask(messages: ChatMessage[]): string {
  // Always default to Google Gemini 3.8 Flash direct Interactions API per user instruction:
  // "right now it is stuck on 2.5 flash. fix it so it is at 3.8 flash, from the gemini api key i sent not openrouter."
  return 'models/gemini-3.8-flash';
}

// ── Verified Active Multi-Model Catalog ────────────────────────
export const ALL_MODELS: ModelRoute[] = [
  // Primary Model: Google Gemini 3.8 Flash (Google AI Studio Direct API)
  {
    provider:     'gemini-direct' as any,
    domain:       'Primary General & Academic Core',
    courses:      ['ALL'],
    model:        'models/gemini-3.8-flash',
    modelDisplay: 'Gemini 3.8 Flash (Google AI Studio Direct)',
    reason:       'Default primary intelligence engine via Google Interactions API with full reasoning and search',
    color:        '#7C6BF0',
    contextWindow:'1M context',
  },
  // OpenRouter Verified Models
  {
    provider:     'openrouter',
    domain:       'High-Speed Academic Backup',
    courses:      ['ALL'],
    model:        'google/gemini-3.8-flash',
    modelDisplay: 'Gemini 3.8 Flash (OpenRouter Backup)',
    reason:       'High-throughput backup routing for study tools and tutoring',
    color:        '#9B8DF5',
    contextWindow:'1M context',
  },
  {
    provider:     'openrouter',
    domain:       'Writing, Law & Synthesis',
    courses:      ['BUSN-296', 'CTZN-110', 'ANTH-202'],
    model:        'meta-llama/llama-3.3-70b-instruct',
    modelDisplay: 'Llama 3.3 70B (OpenRouter)',
    reason:       'High-precision legal doctrine analysis, synthesis, and essay composition',
    color:        '#E8B368',
    contextWindow:'128k context',
  },
  {
    provider:     'openrouter',
    domain:       'Math & Quantitative Reasoning',
    courses:      ['MATH-171', 'ECON-217'],
    model:        'deepseek/deepseek-r1',
    modelDisplay: 'DeepSeek-R1 (OpenRouter)',
    reason:       'Extended chain-of-thought mathematical derivation and statistics solver',
    color:        '#4DD9E0',
    contextWindow:'64k context',
  },
  {
    provider:     'openrouter',
    domain:       'General Academic Reasoning',
    courses:      ['BUSN-110', 'CTZN-110', 'ALL'],
    model:        'deepseek/deepseek-chat',
    modelDisplay: 'DeepSeek-V3 Chat (OpenRouter)',
    reason:       'Balanced, versatile instruction following and structured study plans',
    color:        '#60A5FA',
    contextWindow:'64k context',
  },

  // NVIDIA NIM Verified Models (Direct on user's API Key)
  {
    provider:     'nvidia',
    domain:       'Visual & Academic Synthesis',
    courses:      ['ANTH-202', 'BUSN-296', 'ALL'],
    model:        'meta/llama-3.2-11b-vision-instruct',
    modelDisplay: 'Meta Llama 3.2 11B (NVIDIA NIM)',
    reason:       'Dedicated NVIDIA DGX Cloud inference for multimodal & coursework queries',
    color:        '#76B900', // NVIDIA Green
    contextWindow:'128k context',
  },
  {
    provider:     'nvidia',
    domain:       'Extended Step-by-Step Logic',
    courses:      ['MATH-171', 'ECON-217'],
    model:        'z-ai/glm-5.3',
    modelDisplay: 'GLM-5.3 Deep Reasoning (NVIDIA NIM)',
    reason:       'Advanced step-by-step reasoning tokens with native logic verification',
    color:        '#A3E635',
    contextWindow:'128k context',
  },
  {
    provider:     'nvidia',
    domain:       'Fast Open Inference',
    courses:      ['BUSN-110', 'ALL'],
    model:        'openai/gpt-oss-20b',
    modelDisplay: 'GPT-OSS 20B (NVIDIA NIM)',
    reason:       'Low-latency model for rapid Q&A, checklist validation, and outlines',
    color:        '#38BDF8',
    contextWindow:'32k context',
  },
];

export const MODEL_ROUTES = ALL_MODELS;

/** Route to best model based on course and user preference */
export function selectModel(courseCode: string, providerPref: 'openrouter' | 'nvidia' | 'auto' = 'auto'): ModelRoute {
  const code = (courseCode || 'ALL').toUpperCase();

  let candidates = ALL_MODELS;
  if (providerPref === 'nvidia') {
    candidates = ALL_MODELS.filter((m) => m.provider === 'nvidia');
  } else if (providerPref === 'openrouter') {
    candidates = ALL_MODELS.filter((m) => m.provider === 'openrouter');
  }

  // Find exact course match
  const match = candidates.find((r) =>
    r.courses.some((c) => c !== 'ALL' && code.includes(c.replace('-', '')))
  );

  if (match) return match;

  // Default fallback
  return providerPref === 'nvidia'
    ? ALL_MODELS.find((m) => m.model === 'meta/llama-3.2-11b-vision-instruct')!
    : ALL_MODELS[0]; // Llama 3.3 70B
}

/** Execute chat completion via OpenRouter */
async function callOpenRouter(
  messages: ChatMessage[],
  model: string,
  options?: { temperature?: number; max_tokens?: number; rawOutput?: boolean }
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aegis.system',
        'X-Title':      'A.E.G.I.S. Academic OS',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens:  options?.max_tokens  ?? 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter (${res.status}): ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    const raw = choice?.content || choice?.reasoning_content || '';
    return options?.rawOutput ? raw : cleanAiResponse(raw);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/** Execute chat completion via NVIDIA NIM */
async function callNvidia(
  messages: ChatMessage[],
  model: string,
  options?: { temperature?: number; max_tokens?: number; rawOutput?: boolean }
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens:  options?.max_tokens  ?? 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`NVIDIA NIM (${res.status}): ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    const raw = choice?.content || choice?.reasoning_content || '';
    return options?.rawOutput ? raw : cleanAiResponse(raw);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const SMART_CASCADE_TIERS = [
  { provider: 'gemini-direct' as const, model: 'models/gemini-3.8-flash', label: 'Gemini 3.8 Flash (Google AI Studio Direct)' },
  { provider: 'nvidia' as const,        model: 'meta/llama-3.2-11b-vision-instruct', label: 'Llama 3.2 11B (NVIDIA NIM)' },
  { provider: 'nvidia' as const,        model: 'z-ai/glm-5.3', label: 'GLM-5.3 Reasoning (NVIDIA NIM)' },
  { provider: 'openrouter' as const,    model: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash (OpenRouter Backup)' },
  { provider: 'openrouter' as const,    model: 'openai/gpt-4o', label: 'GPT-4o (Smartest Overall)' },
  { provider: 'openrouter' as const,    model: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
  { provider: 'openrouter' as const,    model: 'deepseek/deepseek-chat', label: 'DeepSeek-V3 Chat' },
];

/** Inject the central human response style prompt into messages (Phase 1 Layer 1) */
function injectSimpleVocabularyPrompt(messages: ChatMessage[]): ChatMessage[] {
  const cloned = [...messages];
  const sysIdx = cloned.findIndex((m) => m.role === 'system');

  if (sysIdx >= 0) {
    cloned[sysIdx] = {
      role: 'system',
      content: `${CENTRAL_SYSTEM_PROMPT}\n\n${cloned[sysIdx].content}`,
    };
  } else {
    cloned.unshift({
      role: 'system',
      content: CENTRAL_SYSTEM_PROMPT,
    });
  }

  return cloned;
}

/**
 * Smart Model Auto-Cascading Execution:
 * Always starts with the smartest model in the hierarchy (Gemini 3.8 Flash default).
 * If a model fails, runs out of quota, or times out, it automatically cascades
 * to the next smartest model in line until the query succeeds.
 */
export async function smartChatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    preferredModel?: string;
    rawOutput?: boolean;
    skipResponseStyle?: boolean;
    useSearch?: boolean;
  }
): Promise<{ text: string; usedModel: string; usedProvider: 'gemini-direct' | 'openrouter' | 'nvidia' }> {
  const preparedMessages = options?.skipResponseStyle ? [...messages] : injectSimpleVocabularyPrompt(messages);

  // Dynamically evaluate task and pick optimal best model if in auto/smart mode
  const rawPreferred = (options?.preferredModel && options.preferredModel !== 'auto' && options.preferredModel !== 'smart')
    ? options.preferredModel
    : selectBestModelForTask(preparedMessages);

  // Normalize preferred model aliases so Gemini 3.8 Flash Direct is ALWAYS prioritized
  const preferred = (
    rawPreferred === 'google/gemini-3.8-flash' ||
    rawPreferred === 'gemini-3.8-flash' ||
    rawPreferred === 'models/gemini-3.8-flash' ||
    rawPreferred === 'auto' ||
    rawPreferred === 'smart'
  ) ? 'models/gemini-3.8-flash' : rawPreferred;

  const modelsToTry = [...SMART_CASCADE_TIERS];
  const existingIdx = modelsToTry.findIndex((m) => m.model === preferred);
  if (existingIdx > 0) {
    const [item] = modelsToTry.splice(existingIdx, 1);
    modelsToTry.unshift(item);
  } else if (existingIdx === -1) {
    modelsToTry.unshift({
      provider: preferred === 'models/gemini-3.8-flash'
        ? 'gemini-direct'
        : preferred.startsWith('meta/llama-3.2') || preferred.startsWith('z-ai')
        ? 'nvidia'
        : 'openrouter',
      model: preferred,
      label: preferred,
    });
  }

  let lastError: any = null;

  for (const tier of modelsToTry) {
    try {
      if (tier.provider === 'gemini-direct') {
        const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
        if (!apiKey || apiKey.startsWith('1147~')) continue;
        const text = await callGoogleGeminiInteractions(preparedMessages, options);
        if (text && text.trim().length > 0) {
          return { text: options?.rawOutput ? text : cleanAiResponse(text), usedModel: tier.model, usedProvider: 'gemini-direct' };
        }
      } else if (tier.provider === 'nvidia') {
        if (!NVIDIA_API_KEY) continue;
        const text = await callNvidia(preparedMessages, tier.model, options);
        if (text && text.trim().length > 0) {
          return { text: options?.rawOutput ? text : cleanAiResponse(text), usedModel: tier.model, usedProvider: 'nvidia' };
        }
      } else {
        if (!OPENROUTER_API_KEY) continue;
        const text = await callOpenRouter(preparedMessages, tier.model, options);
        if (text && text.trim().length > 0) {
          return { text: options?.rawOutput ? text : cleanAiResponse(text), usedModel: tier.model, usedProvider: 'openrouter' };
        }
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Smart AI Cascade] Provider ${tier.provider} (${tier.model}) failed, cascading to next model... Reason:`, err);
    }
  }

  throw new Error(`All models in the Smart AI Cascade failed. Last error: ${lastError?.message || lastError}`);
}

/** Unified chat completion with multi-level automated fallback */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string = 'auto',
  options?: { temperature?: number; max_tokens?: number }
): Promise<{ text: string; usedModel: string; usedProvider: 'gemini-direct' | 'openrouter' | 'nvidia' }> {
  return smartChatCompletion(messages, { ...options, preferredModel: model });
}

/** Build prompt for study drill flashcards */
export function buildStudyDrillPrompt(courseName: string, courseCode: string, topic?: string): string {
  return `You are A.E.G.I.S., an elite academic AI tutor in a student's agentic OS at Longwood University.
The student is enrolled in: ${courseName} (${courseCode}).
${topic ? `Focus Topic: ${topic}` : 'Cover key high-yield exam concepts for this course.'}

Generate exactly 8 rigorous, exam-style flashcards in this exact plain text format:
Q: [Concise, specific question testing key conceptual understanding]
A: [Clear, comprehensive answer explaining the principle with a concrete example where appropriate]

Do not add extra conversational intro or outro. Format strictly with Q: and A: lines.`;
}

/** Build prompt for quantitative problem solving */
export function buildSolverPrompt(courseCode: string): string {
  const isEcon = courseCode.includes('ECON');
  const isMath = courseCode.includes('MATH');

  return `You are the A.E.G.I.S. Quantitative Reasoning Engine specializing in ${isEcon ? 'Microeconomic Analysis' : isMath ? 'Statistical Decision Making' : 'Applied Analytics'}.
Rules:
1. Identify the core mathematical/economic principle involved.
2. State all given parameters, formulas, and assumptions explicitly.
3. Show the complete step-by-step mathematical derivation with proper notation.
4. Interpret the final numerical answer in its real-world business context.
5. Provide a check or sanity check to verify correctness.`;
}
