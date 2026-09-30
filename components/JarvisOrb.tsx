'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Volume2, X, Send, Loader2, Square, AlertCircle, Sparkles
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

type JarvisState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function JarvisOrb() {
  const [state, setState] = useState<JarvisState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastUserSpoken, setLastUserSpoken] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string>(
    'Good day, sir. A.E.G.I.S. is online and your academic schedule is ready. What do you need?'
  );
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<'JBFqnCBsd6RMkjVDRZzb' | 'onwK4e9ZLuTAKqWW03F9'>('JBFqnCBsd6RMkjVDRZzb'); // George (Jarvis)
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [agentEngine, setAgentEngine] = useState<'direct' | 'hexabot'>('direct');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveInfo, setLiveInfo] = useState<{
    time?: string;
    date?: string;
    dayOfWeek?: string;
    weather?: {
      location: string;
      tempF: number;
      feelsLikeF?: number;
      condition: string;
      highF: number;
      lowF: number;
      humidity?: number;
      windMph?: number;
      rainChance?: number;
    };
    newsCount?: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const pushLog = useAegisStore((s) => s.pushLog);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);

  const cleanupMediaStream = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioPlaying(false);
  };

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      cleanupMediaStream();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  // Fetch initial live status (clock, Farmville weather, news) and poll every 60s
  useEffect(() => {
    async function fetchLiveStatus() {
      try {
        const res = await fetch('/api/voice');
        if (res.ok) {
          const data = await res.json();
          if (data.timeInfo && data.weather) {
            setLiveInfo({
              time: data.timeInfo.formattedTime,
              date: data.timeInfo.formattedDate,
              dayOfWeek: data.timeInfo.dayOfWeek,
              weather: {
                location: data.weather.locationName,
                tempF: data.weather.currentTempF,
                feelsLikeF: data.weather.feelsLikeF,
                condition: data.weather.condition,
                highF: data.weather.todayMaxTempF,
                lowF: data.weather.todayMinTempF,
                humidity: data.weather.humidityPercent,
                windMph: data.weather.windSpeedMph,
                rainChance: data.weather.precipitationProbabilityMax,
              },
              newsCount: data.news?.length || 0,
            });
          }
        }
      } catch (e) {
        console.warn('Failed to fetch live status:', e);
      }
    }
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  /** Dispatch voice audio or text to backend Jarvis endpoint */
  const sendVoiceQuery = async (audioBase64?: string, textPrompt?: string) => {
    stopAudio();
    setState('thinking');
    setIsBubbleOpen(true);
    const opId = `jarvis-${Date.now()}`;
    startOp(opId);

    pushLog({
      source: 'openrouter',
      message: audioBase64
        ? 'Transcribing voice recording via ElevenLabs Scribe STT...'
        : `J.A.R.V.I.S. Query: "${textPrompt?.slice(0, 50)}..."`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: audioBase64 || undefined,
          prompt: textPrompt || undefined,
          voiceId: selectedVoice,
          agentEngine,
        }),
      });

      const data = await res.json();

      if (data.liveInfo) {
        setLiveInfo(data.liveInfo);
      }

      if (data.transcribedText) {
        setLastUserSpoken(data.transcribedText);
      } else if (textPrompt) {
        setLastUserSpoken(textPrompt);
      }

      if (data.text) {
        setLastResponse(data.text);
        pushLog({
          source: 'openrouter',
          message: `J.A.R.V.I.S.: Spoken response synthesized via ElevenLabs George`,
          level: 'success',
        });

        // Automatically play the ElevenLabs audio reply
        if (data.audioBase64) {
          setState('speaking');
          setAudioPlaying(true);
          const audio = new Audio(data.audioBase64);
          audioRef.current = audio;
          audio.onended = () => {
            setState('idle');
            setAudioPlaying(false);
          };
          audio.onerror = () => {
            setState('idle');
            setAudioPlaying(false);
          };
          await audio.play().catch((e) => console.warn('Autoplay prevented:', e));
        } else {
          setState('idle');
        }
      } else {
        setLastResponse(`Sorry, sir: ${data.error || 'I could not process that request.'}`);
        setState('idle');
      }
    } catch (err: any) {
      setLastResponse(`Connection error: ${err.message || err}`);
      setState('idle');
    } finally {
      endOp(opId);
      setTextInput('');
    }
  };

  /** Start recording user voice with MediaRecorder & WebSpeech preview */
  const startRecording = async () => {
    stopAudio();
    setMicError(null);
    setIsBubbleOpen(true);
    setTranscript('');
    audioChunksRef.current = [];
    setRecordSeconds(0);

    if (typeof window === 'undefined') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Select preferred mime type for browser recording
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
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
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

      // Start recording duration timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);

      // Start Web Speech recognition simultaneously for real-time text feedback on screen
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const reco = new SpeechRecognition();
          reco.continuous = true;
          reco.interimResults = true;
          reco.lang = 'en-US';
          reco.onresult = (e: any) => {
            let combined = '';
            for (let i = 0; i < e.results.length; i++) {
              combined += e.results[i][0].transcript + ' ';
            }
            if (combined.trim()) {
              setTranscript(combined.trim());
            }
          };
          reco.onerror = () => {};
          reco.start();
          recognitionRef.current = reco;
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Microphone stream error:', err);
      setMicError('Microphone access denied. Please click the lock icon in your address bar and allow microphone permissions.');
      setState('idle');
    }
  };

  /** Stop recording and auto-send immediately */
  const stopRecordingAndAutoSend = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      cleanupMediaStream();
      if (transcript.trim().length > 0) {
        sendVoiceQuery(undefined, transcript.trim());
      } else {
        setState('idle');
      }
    }
  };

  /** Toggle microphone recording on/off */
  const handleToggleListening = () => {
    if (state === 'speaking') {
      stopAudio();
      setState('idle');
      return;
    }

    if (state === 'listening') {
      // User clicked while listening -> STOP and AUTO-SEND immediately!
      stopRecordingAndAutoSend();
      return;
    }

    // User clicked while idle/thinking -> START recording
    startRecording();
  };

  const padZero = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      {/* ── Floating Draggable Jarvis Core Orb ────────────────── */}
      <motion.div
        drag
        dragMomentum={false}
        className="fixed z-50 cursor-grab active:cursor-grabbing select-none"
        style={{ right: '28px', bottom: '28px' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Aura Ring */}
          <div
            className={`absolute -inset-3.5 rounded-full transition-all duration-500 pointer-events-none ${
              state === 'listening'
                ? 'bg-rose-500/40 animate-ping'
                : state === 'speaking'
                ? 'bg-[#7C6BF0] animate-pulse'
                : state === 'thinking'
                ? 'bg-purple-500/30 animate-spin'
                : 'bg-[#7C6BF0]'
            }`}
          />

          {/* Rotating Dashed Technology Ring */}
          <motion.div
            className="absolute -inset-1.5 rounded-full border border-dashed pointer-events-none"
            style={{
              borderColor: state === 'listening' ? '#F43F5E' : '#9B8DF5',
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: state === 'thinking' ? 3 : 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Main Floating Holographic Core Button */}
          <button
            onClick={handleToggleListening}
            className="relative w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all overflow-hidden shadow-2xl"
            style={{
              background: state === 'listening'
                ? 'radial-gradient(circle, #3F0D15 0%, #170407 100%)'
                : 'radial-gradient(circle, #241A0B 0%, #0D0D14 100%)',
              border: `2px solid ${state === 'listening' ? '#F43F5E' : '#9B8DF5'}`,
              boxShadow: state === 'listening'
                ? '0 0 35px #F43F5E90, inset 0 0 20px #F43F5E50'
                : '0 0 30px #9B8DF570, inset 0 0 15px #9B8DF530',
            }}
            title={state === 'listening' ? 'Recording live — Click to stop and auto-send' : 'Click to record voice message for J.A.R.V.I.S.'}
          >
            {state === 'thinking' ? (
              <Loader2 size={26} className="text-[#9B8DF5] animate-spin" />
            ) : state === 'listening' ? (
              <div className="flex flex-col items-center">
                <Square size={20} className="text-rose-400 fill-rose-500 animate-pulse" />
                <span className="text-[8px] font-bold tracking-widest text-rose-200 mt-1 font-mono">
                  {padZero(Math.floor(recordSeconds / 60))}:{padZero(recordSeconds % 60)}
                </span>
              </div>
            ) : state === 'speaking' ? (
              <Volume2 size={24} className="text-[#9B8DF5] animate-bounce" />
            ) : (
              <div className="flex flex-col items-center">
                <Mic size={22} className="text-[#9B8DF5]" />
                <span className="text-[8px] font-bold tracking-widest text-[#7C6BF0] mt-0.5 font-mono">
                  JARVIS
                </span>
              </div>
            )}
          </button>

          {/* Status Chip Tag */}
          <div
            className="absolute -top-2.5 px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-widest pointer-events-none uppercase font-mono shadow-md"
            style={{
              background: state === 'listening' ? '#F43F5E' : '#9B8DF5',
              color: state === 'listening' ? '#FFFFFF' : '#000000',
            }}
          >
            {state === 'listening' ? 'STOP & SEND' : state}
          </div>
        </div>
      </motion.div>

      {/* ── Holographic Jarvis Speech & Control Dialog ────────── */}
      <AnimatePresence>
        {isBubbleOpen && (
          <motion.div
            className="fixed z-50 rounded-md border p-5 flex flex-col gap-3.5 shadow-2xl"
            style={{
              right: '100px',
              bottom: '28px',
              width: '430px',
              maxWidth: 'calc(100vw - 120px)',
              background: '#0B0B11FA',
              borderColor: state === 'listening' ? '#F43F5E80' : '#9B8DF580',
              boxShadow: '0 0 50px rgba(0,0,0,0.9), 0 0 30px #9B8DF525',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: state === 'listening' ? '#F43F5E' : '#9B8DF5' }}
                />
                <span className="text-xs font-bold tracking-widest text-[#7C6BF0] uppercase font-mono">
                  J.A.R.V.I.S. // ELEVENLABS SCRIBE VOICE
                </span>
              </div>

              <div className="flex items-center gap-2">
                {audioPlaying && (
                  <button
                    onClick={stopAudio}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm bg-red-950/40 text-red-300 border border-red-500/30 hover:bg-red-900/50"
                  >
                    <Square size={10} /> STOP
                  </button>
                )}
                <button
                  onClick={() => setIsBubbleOpen(false)}
                  className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Live Intelligence & Weather HUD Banner */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-black/60 border border-stone-800 text-[10px] font-mono">
              <div className="flex items-center gap-2 text-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[#9B8DF5] font-bold">
                  {liveInfo?.time || 'LIVE CLOCK'}
                </span>
                <span className="text-stone-600">|</span>
                <span className="text-stone-200">
                  {liveInfo?.weather
                    ? `🌤️ ${liveInfo.weather.location}: ${liveInfo.weather.tempF}°F`
                    : '🌤️ Farmville, VA: Loading...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400 font-bold tracking-wider">
                <span>🌐 OMNI-KNOWLEDGE LIVE</span>
              </div>
            </div>

            {/* Error Message if Mic access failed */}
            {micError && (
              <div className="p-3 rounded-sm bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            {/* Live Recording HUD Box */}
            {state === 'listening' && (
              <div className="p-3 rounded-sm bg-rose-950/40 border border-rose-500/60 text-rose-100 flex flex-col gap-2.5 shadow-[0_0_20px_#F43F5E25]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 font-mono">
                      RECORDING AUDIO [{padZero(Math.floor(recordSeconds / 60))}:{padZero(recordSeconds % 60)}]
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-mono">
                    AUTO-SENDS ON STOP
                  </span>
                </div>

                <div className="text-xs text-stone-200 bg-black/50 p-2 rounded border border-rose-500/30 font-mono min-h-[30px] break-words">
                  {transcript || 'Listening to your voice... Speak your request now.'}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={stopRecordingAndAutoSend}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold bg-rose-500 text-white hover:bg-rose-400 transition-all shadow-lg cursor-pointer"
                  >
                    <Square size={12} className="fill-white" />
                    <span>Stop Recording & Send to Jarvis</span>
                  </button>
                </div>
              </div>
            )}

            {/* User Spoken Prompt Display */}
            {lastUserSpoken && (
              <div className="p-2.5 rounded-sm bg-stone-900/80 border border-stone-800 text-xs">
                <div className="text-[10px] text-cyan-400 font-bold mb-1 font-mono uppercase">
                  You (Transcribed):
                </div>
                <div className="text-stone-200 italic">
                  "{lastUserSpoken}"
                </div>
              </div>
            )}

            {/* Jarvis Spoken Response Display */}
            <div className="p-4 rounded-sm bg-black/70 border border-stone-800 font-sans text-sm leading-relaxed text-stone-100 max-h-60 overflow-y-auto">
              <div className="text-[10px] text-[#7C6BF0] font-bold mb-1.5 tracking-wider uppercase font-mono flex items-center gap-2">
                {state === 'speaking' ? (
                  <>
                    <Volume2 size={13} className="text-[#9B8DF5] animate-bounce" />
                    <span>SPEAKING (ELEVENLABS GEORGE)...</span>
                  </>
                ) : (
                  <span>J.A.R.V.I.S.:</span>
                )}
              </div>
              {lastResponse}
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "🌤️ Weather in Farmville",
                "📰 Top news headlines today",
                "⏰ Time & next assignment due",
                "📚 What are my archaeology notes?",
                "🌤️ Weather in Tokyo",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendVoiceQuery(undefined, chip)}
                  disabled={state === 'thinking' || state === 'listening'}
                  className="text-xs px-2.5 py-1 rounded-sm bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:border-[#7C6BF0] transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Silent Typing / Text Query Box */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
              <button
                onClick={handleToggleListening}
                className={`p-2 rounded-sm border transition-all cursor-pointer ${
                  state === 'listening'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_10px_#F43F5E50]'
                    : 'bg-stone-900 text-stone-300 border-stone-800 hover:text-white'
                }`}
                title="Record voice message"
              >
                <Mic size={15} />
              </button>

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && textInput.trim() && sendVoiceQuery(undefined, textInput)}
                placeholder="Ask Jarvis anything (voice or text)..."
                className="flex-1 px-3 py-2 rounded-sm text-xs font-mono outline-none bg-black/80 border border-stone-800 text-stone-200 focus:border-[#7C6BF060]"
              />

              <button
                onClick={() => textInput.trim() && sendVoiceQuery(undefined, textInput)}
                disabled={state === 'thinking' || !textInput.trim()}
                className="px-3 py-2 rounded-sm bg-[#7C6BF0] text-[#7C6BF0] border border-[#7C6BF0] hover:bg-[#7C6BF0] transition-all font-bold text-xs cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
