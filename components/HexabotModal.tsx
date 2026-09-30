'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, X, ExternalLink, Copy, Check, Terminal, Play,
  CheckCircle2, RefreshCw, Cpu, Layers, Server, ShieldCheck
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HexabotModal({ isOpen, onClose }: Props) {
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState('Outline the fundamental principles of cultural resource management under NHPA Section 106.');
  const [testingWorkflow, setTestingWorkflow] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/hexabot?action=health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.warn('Hexabot health check error:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runTestAgent = async () => {
    if (!testPrompt.trim()) return;
    setTestingWorkflow(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/hexabot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'agent_run',
          prompt: testPrompt,
          courseCode: 'ANTH-202',
          assignmentName: 'Hexabot Agent Pipeline Test',
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Agent test failed' });
    } finally {
      setTestingWorkflow(false);
    }
  };

  if (!isOpen) return null;

  const isOnline = healthData?.online === true;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: '#0000008A', backdropFilter: 'blur(10px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-sm overflow-hidden border shadow-2xl"
          style={{
            background: '#09090D',
            borderColor: '#6366F160',
            boxShadow: '0 0 35px #6366F125, 0 20px 50px rgba(0,0,0,0.85)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{
              background: 'linear-gradient(90deg, #13122B 0%, #0A0A12 100%)',
              borderColor: '#6366F135',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center text-indigo-400"
                style={{
                  background: '#6366F120',
                  border: '1px solid #6366F160',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-wider text-indigo-200">
                    HEXABOT AGENT ENGINE CONTROL
                  </h2>
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: isOnline ? '#10B98120' : '#F59E0B20',
                      border: `1px solid ${isOnline ? '#10B98160' : '#F59E0B60'}`,
                      color: isOnline ? '#34D399' : '#FBBF24',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: isOnline ? '#34D399' : '#FBBF24' }}
                    />
                    {isOnline ? 'Online (Port 3005)' : 'Standby / Bridge Active'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Autonomous Multi-Step Agent Workflows & Model Context Protocol (MCP) Server
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="p-1.5 rounded text-gray-400 hover:text-indigo-300 hover:bg-[#6366F115] transition-colors"
                title="Refresh Health"
              >
                <RefreshCw size={14} className={loadingHealth ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-300">
            {/* Quick Links & Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Studio UI */}
              <div
                className="p-4 rounded border flex flex-col justify-between"
                style={{ background: '#0E0E18', borderColor: '#6366F130' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Server size={14} /> Hexabot Admin Studio
                    </span>
                    <a
                      href="http://localhost:3005"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 transition-colors"
                    >
                      Launch Studio <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Visual agent workflow designer, execution logs, and channel connectors on port 3005.
                  </p>
                </div>

                <div className="bg-black/50 p-2.5 rounded border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Admin Email:</span>
                    <button
                      onClick={() => copyToClipboard('admin@aegis.system', 'email')}
                      className="font-mono text-gray-300 flex items-center gap-1 hover:text-white"
                    >
                      admin@aegis.system
                      {copiedKey === 'email' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Admin Password:</span>
                    <button
                      onClick={() => copyToClipboard('AegisAgent2026!', 'pwd')}
                      className="font-mono text-gray-300 flex items-center gap-1 hover:text-white"
                    >
                      AegisAgent2026!
                      {copiedKey === 'pwd' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: MCP Server */}
              <div
                className="p-4 rounded border flex flex-col justify-between"
                style={{ background: '#0E0E18', borderColor: '#6366F130' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Terminal size={14} /> Model Context Protocol (MCP)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      HTTP Streamable
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Enables AI coding agents and Antigravity to orchestrate Hexabot tools natively.
                  </p>
                </div>

                <div className="bg-black/50 p-2.5 rounded border border-white/5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500">MCP Endpoint:</span>
                    <button
                      onClick={() => copyToClipboard('http://localhost:3005/api/mcp', 'mcp')}
                      className="font-mono text-emerald-400 flex items-center gap-1 hover:underline"
                    >
                      http://localhost:3005/api/mcp
                      {copiedKey === 'mcp' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Configured in <span className="font-mono text-gray-400">.mcp.json</span> in workspace root.
                  </div>
                </div>
              </div>
            </div>

            {/* Active Hexabot Workflows */}
            <div
              className="p-4 rounded border"
              style={{ background: '#0E0E18', borderColor: '#6366F130' }}
            >
              <h3 className="font-bold text-indigo-200 mb-3 flex items-center gap-2">
                <Layers size={14} /> Integrated Agent Workflows
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-black/40 rounded border border-white/5">
                  <div className="font-bold text-[#7C6BF0] text-xs mb-1">Academic Co-Pilot</div>
                  <p className="text-[11px] text-gray-400">
                    3-stage rubric parsing, knowledge vault grounding, and draft synthesis.
                  </p>
                </div>
                <div className="p-3 bg-black/40 rounded border border-white/5">
                  <div className="font-bold text-sky-400 text-xs mb-1">J.A.R.V.I.S. Voice Reasoning</div>
                  <p className="text-[11px] text-gray-400">
                    Autonomous multi-turn inquiry resolving schedule deadlines and syllabi.
                  </p>
                </div>
                <div className="p-3 bg-black/40 rounded border border-white/5">
                  <div className="font-bold text-purple-400 text-xs mb-1">Exam Drill Solver</div>
                  <p className="text-[11px] text-gray-400">
                    Generates flashcards and quantitative practice drills from vault modules.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Agent Execution Playground */}
            <div
              className="p-4 rounded border space-y-3"
              style={{ background: '#0E0E18', borderColor: '#6366F130' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-indigo-200 flex items-center gap-2">
                  <Cpu size={14} /> Test Hexabot Agent Pipeline
                </h3>
                <button
                  onClick={runTestAgent}
                  disabled={testingWorkflow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                >
                  {testingWorkflow ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Running Agent...
                    </>
                  ) : (
                    <>
                      <Play size={12} /> Execute Workflow
                    </>
                  )}
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter test inquiry for Hexabot agent..."
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Execution result */}
              {testResult && (
                <div className="p-3 bg-black/60 rounded border border-indigo-500/30 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-indigo-400 border-b border-white/10 pb-1">
                    <span>Engine: {testResult.engine}</span>
                    <span>Tokens: ~{testResult.tokens || 180}</span>
                  </div>

                  {testResult.stages && (
                    <div className="flex gap-2">
                      {testResult.stages.map((st: any) => (
                        <div
                          key={st.stage}
                          className="flex-1 p-2 rounded bg-indigo-950/40 border border-indigo-800/40 text-[10px]"
                        >
                          <div className="font-bold text-indigo-300">Stage {st.stage}: {st.title}</div>
                          <div className="text-gray-400 truncate">{st.detail}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-2 bg-[#08080C] rounded border border-white/5 font-mono text-[11px] text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {testResult.text || testResult.error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-[#0A0A10]"
            style={{ borderColor: '#6366F130' }}
          >
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span>A.E.G.I.S. & Hexabot Agent Co-Execution Architecture</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
