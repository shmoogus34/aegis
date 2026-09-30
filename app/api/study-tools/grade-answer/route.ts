// app/api/study-tools/grade-answer/route.ts — AI Evaluator for Short Answer Quiz Questions
import { NextRequest, NextResponse } from 'next/server';
import { smartChatCompletion } from '@/lib/openRouter';
import { extractAndParseJson } from '@/lib/studyTools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, canonicalAnswer, studentAnswer } = await req.json();

    if (!question || !canonicalAnswer || !studentAnswer) {
      return NextResponse.json(
        { success: false, error: 'Question, canonical answer, and student answer are required' },
        { status: 400 }
      );
    }

    const prompt = `You are a fair, expert university instructor evaluating a student's short answer response.
Question: "${question}"
Expected / Canonical Answer: "${canonicalAnswer}"
Student's Answer: "${studentAnswer}"

Evaluate if the student's answer captures the essential concepts or quantitative correctness, even if phrased slightly differently. Be fair: grant credit for conceptually correct understanding, but deduct if core misconceptions or incorrect values are stated.

You MUST return ONLY valid JSON matching this schema:
{
  "correct": true,
  "reason": "1 concise sentence explaining why the answer is correct or what critical concept was missed."
}
No markdown formatting, no extra commentary.`;

    const aiRes = await smartChatCompletion(
      [
        { role: 'system', content: 'Return ONLY strict JSON matching the schema.' },
        { role: 'user', content: prompt },
      ],
      {
        preferredModel: 'google/gemini-3.8-flash',
        temperature: 0.1,
        max_tokens: 300,
        rawOutput: true,
        skipResponseStyle: true,
      }
    );

    try {
      const parsed = extractAndParseJson(aiRes.text);
      return NextResponse.json({
        success: true,
        correct: Boolean(parsed.correct),
        reason: String(parsed.reason || 'Answer evaluated.').trim(),
      });
    } catch {
      // Heuristic fallback if JSON fails
      const lower = aiRes.text.toLowerCase();
      const isCorrect = lower.includes('"correct": true') || lower.includes('true') || !lower.includes('incorrect');
      return NextResponse.json({
        success: true,
        correct: isCorrect,
        reason: aiRes.text.slice(0, 150),
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to grade answer' },
      { status: 500 }
    );
  }
}
