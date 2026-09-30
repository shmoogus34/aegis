// app/api/calendar/route.ts — iCloud Webcal feed parser endpoint

import { NextResponse } from 'next/server';
import type { CalEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FEED_URL = process.env.ICAL_FEED_URL ??
  'https://p66-caldav.icloud.com/published/2/MjAzMTkwOTkwNTIyMDMxOW8Gg5w4q5hHHhn2qQmvCNe2wT2WeMhkz-mGFeCgvLIPnv9CEpLss7yO3QYpK3omfDpw83Y41yzEATJN1Ker-CA';

function parseIcalText(raw: string, now: Date): CalEvent[] {
  const events: CalEvent[] = [];
  const vevents = raw.split('BEGIN:VEVENT').slice(1);

  for (const vevent of vevents) {
    const get = (key: string): string => {
      const regex = new RegExp(`${key}[^:]*:([^\\r\\n]+)`, 'i');
      const m = vevent.match(regex);
      return m ? m[1].trim() : '';
    };

    const uid     = get('UID');
    const summary = get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' ');
    const dtStart = get('DTSTART');
    const dtEnd   = get('DTEND');
    const loc     = get('LOCATION').replace(/\\,/g, ',');
    const desc    = get('DESCRIPTION').replace(/\\n/g, ' ').slice(0, 200);

    if (!summary || !dtStart) continue;

    const parseIcalDate = (s: string): Date => {
      // FORMAT: 20240918T160000Z or 20240918T160000 or 20240918
      const clean = s.replace(/Z$/, '');
      if (clean.includes('T')) {
        const y = clean.slice(0, 4),
              mo = clean.slice(4, 6),
              d  = clean.slice(6, 8),
              h  = clean.slice(9, 11),
              mi = clean.slice(11, 13),
              sec= clean.slice(13, 15);
        return new Date(`${y}-${mo}-${d}T${h}:${mi}:${sec}${s.endsWith('Z') ? 'Z' : ''}`);
      } else {
        return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`);
      }
    };

    const start = parseIcalDate(dtStart);
    const end   = dtEnd ? parseIcalDate(dtEnd) : new Date(start.getTime() + 3600000);

    const isNow = start <= now && end >= now;

    events.push({
      id:          uid || `${summary}-${dtStart}`,
      title:       summary,
      start:       start.toISOString(),
      end:         end.toISOString(),
      location:    loc || undefined,
      description: desc || undefined,
      isNow,
    });
  }

  // Sort by start time, show only events within ±7 days
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return events
    .filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= now.getTime() - weekMs && t <= now.getTime() + weekMs;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function GET() {
  const now = new Date();
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'AEGIS-CalendarBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);

    const text    = await res.text();
    const events  = parseIcalText(text, now);

    return NextResponse.json({
      events,
      count:    events.length,
      syncedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[Calendar API Error]', error);

    // Return demo schedule events as fallback
    const demoEvents: CalEvent[] = [
      {
        id:    'demo-1',
        title: 'ANTH-202 Archaeology',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
        end:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 15).toISOString(),
        location: 'Wygal Hall 101',
        isNow: false,
      },
      {
        id:    'demo-2',
        title: 'ECON-217 Microeconomics',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0).toISOString(),
        end:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15).toISOString(),
        location: 'Ruffner Hall 212',
        isNow: false,
      },
      {
        id:    'demo-3',
        title: 'MATH-171 Statistics',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0).toISOString(),
        end:   new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 50).toISOString(),
        location: 'Grainger Hall 110',
        isNow: false,
      },
      {
        id:    'demo-4',
        title: 'BUSN-296 Legal Environment',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0).toISOString(),
        end:   new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 15).toISOString(),
        location: 'Pratt Hall 205',
        isNow: false,
      },
      {
        id: 'demo-5',
        title: 'BUSN-296 Test 1 (LockDown Browser)',
        start: new Date(2026, 8, 21, 9, 0).toISOString(),
        end:   new Date(2026, 8, 21, 10, 30).toISOString(),
        location: 'Online - Canvas',
        isNow: false,
      },
    ];

    return NextResponse.json({
      events:   demoEvents,
      count:    demoEvents.length,
      syncedAt: now.toISOString(),
      demo:     true,
    });
  }
}
