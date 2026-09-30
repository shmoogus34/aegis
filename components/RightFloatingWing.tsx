'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, GraduationCap, FileText, FolderSearch, Cpu,
  Send, Loader2, Volume2, Sparkles, StopCircle, CornerDownLeft
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import { cleanAiResponse } from '@/lib/cleanAiResponse';
import AssignmentModal from './AssignmentModal';
import StudyToolModal from './study/StudyToolModal';
import type { Assignment } from '@/lib/types';
import type { StudyToolItem } from '@/lib/studyTools/types';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export default function RightFloatingWing() {
  const setActiveModal = useAegisStore((s) => s.setActiveModal);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);

  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<string>(
    'Good evening, sir. Gemini 3.8 Flash is online via Google AI Studio with full memory and access to all 6 course vaults. What do you need?'
  );
  const [conversationHistory, setConversationHistory] = useState<ChatTurn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [activeStudyTool, setActiveStudyTool] = useState<StudyToolItem | null>(null);
  const [latestGeneratedTool, setLatestGeneratedTool] = useState<StudyToolItem | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const cleanupMediaStream = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
  };

  const sendVoiceQuery = async (audioBase64?: string, promptText?: string) => {
    setState('thinking');
    const opId = `jarvis-${Date.now()}`;
    startOp(opId);

    const activePrompt = promptText || transcript || '';

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          prompt: activePrompt,
          voiceId: 'JBFqnCBsd6RMkjVDRZzb',
          history: conversationHistory, // Multi-turn memory
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        const cleaned = cleanAiResponse(data.text);
        setLastResponse(cleaned);

        if (data.generatedTool) {
          setActiveStudyTool(data.generatedTool);
          setLatestGeneratedTool(data.generatedTool);
        }

        // Update multi-turn memory
        setConversationHistory((prev) => [
          ...prev.slice(-6),
          { role: 'user', content: activePrompt },
          { role: 'assistant', content: cleaned },
        ]);

        if (data.audioBase64) {
          setState('speaking');
          const audio = new Audio(data.audioBase64);
          audioRef.current = audio;
          audio.onended = () => setState('idle');
          audio.onerror = () => setState('idle');
          await audio.play().catch((e) => console.warn('Autoplay prevented:', e));
        } else {
          setState('idle');
        }
      } else {
        setLastResponse(`I apologize, sir: ${data.error || 'Could not process query.'}`);
        setState('idle');
      }
    } catch (err: any) {
      setLastResponse(`Connection error: ${err.message || err}`);
      setState('idle');
    } finally {
      endOp(opId);
      setTextInput('');
      setTranscript('');
      setTimeout(() => {
        if (transcriptBoxRef.current) {
          transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const startRecording = async () => {
    stopAudio();
    setTranscript('');
    audioChunksRef.current = [];

    if (typeof window === 'undefined') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 500) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            sendVoiceQuery(base64Audio, transcript);
          };
          reader.readAsDataURL(audioBlob);
        } else if (transcript.trim().length > 0) {
          sendVoiceQuery(undefined, transcript.trim());
        } else {
          setState('idle');
        }
        cleanupMediaStream();
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setState('listening');

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) setTranscript(e.results[i][0].transcript);
              else interim += e.results[i][0].transcript;
            }
            if (interim) setTranscript(interim);
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Microphone access denied:', err);
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  };

  const toggleMic = () => {
    if (state === 'listening') stopRecording();
    else if (state === 'speaking') { stopAudio(); setState('idle'); }
    else startRecording();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === 'thinking') return;
    sendVoiceQuery(undefined, textInput.trim());
  };

  const triggerTeachMeQuiz5 = () => {
    setSelectedAssignment({
      id: 'd5',
      courseId: 'econ',
      courseName: 'ECON-217: Principles of Microeconomics',
      courseCode: 'ECON-217',
      courseColor: '#7C6BF0',
      name: 'Quiz 5: Market Structures & Monopoly Pricing',
      dueAt: '2026-10-02T23:59:00',
      pointsPossible: 25,
      submissionType: ['online_quiz'],
      submitted: false,
      missing: false,
      late: false,
      lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    });
  };

  const triggerDraftAssignment = () => {
    setSelectedAssignment({
      id: 'd6',
      courseId: 'math',
      courseName: 'MATH-171: Statistical Decision Making',
      courseCode: 'MATH-171',
      courseColor: '#7C6BF0',
      name: 'Quiz 3: Normal Distribution & CLT',
      dueAt: '2026-10-04T23:59:00',
      pointsPossible: 20,
      submissionType: ['online_quiz'],
      submitted: false,
      missing: false,
      late: false,
      lockdownBrowser: false,
      htmlUrl: 'https://longwood.instructure.com',
    });
  };

  return (
    <>
      {/* Responsive width: full width on mobile/tablet, fixed 80 on desktop */}
      <div className="w-full lg:w-80 h-full flex flex-col rounded-3xl liquid-glass-card p-4 overflow-hidden select-none justify-between">
        {/* Top: Section Title */}
        <div className="flex items-center justify-between shrink-0 mb-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-sans">
            AI Co-Pilot Hub
          </span>
          <span className="text-[10px] font-mono text-[#9B8DF5] font-semibold">GEMINI 3.8 FLASH</span>
        </div>

        {/* 2-Column Quick-Action Button Grid (Fixed Height) */}
        <div className="grid grid-cols-2 gap-2 shrink-0 mb-3">
          <button
            onClick={triggerTeachMeQuiz5}
            className="flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7C6BF0]/50 hover:bg-[#7C6BF0]/10 transition-all cursor-pointer group text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-[#7C6BF0]/20 flex items-center justify-center text-[#9B8DF5] mb-1.5 group-hover:scale-105 transition-transform">
              <GraduationCap size={13} />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-[#B4A5FF] transition-colors">
              Teach Me
            </span>
            <span className="text-[9px] text-zinc-400 font-mono truncate w-full">
              Quiz 5 (Econ)
            </span>
          </button>

          <button
            onClick={triggerDraftAssignment}
            className="flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7C6BF0]/50 hover:bg-[#7C6BF0]/10 transition-all cursor-pointer group text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-[#7C6BF0]/20 flex items-center justify-center text-[#9B8DF5] mb-1.5 group-hover:scale-105 transition-transform">
              <FileText size={13} />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-[#B4A5FF] transition-colors">
              Study Prep
            </span>
            <span className="text-[9px] text-zinc-400 font-mono truncate w-full">
              Quiz 3 (Math)
            </span>
          </button>

          <button
            onClick={() => setActiveModal('obsidian')}
            className="flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7C6BF0]/50 hover:bg-[#7C6BF0]/10 transition-all cursor-pointer group text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-[#7C6BF0]/20 flex items-center justify-center text-[#9B8DF5] mb-1.5 group-hover:scale-105 transition-transform">
              <FolderSearch size={13} />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-[#B4A5FF] transition-colors">
              Search Vault
            </span>
            <span className="text-[9px] text-zinc-400 font-mono truncate w-full">
              242 Markdown Notes
            </span>
          </button>

          <button
            onClick={() => setActiveModal('model-router')}
            className="flex flex-col items-start p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7C6BF0]/50 hover:bg-[#7C6BF0]/10 transition-all cursor-pointer group text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-[#7C6BF0]/20 flex items-center justify-center text-[#9B8DF5] mb-1.5 group-hover:scale-105 transition-transform">
              <Cpu size={13} />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-[#B4A5FF] transition-colors">
              Model Hub
            </span>
            <span className="text-[9px] text-zinc-400 font-mono truncate w-full">
              Gemini & GPT-4o
            </span>
          </button>
        </div>

        {/* Voice & Input Control Card (Locked Fixed Height, Won't Vary With Length) */}
        <div className="flex-1 flex flex-col justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 font-sans">
              <Sparkles size={11} className="text-[#9B8DF5]" />
              J.A.R.V.I.S. (Memory Active)
            </span>
            <span className="text-[10px] font-mono text-[#9B8DF5] font-semibold">
              {state.toUpperCase()}
            </span>
          </div>

          {/* Prominent Large Pulsing Jarvis Orb */}
          <div className="flex flex-col items-center justify-center py-2 shrink-0">
            <div className="relative flex items-center justify-center">
              {(state === 'listening' || state === 'speaking') && (
                <>
                  <div className="absolute w-28 h-28 rounded-full border border-[#7C6BF0]/40 animate-ping" />
                  <div className="absolute w-32 h-32 rounded-full border border-[#9B8DF5]/20 animate-pulse" />
                </>
              )}

              <button
                onClick={toggleMic}
                title="Tap to speak with J.A.R.V.I.S."
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10 ${
                  state === 'listening'
                    ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105'
                    : state === 'speaking'
                    ? 'bg-[#7C6BF0] text-white shadow-[#7C6BF0]/50 animate-pulse'
                    : 'bg-zinc-900 border border-white/[0.12] text-zinc-200 hover:text-white hover:border-[#7C6BF0] hover:bg-zinc-800'
                }`}
              >
                {state === 'listening' ? (
                  <StopCircle size={32} />
                ) : state === 'speaking' ? (
                  <Volume2 size={32} />
                ) : state === 'thinking' ? (
                  <Loader2 size={32} className="animate-spin text-[#9B8DF5]" />
                ) : (
                  <Mic size={32} className="text-[#9B8DF5]" />
                )}
              </button>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-2.5 font-sans">
              {state === 'listening' ? 'Listening...' : state === 'speaking' ? 'Speaking...' : state === 'thinking' ? 'Reasoning with Gemini...' : 'Tap To Speak'}
            </div>
          </div>

          {/* Fixed-Height Scrollable Response Window (Never Expands or Alters Container Size) */}
          <div
            ref={transcriptBoxRef}
            className="h-28 overflow-y-auto p-2.5 rounded-lg bg-black/45 border border-white/[0.04] text-[11px] text-zinc-300 leading-relaxed font-sans shrink-0 custom-scrollbar flex flex-col justify-between"
          >
            <div>
              {state === 'listening' && transcript ? (
                <span className="text-white italic">"{transcript}"</span>
              ) : (
                <span>{lastResponse}</span>
              )}
            </div>

            {latestGeneratedTool && (
              <button
                type="button"
                onClick={() => setActiveStudyTool(latestGeneratedTool)}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7C6BF0]/20 border border-[#7C6BF0]/40 text-[#B4A5FF] hover:bg-[#7C6BF0]/30 text-[10px] font-mono font-bold transition-all w-full text-left"
              >
                <Sparkles size={11} className="text-[#9B8DF5] shrink-0" />
                <span className="truncate">Open {latestGeneratedTool.title}</span>
                <span className="ml-auto shrink-0">&rarr;</span>
              </button>
            )}
          </div>

          {/* Soft-Edged Input Bar */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-1.5 shrink-0 pt-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask Jarvis anything..."
              className="flex-1 liquid-glass-input rounded-full px-3.5 py-1.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || state === 'thinking'}
              className="w-8 h-8 sm:w-7 sm:h-7 rounded-full liquid-glass-btn text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <CornerDownLeft size={14} />
            </button>
          </form>
        </div>
      </div>

      {selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {activeStudyTool && (
        <StudyToolModal
          tool={activeStudyTool}
          isOpen={Boolean(activeStudyTool)}
          onClose={() => setActiveStudyTool(null)}
          onUpdateTool={(up) => {
            setActiveStudyTool(up);
            setLatestGeneratedTool(up);
          }}
        />
      )}
    </>
  );
}
