// app/api/openrouter/route.ts — Multi-Provider API Route (OpenRouter + NVIDIA NIM)

import { NextRequest, NextResponse } from 'next/server';
import {
  chatCompletion,
  selectModel,
  buildStudyDrillPrompt,
  buildSolverPrompt,
  ALL_MODELS
} from '@/lib/openRouter';
import type { ChatMessage } from '@/lib/openRouter';
import { getCurrentSystemTime } from '@/lib/liveContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      courseCode,
      courseName,
      messages,
      topic,
      preferredProvider = 'auto',
      selectedModelId,
    } = body;

    let targetModelRoute = (selectedModelId && selectedModelId !== 'smart' && selectedModelId !== 'auto')
      ? ALL_MODELS.find((m) => m.model === selectedModelId) || selectModel(courseCode ?? 'ALL', preferredProvider)
      : null;

    let systemPrompt = '';
    let userMessage  = '';

    const timeInfo = getCurrentSystemTime('America/New_York');
    const liveTimeContext = `\n[CURRENT REAL-TIME CONTEXT]: ${timeInfo.formattedDate}, ${timeInfo.formattedTime} EDT (Farmville, VA).`;

    if (action === 'study-drill') {
      systemPrompt = buildStudyDrillPrompt(courseName ?? courseCode, courseCode ?? '', topic) + liveTimeContext;
      userMessage  = `Generate high-yield exam flashcards for ${courseName ?? courseCode}${topic ? ': ' + topic : ''}.`;
    } else if (action === 'solver') {
      systemPrompt = buildSolverPrompt(courseCode ?? '') + liveTimeContext;
      userMessage  = messages?.[0]?.content ?? 'Solve the quantitative problem step by step.';
    } else if (action === 'synthesis') {
      systemPrompt = `You are A.E.G.I.S., an elite academic AI assistant at Longwood University. Provide thorough, structured, and insightful academic analysis for ${courseName ?? courseCode}.${liveTimeContext}`;
      userMessage  = messages?.[0]?.content ?? 'Analyze the assignment requirements.';
    } else {
      systemPrompt = `You are A.E.G.I.S., an agentic academic operating system assistant.${liveTimeContext}`;
      userMessage  = messages?.[0]?.content ?? 'Status check.';
    }

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ];

    const isLiveSearchNeeded = userMessage.toLowerCase().includes('news') || 
      userMessage.toLowerCase().includes('current event') || 
      userMessage.toLowerCase().includes('who won') || 
      userMessage.toLowerCase().includes('what happened') || 
      userMessage.toLowerCase().includes('score');

    const modelToUse = targetModelRoute
      ? targetModelRoute.model
      : (isLiveSearchNeeded ? 'openai/gpt-4o:online' : 'smart');

    const result = await chatCompletion(chatMessages, modelToUse, {
      temperature: action === 'solver' ? 0.1 : 0.3,
      max_tokens:  1500,
    });

    const roughTokens = Math.round(result.text.length / 4);

    return NextResponse.json({
      text:         result.text,
      model:        result.usedModel,
      provider:     result.usedProvider,
      domain:       targetModelRoute?.domain ?? 'Academic Synthesis',
      tokens:       roughTokens,
      generatedAt:  new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Model API Route Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Model inference error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    models: ALL_MODELS,
    providers: [
      { id: 'openrouter', name: 'OpenRouter Multi-API Router', status: 'active', pool: '1,000,000,000' },
      { id: 'nvidia',     name: 'NVIDIA NIM DGX Cloud',        status: 'active', pool: 'NVIDIA High-Perf' },
    ],
  });
}
