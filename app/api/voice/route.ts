// app/api/voice/route.ts — ElevenLabs J.A.R.V.I.S. Voice Engine with Scribe STT & Smart Cascade

import { NextRequest, NextResponse } from 'next/server';
import { smartChatCompletion } from '@/lib/openRouter';
import {
  getCurrentSystemTime,
  getOmniVaultKnowledge,
  buildJarvisLiveContext,
  extractTargetLocation,
  getLiveWeather,
  getLiveNews,
  CURRENT_ACADEMIC_DELIVERABLES,
} from '@/lib/liveContext';
import { CENTRAL_SYSTEM_PROMPT } from '@/lib/systemPrompt';
import { cleanAiResponse } from '@/lib/cleanAiResponse';
import { STUDY_TOOL_REGISTRY, extractAndParseJson, GenerationParams } from '@/lib/studyTools/registry';
import { saveStudyTool, getPreviousQuestionsForCourse, getStudyToolsSummary } from '@/lib/studyTools/storage';
import type { StudyToolItem, StudyToolType } from '@/lib/studyTools/types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const DEFAULT_VOICE_ID   = process.env.ELEVENLABS_VOICE_ID ?? 'JBFqnCBsd6RMkjVDRZzb'; // George - British, intellectual
const MODEL_ID           = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2_5';

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S., the loyal, sharp AI study partner powering A.E.G.I.S. for the user. Address the user as "sir" with natural poise.

${CENTRAL_SYSTEM_PROMPT}

