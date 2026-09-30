// lib/canvasApi.ts — Canvas LMS REST API client

import type { Assignment, Announcement, Quiz, Course } from './types';

const BASE_URL = process.env.CANVAS_BASE_URL ?? 'https://longwood.instructure.com';
const API_TOKEN = process.env.CANVAS_API_TOKEN ?? '';

const COURSE_COLORS: Record<string, string> = {
  'ANTH-202':  '#E8B368',
  'BUSN-296':  '#60A5FA',
  'BUSN-110':  '#4ADE80',
  'CTZN-110':  '#C084FC',
  'ECON-217':  '#F87171',
  'MATH-171':  '#4DD9E0',
};

function headers() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function extractCourseCode(name: string): string {
  const match = name.match(/([A-Z]{3,4}-\d{3}[A-Z0-9-]*)/i);
  return match ? match[1].toUpperCase() : name.slice(0, 8).toUpperCase();
}

function colorForCode(code: string): string {
  for (const [key, color] of Object.entries(COURSE_COLORS)) {
    if (code.startsWith(key.replace('-', '').toUpperCase()) ||
        code.includes(key.split('-')[0]) ||
        code.includes(key.split('-')[1])) {
      return color;
    }
  }
  return '#D4A359';
}

/** Fetch all active courses */
export async function fetchCourses(): Promise<Course[]> {
  const url = `${BASE_URL}/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=50&state[]=available`;
  const res = await fetch(url, { headers: headers(), next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Canvas courses fetch failed: ${res.status}`);
  const data: any[] = await res.json();
  return data
    .filter((c) => c.name && !c.access_restricted_by_date)
    .map((c) => {
      const code = extractCourseCode(c.course_code ?? c.name ?? '');
      return {
        id:    String(c.id),
        name:  c.name ?? 'Unknown Course',
        code:  code,
        color: colorForCode(code),
        href:  `${BASE_URL}/courses/${c.id}`,
      };
    });
}

/** Fetch upcoming assignments across all enrolled courses */
export async function fetchAssignments(courses: Course[]): Promise<Assignment[]> {
  const results: Assignment[] = [];

  await Promise.allSettled(
    courses.map(async (course) => {
      const url =
        `${BASE_URL}/api/v1/courses/${course.id}/assignments` +
        `?bucket=upcoming&order_by=due_at&per_page=30&include[]=submission&include[]=submission_types`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return;
      const data: any[] = await res.json();
      data.forEach((a) => {
        const lockdown =
          JSON.stringify(a.submission_types ?? []).includes('online_quiz') ||
          (a.description ?? '').toLowerCase().includes('lockdown') ||
          (a.name ?? '').toLowerCase().includes('lockdown');
        results.push({
          id:              String(a.id),
          courseId:        course.id,
          courseName:      course.name,
          courseCode:      course.code,
          courseColor:     course.color,
          name:            a.name ?? 'Untitled',
          dueAt:           a.due_at ?? null,
          pointsPossible:  a.points_possible ?? null,
          submissionType:  a.submission_types ?? [],
          submitted:       a.submission?.submitted_at != null,
          missing:         a.submission?.missing ?? false,
          late:            a.submission?.late ?? false,
          lockdownBrowser: lockdown,
          htmlUrl:         a.html_url ?? `${BASE_URL}/courses/${course.id}`,
        });
      });
    })
  );

  return results.sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

/** Fetch announcements across all enrolled courses */
export async function fetchAnnouncements(courses: Course[]): Promise<Announcement[]> {
  const results: Announcement[] = [];
  await Promise.allSettled(
    courses.map(async (course) => {
      const url =
        `${BASE_URL}/api/v1/announcements?context_codes[]=course_${course.id}&per_page=5&active_only=true`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return;
      const data: any[] = await res.json();
      data.forEach((a) => {
        results.push({
          id:         String(a.id),
          courseId:   course.id,
          courseName: course.name,
          title:      a.title ?? 'Announcement',
          message:    (a.message ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
          postedAt:   a.posted_at ?? a.created_at ?? new Date().toISOString(),
        });
      });
    })
  );
  return results.sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

/** Fetch quizzes (exams) across all enrolled courses */
export async function fetchQuizzes(courses: Course[]): Promise<Quiz[]> {
  const results: Quiz[] = [];
  await Promise.allSettled(
    courses.map(async (course) => {
      const url = `${BASE_URL}/api/v1/courses/${course.id}/quizzes?per_page=20`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) return;
      const data: any[] = await res.json();
      data.forEach((q) => {
        results.push({
          id:            String(q.id),
          courseId:      course.id,
          courseName:    course.name,
          title:         q.title ?? 'Quiz',
          dueAt:         q.due_at ?? null,
          timeLimit:     q.time_limit ?? null,
          questionCount: q.question_count ?? 0,
          htmlUrl:       q.html_url ?? `${BASE_URL}/courses/${course.id}`,
        });
      });
    })
  );
  return results.sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}
