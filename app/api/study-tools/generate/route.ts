// app/api/study-tools/generate/route.ts — AI Generation for Structured Study Tools
import { NextRequest, NextResponse } from 'next/server';
import { STUDY_TOOL_REGISTRY, extractAndParseJson, GenerationParams } from '@/lib/studyTools/registry';
import { saveStudyTool, getPreviousQuestionsForCourse } from '@/lib/studyTools/storage';
import { smartChatCompletion } from '@/lib/openRouter';
import { getOmniVaultKnowledge, CURRENT_ACADEMIC_DELIVERABLES } from '@/lib/liveContext';
import type { StudyToolItem, StudyToolType } from '@/lib/studyTools/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      topic,
      courseCode,
      courseName,
      difficulty = 'medium',
      count,
      sourceText,
      questionFormat,
      customInstructions,
    } = body as {
      type: StudyToolType;
      topic?: string;
      courseCode?: string;
      courseName?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      count?: number;
      sourceText?: string;
      questionFormat?: 'mixed' | 'multiple_choice' | 'true_false' | 'short_answer';
      customInstructions?: string;
    };

    if (!type || !STUDY_TOOL_REGISTRY[type]) {
      return NextResponse.json(
        { success: false, error: `Invalid tool type: "${type}". Expected flashcards, quiz, guide, or plan.` },
        { status: 400 }
      );
    }

    const toolDef = STUDY_TOOL_REGISTRY[type];

    // Gather real grounding knowledge from Obsidian Vault & Canvas files
    let enrichedSource = sourceText || '';
    if (!enrichedSource) {
      const searchTarget = courseCode || topic || 'overview';
      const vaultSnippets = getOmniVaultKnowledge(searchTarget, 5);
      if (vaultSnippets.length > 0) {
        enrichedSource = vaultSnippets
          .map((s) => `[${s.courseCode} - ${s.title}]:\n${s.excerpt}`)
          .join('\n\n');
      }
    }

    // Retrieve previous questions/prompts for anti-repetition mandate
    const previousQuestions = getPreviousQuestionsForCourse(courseCode, type);

    const params: GenerationParams = {
      topic: topic || `${courseCode || 'Course'} Study Material`,
      courseCode: courseCode || 'GENERAL',
      courseName,
      difficulty,
      count: count || toolDef.defaultCount,
      sourceText: enrichedSource,
      questionFormat,
      customInstructions,
      previousQuestions,
      assignments: CURRENT_ACADEMIC_DELIVERABLES,
    };

    const prompt = toolDef.buildPrompt(params);

    // Initial AI generation with Gemini 3.8 Flash default
    let aiResponse;
    try {
      aiResponse = await smartChatCompletion(
        [
          {
            role: 'system',
            content: 'You are an expert university curriculum and test-prep engine. Return ONLY strict, parseable JSON conforming exactly to the requested schema. Do NOT include markdown wrapping, conversational preambles, or explanations.',
          },
          { role: 'user', content: prompt },
        ],
        {
          preferredModel: 'models/gemini-3.8-flash',
          temperature: 0.2,
          max_tokens: 4096,
          rawOutput: true,
          skipResponseStyle: true,
        }
      );
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `AI provider error: ${err?.message || err}` },
        { status: 500 }
      );
    }

    // Try parsing and normalizing
    let normalizedData;
    try {
      const parsed = extractAndParseJson(aiResponse.text);
      normalizedData = toolDef.validateAndNormalize(parsed, params);
    } catch (parseError: any) {
      console.warn(`[Study Tool Generation] First attempt parse failed (${parseError?.message}). Retrying once with corrective prompt...`);

      // 1-Turn Retry with explicit error feedback
      try {
        const retryResponse = await smartChatCompletion(
          [
            {
              role: 'system',
              content: 'You are an expert university curriculum engine. You MUST fix the formatting error and return ONLY valid, strictly parseable JSON conforming to the schema.',
            },
            { role: 'user', content: prompt },
            { role: 'assistant', content: aiResponse.text },
            {
              role: 'user',
              content: `The previous response failed schema validation with error: "${parseError?.message}". Please return ONLY clean, valid JSON matching the exact schema with all required fields. No markdown fences, no trailing commas.`,
            },
          ],
          {
            preferredModel: 'models/gemini-3.8-flash',
            temperature: 0.1,
            max_tokens: 4096,
            rawOutput: true,
            skipResponseStyle: true,
          }
        );

        const retryParsed = extractAndParseJson(retryResponse.text);
        normalizedData = toolDef.validateAndNormalize(retryParsed, params);
        aiResponse = retryResponse;
      } catch (retryError: any) {
        console.error('[Study Tool Generation] Retry also failed:', retryError);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to generate valid structured ${type} data: ${retryError?.message || retryError}`,
            rawPreview: aiResponse.text.slice(0, 300),
          },
          { status: 422 }
        );
      }
    }

    // Determine clean title
    let title = params.topic || toolDef.label;
    if (type === 'flashcards' && (normalizedData as any).topic) {
      title = (normalizedData as any).topic;
    } else if (type === 'quiz' && (normalizedData as any).title) {
      title = (normalizedData as any).title;
    } else if (type === 'guide' && (normalizedData as any).title) {
      title = (normalizedData as any).title;
    } else if (type === 'plan' && (normalizedData as any).title) {
      title = (normalizedData as any).title;
    }

    const toolItem: StudyToolItem = {
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      courseCode: courseCode || 'GENERAL',
      courseName,
      sourceType: sourceText ? 'notes' : 'vault',
      sourceDetails: topic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      progress: 0,
      modelUsed: aiResponse.usedModel,
      providerUsed: aiResponse.usedProvider,
      data: normalizedData,
    };

    // Save to persistent file storage
    await saveStudyTool(toolItem);

    return NextResponse.json({ success: true, tool: toolItem });
  } catch (err: any) {
    console.error('[Study Tool Generation Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error while generating study tool.' },
      { status: 500 }
    );
  }
}