Active Longwood University Fall 2026 Academic Context:
- ECON-217: Principles of Microeconomics (Next deliverable: Quiz 5: Market Structures & Monopoly Pricing due Oct 2 at 11:59 PM; Problem Set 3 due Oct 9).
- MATH-171: Statistical Decision Making (Next deliverable: Quiz 3: Normal Distribution & CLT due Oct 4; Homework 4 due Oct 7).
- BUSN-296: Legal Environment of Business (Next deliverable: Test 2 Prep due Oct 11).
- CTZN-110: Social Entrepreneurship (Next deliverable: Social Venture Proposal due Oct 14).
- ANTH-202: Archaeology (Next deliverable: Module 3 Field Report due Oct 16).
- BUSN-110: Business Bootcamp (Next deliverable: Budget Portfolio due Oct 18).
- Obsidian Vault: Fully indexed with all Canvas course files and lecture notes.`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Transcribe user microphone audio using ElevenLabs Scribe STT API */
async function transcribeAudioWithElevenLabs(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<string> {
  try {
    const form = new FormData();
    form.append('model_id', 'scribe_v1');
    form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), 'recording.webm');

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: form,
    });

    if (res.ok) {
      const data = await res.json();
      return (data.text || '').trim();
    } else {
      const errText = await res.text();
      console.warn('[ElevenLabs Scribe STT response]:', res.status, errText);
    }
  } catch (err) {
    console.warn('[ElevenLabs Scribe STT exception]:', err);
  }
  return '';
}

/** Natural Chat & Voice Trigger: Detect intent and auto-generate structured study tool */
async function tryGenerateStudyToolFromIntent(prompt: string): Promise<StudyToolItem | null> {
  const pLower = prompt.toLowerCase();
  let type: StudyToolType | null = null;

  if (pLower.includes('flashcard') || pLower.includes('flash card')) {
    if (/(?:make|create|generate|give me|build|study|cards|drill)/.test(pLower)) {
      type = 'flashcards';
    }
  } else if (pLower.includes('quiz')) {
    if (/(?:quiz me|make|create|generate|give me|build|practice|test)/.test(pLower)) {
      type = 'quiz';
    }
  } else if (pLower.includes('study guide') || pLower.includes('study-guide')) {
    type = 'guide';
  } else if (pLower.includes('study plan') || pLower.includes('study schedule') || pLower.includes('schedule my study') || pLower.includes('plan out my study')) {
    type = 'plan';
  }

  if (!type) return null;

  let courseCode = 'ECON-217';
  if (pLower.includes('math') || pLower.includes('stats') || pLower.includes('regression') || pLower.includes('clt')) {
    courseCode = 'MATH-171';
  } else if (pLower.includes('law') || pLower.includes('busn 296') || pLower.includes('legal') || pLower.includes('tort')) {
    courseCode = 'BUSN-296';
  } else if (pLower.includes('citizenship') || pLower.includes('ctzn') || pLower.includes('social venture')) {
    courseCode = 'CTZN-110';
  } else if (pLower.includes('archaeology') || pLower.includes('anth') || pLower.includes('stratigraphy')) {
    courseCode = 'ANTH-202';
  } else if (pLower.includes('bootcamp') || pLower.includes('busn 110') || pLower.includes('budget')) {
    courseCode = 'BUSN-110';
  } else if (pLower.includes('econ') || pLower.includes('micro') || pLower.includes('monopoly')) {
    courseCode = 'ECON-217';
  }

  let topic = `${courseCode} Study Material`;
  if (pLower.includes('quiz 5')) topic = 'Quiz 5: Market Structures & Monopoly Pricing';
  else if (pLower.includes('quiz 3')) topic = 'Quiz 3: Normal Distribution & Central Limit Theorem';
  else if (pLower.includes('homework 4')) topic = 'Homework 4: Regression Analysis & Hypothesis Testing';
  else if (pLower.includes('test 2')) topic = 'Test 2 Prep: Business Entities & Corporations';
  else if (pLower.includes('monopoly')) topic = 'Monopoly Pricing & Deadweight Loss';
  else if (pLower.includes('elasticity')) topic = 'Price Elasticity of Demand';

  const toolDef = STUDY_TOOL_REGISTRY[type];
  const vaultSnippets = getOmniVaultKnowledge(courseCode, 4);
  const enrichedSource = vaultSnippets.map((s) => `[${s.courseCode} - ${s.title}]:\n${s.excerpt}`).join('\n\n');

  // Parse custom count from user voice/chat prompt (e.g. "15 questions", "10 cards")
  const countMatch = pLower.match(/(\d+)\s*(?:questions?|cards?|items?|problems?)/);
  const parsedCount = countMatch ? parseInt(countMatch[1]) : (type === 'flashcards' ? 5 : type === 'quiz' ? 5 : 3);
  const finalCount = Math.min(25, Math.max(3, parsedCount));

  // Parse custom question format (e.g. "all multiple choice", "true/false only")
  let questionFormat: 'mixed' | 'multiple_choice' | 'true_false' | 'short_answer' = 'mixed';
  if (pLower.includes('multiple choice') || pLower.includes('mcq')) questionFormat = 'multiple_choice';
  else if (pLower.includes('true false') || pLower.includes('true/false') || pLower.includes('true or false')) questionFormat = 'true_false';
  else if (pLower.includes('short answer') || pLower.includes('free response')) questionFormat = 'short_answer';

  // Anti-repetition: retrieve previously generated questions for this course & type
  const previousQuestions = getPreviousQuestionsForCourse(courseCode, type);

  const params: GenerationParams = {
    topic,
    courseCode,
    difficulty: 'medium',
    count: finalCount,
    sourceText: enrichedSource,
    questionFormat,
    customInstructions: prompt,
    previousQuestions,
    assignments: CURRENT_ACADEMIC_DELIVERABLES,
  };

  const generationPrompt = toolDef.buildPrompt(params);

  try {
    const aiResult = await smartChatCompletion(
      [
        { role: 'system', content: 'You are an academic curriculum engine. Return ONLY valid JSON matching the schema.' },
        { role: 'user', content: generationPrompt },
      ],
      {
        preferredModel: 'models/gemini-3.8-flash',
        temperature: 0.2,
        max_tokens: 1200,
        rawOutput: true,
        skipResponseStyle: true,
      }
    );

    const parsed = extractAndParseJson(aiResult.text);
    const normalized = toolDef.validateAndNormalize(parsed, params);

    const toolItem: StudyToolItem = {
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title: normalized.title || normalized.topic || topic,
      courseCode,
      sourceType: 'vault',
      sourceDetails: topic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      progress: 0,
      modelUsed: aiResult.usedModel,
      providerUsed: aiResult.usedProvider,
      data: normalized,
    };

    await saveStudyTool(toolItem);
    return toolItem;
  } catch (err) {
    console.warn('[Natural trigger study tool generation error]:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let prompt = '';
    let textOnlyTTS = false;
    let textToSpeak = '';
    let voiceId = DEFAULT_VOICE_ID;
    let courseContext = '';
    let audioBuffer: Buffer | null = null;
    let audioMimeType = 'audio/webm';
    let transcribedText = '';
    let historyRaw: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = (formData.get('prompt') as string) || '';
      voiceId = (formData.get('voiceId') as string) || DEFAULT_VOICE_ID;
      courseContext = (formData.get('courseContext') as string) || '';
      const file = formData.get('file') as File | null;
      if (file) {
        const ab = await file.arrayBuffer();
        audioBuffer = Buffer.from(ab);
        audioMimeType = file.type || 'audio/webm';
      }
    } else {
      const body = await req.json();
      prompt = body.prompt || '';
      textOnlyTTS = body.textOnlyTTS || false;
      textToSpeak = body.textToSpeak || '';
      voiceId = body.voiceId || DEFAULT_VOICE_ID;
      courseContext = body.courseContext || '';
      historyRaw = Array.isArray(body.history) ? body.history : [];

      if (body.audioBase64) {
        const raw = body.audioBase64 as string;
        const commaIdx = raw.indexOf(',');
        const base64Data = commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw;
        audioBuffer = Buffer.from(base64Data, 'base64');
        if (raw.includes('audio/mp4')) audioMimeType = 'audio/mp4';
        else if (raw.includes('audio/wav')) audioMimeType = 'audio/wav';
      }
    }

    // If audio is provided, transcribe it using ElevenLabs Scribe
    if (audioBuffer && audioBuffer.length > 0) {
      transcribedText = await transcribeAudioWithElevenLabs(audioBuffer, audioMimeType);
      if (transcribedText) {
        prompt = transcribedText;
      }
    }

    let responseText = '';
    let usedModel = 'models/gemini-3.8-flash';

    let liveContextData: any = null;

    let generatedTool: StudyToolItem | null = null;

    if (textOnlyTTS && textToSpeak) {
      responseText = textToSpeak;
    } else {
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return NextResponse.json(
          { error: 'No prompt or transcribable voice audio received. Please try speaking again.' },
          { status: 400 }
        );
      }

      // Check if prompt naturally triggers a structured study tool
      generatedTool = await tryGenerateStudyToolFromIntent(prompt);

      if (generatedTool) {
        const toolLabel =
          generatedTool.type === 'flashcards'
            ? 'flashcard deck'
            : generatedTool.type === 'quiz'
            ? 'practice quiz'
            : generatedTool.type === 'guide'
            ? 'study guide'
            : 'study plan';
        responseText = `I have generated your ${toolLabel} for ${generatedTool.courseCode}. Opening it now, sir.`;
        usedModel = generatedTool.modelUsed;
      } else {
        // 1. Build real-time live intelligence context (System Time, Farmville & Global Weather, Live News, and Omni-Vault)
        const liveContext = await buildJarvisLiveContext(prompt, { courseContext });
        liveContextData = {
          time: liveContext.timeInfo.formattedTime,
          date: liveContext.timeInfo.formattedDate,
          dayOfWeek: liveContext.timeInfo.dayOfWeek,
          weather: {
            location: liveContext.weather.locationName,
            tempF: liveContext.weather.currentTempF,
            feelsLikeF: liveContext.weather.feelsLikeF,
            condition: liveContext.weather.condition,
            highF: liveContext.weather.todayMaxTempF,
            lowF: liveContext.weather.todayMinTempF,
            humidity: liveContext.weather.humidityPercent,
            windMph: liveContext.weather.windSpeedMph,
            rainChance: liveContext.weather.precipitationProbabilityMax,
          },
          newsCount: liveContext.news.length,
        };

        const existingToolsSummary = getStudyToolsSummary();
        const fullJarvisSystemPrompt = `${JARVIS_SYSTEM_PROMPT}\n\n${liveContext.promptContextBlock}\n\n[Active Study Tools & Decks in Vault (Never repeat these questions)]:\n${existingToolsSummary}`;

        // 2. Check if query requires live web search
        const lowerPrompt = prompt.toLowerCase();
        const needsLiveOnlineSearch =
          lowerPrompt.includes('news') ||
          lowerPrompt.includes('score') ||
          lowerPrompt.includes('who won') ||
          lowerPrompt.includes('what happened') ||
          lowerPrompt.includes('current event') ||
          lowerPrompt.includes('stock price') ||
          lowerPrompt.includes('trending');

        // 3. Multi-turn memory: include recent conversation history
        const safeHistory = historyRaw
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-8);

        const messages = [
          { role: 'system' as const, content: fullJarvisSystemPrompt },
          ...safeHistory,
          {
            role: 'user' as const,
            content: `${prompt}${courseContext ? `\n[Course Context: ${courseContext}]` : ''}`,
          },
        ];

        // Primary AI: Google Gemini 3.8 Flash via Google AI Studio Direct API with automatic cascade
        const llmResult = await smartChatCompletion(messages, {
          temperature: 0.35,
          max_tokens: 350,
          preferredModel: needsLiveOnlineSearch ? 'openai/gpt-4o:online' : 'models/gemini-3.8-flash',
          useSearch: needsLiveOnlineSearch,
        });

        responseText = cleanAiResponse(llmResult.text.trim());
        usedModel = llmResult.usedModel;
      }
    }

    // Clean text for speech synthesis (strip markdown formatting so ElevenLabs doesn't read hashes or stars)
    const cleanSpeechText = responseText
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    // Call ElevenLabs Text-to-Speech API
    let audioBase64: string | null = null;
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanSpeechText,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (elevenRes.ok) {
      const audioArrayBuffer = await elevenRes.arrayBuffer();
      audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioArrayBuffer).toString('base64')}`;
    } else {
      const errText = await elevenRes.text();
      console.warn('[ElevenLabs TTS error]:', elevenRes.status, errText);
    }

    return NextResponse.json({
      transcribedText: transcribedText || prompt,
      text: responseText,
      audioBase64,
      voiceId,
      voiceName: voiceId === 'JBFqnCBsd6RMkjVDRZzb' ? 'George (Jarvis)' : 'Daniel (Jarvis British)',
      model: usedModel,
      liveInfo: liveContextData,
      generatedTool: generatedTool || undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Voice API error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal voice processing error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || 'Farmville, VA';
    const timeZone = searchParams.get('timezone') || 'America/New_York';

    const timeInfo = getCurrentSystemTime(timeZone);
    const weather = await getLiveWeather(location);
    const news = await getLiveNews(undefined, 4);

    return NextResponse.json({
      status: 'online',
      sttEngine: 'ElevenLabs Scribe v1',
      ttsEngine: 'ElevenLabs Turbo v2.5',
      defaultVoice: 'George (JBFqnCBsd6RMkjVDRZzb)',
      availableVoices: [
        { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - Warm, Captivating Storyteller (Jarvis Persona)', accent: 'British' },
        { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel - Steady Broadcaster', accent: 'British' },
      ],
      timeInfo,
      weather,
      news,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get live status' }, { status: 500 });
  }
}
