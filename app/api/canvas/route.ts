// app/api/canvas/route.ts — Canvas LMS REST proxy endpoint

import { NextRequest, NextResponse } from 'next/server';
import { fetchCourses, fetchAssignments, fetchAnnouncements, fetchQuizzes } from '@/lib/canvasApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? 'all';

  try {
    const courses = await fetchCourses();

    if (action === 'courses') {
      return NextResponse.json({ courses });
    }

    const [assignments, announcements, quizzes] = await Promise.all([
      action === 'all' || action === 'assignments' ? fetchAssignments(courses) : Promise.resolve([]),
      action === 'all' || action === 'announcements' ? fetchAnnouncements(courses) : Promise.resolve([]),
      action === 'all' || action === 'quizzes' ? fetchQuizzes(courses) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      courses,
      assignments,
      announcements,
      quizzes,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Canvas API Error]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Canvas API error',
        courses: [],
        assignments: [],
        announcements: [],
        quizzes: [],
        syncedAt: new Date().toISOString(),
      },
      { status: 200 } // Return 200 with error so client handles gracefully
    );
  }
}
