'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, RefreshCw } from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import type { CalEvent } from '@/lib/types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const t = new Date();
  const isToday    = d.toDateString() === t.toDateString();
  const tomorrow   = new Date(t); tomorrow.setDate(t.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday)    return 'TODAY';
  if (isTomorrow) return 'TOMORROW';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function eventColor(title: string): string {
  const t = title.toUpperCase();
  if (t.includes('ANTH'))  return '#9B8DF5';
  if (t.includes('BUSN'))  return '#60A5FA';
  if (t.includes('CTZN'))  return '#C084FC';
  if (t.includes('ECON'))  return '#F87171';
  if (t.includes('MATH'))  return '#4DD9E0';
  if (t.includes('TEST') || t.includes('EXAM')) return '#F87171';
  return '#7C6BF0';
}

function EventCard({ event }: { event: CalEvent }) {
  const color = event.color ?? eventColor(event.title);
  const start = formatTime(event.start);
  const end   = formatTime(event.end);
  const day   = formatDay(event.start);

  return (
    <motion.div
      className={`relative flex gap-3 py-2.5 px-3 rounded-sm border transition-all ${
        event.isNow ? 'bg-[#7C6BF0] border-[#7C6BF060] shadow-[0_0_15px_rgba(232,179,104,0.2)]' : 'bg-black/50 border-stone-800 hover:border-stone-700'
      }`}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color }}
      />

      {/* NOW badge */}
      {event.isNow && (
        <div
          className="absolute right-2 top-2 px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#7C6BF0] border border-[#7C6BF060] text-[#9B8DF5] animate-pulse"
        >
          NOW ACTIVE
        </div>
      )}

      <div className="ml-1 flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold tracking-widest text-[#7C6BF0]">
            {day}
          </span>
        </div>
        <div className="text-xs font-bold mt-0.5 leading-snug text-white pr-10">
          {event.title}
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-300">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-[#9B8DF5]" />
            <span>{start} — {end}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 truncate text-stone-400">
              <MapPin size={11} />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ScheduleTimeline() {
  const events            = useAegisStore((s) => s.calendarEvents);
  const setCalendarEvents = useAegisStore((s) => s.setCalendarEvents);
  const pushLog           = useAegisStore((s) => s.pushLog);
  const startOp           = useAegisStore((s) => s.startOp);
  const endOp             = useAegisStore((s) => s.endOp);
  const setLastCalendarSync = useAegisStore((s) => s.setLastCalendarSync);

  const containerRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(async () => {
    startOp('cal-sync');
    try {
      const res  = await fetch('/api/calendar');
      const data = await res.json();
      if (data.events) {
        setCalendarEvents(data.events);
        setLastCalendarSync(new Date().toISOString());
        pushLog({
          source:  'calendar',
          message: `Calendar sync: ${data.events.length} timetable events loaded`,
          level:   'info',
        });
      }
    } catch (err) {
      pushLog({ source: 'calendar', message: `Calendar sync failed: ${err}`, level: 'error' });
    } finally {
      endOp('cal-sync');
    }
  }, [startOp, endOp, pushLog, setCalendarEvents, setLastCalendarSync]);

  useEffect(() => {
    if (events.length === 0) sync();
  }, []);

  const displayEvents = events.length > 0 ? events : [
    {
      id: 'demo-1',
      title: 'ANTH-202: Archaeology Lecture',
      start: new Date(Date.now() - 30 * 60000).toISOString(),
      end:   new Date(Date.now() + 60 * 60000).toISOString(),
      location: 'Stevens Hall 204',
      isNow: true,
      color: '#9B8DF5',
    },
    {
      id: 'demo-2',
      title: 'BUSN-296: Legal Environment Study Session',
      start: new Date(Date.now() + 120 * 60000).toISOString(),
      end:   new Date(Date.now() + 210 * 60000).toISOString(),
      location: 'Library Group Room B',
      isNow: false,
      color: '#60A5FA',
    },
    {
      id: 'demo-3',
      title: 'ECON-217: Honors Problem Set Review',
      start: new Date(Date.now() + 300 * 60000).toISOString(),
      end:   new Date(Date.now() + 360 * 60000).toISOString(),
      location: 'Hiner Hall 112',
      isNow: false,
      color: '#F87171',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#9B8DF5]" />
          <span className="text-xs font-bold tracking-widest text-white uppercase">
            LIVE SCHEDULE
          </span>
        </div>
        <button
          onClick={sync}
          className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold text-[#7C6BF0] border border-[#7C6BF0] bg-[#7C6BF0] hover:bg-[#7C6BF0] transition-all"
        >
          <RefreshCw size={10} />
          REFRESH
        </button>
      </div>

      {/* Events List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 pt-2 min-h-0">
        {displayEvents.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
}
