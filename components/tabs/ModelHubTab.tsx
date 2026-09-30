'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, ArrowRight, CheckCircle2, Play, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { ALL_MODELS } from '@/lib/openRouter';
import { useAegisStore } from '@/lib/store';
import type { ModelRoute } from '@/lib/types';

export default function ModelHubTab() {
  const [selectedModel, setSelectedModel] = useState<ModelRoute>(ALL_MODELS[0]);
  const [testPrompt, setTestPrompt] = useState<string>('Explain the Commerce Clause and its application in business regulation in 2 concise paragraphs.');
  const [response, setResponse] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const preferredProvider = useAegisStore((s) => s.preferredProvider);
  const setPreferredProvider = useAegisStore((s) => s.setPreferredProvider);
  const pushLog = useAegisStore((s) => s.pushLog);
  const startOp = useAegisStore((s) => s.startOp);
  const endOp   = useAegisStore((s) => s.endOp);

  const runTestPrompt = async () => {
    if (!testPrompt.trim() || testing) return;
    setTesting(true);
    setResponse('');
    const startTime = performance.now();
    startOp(`test-${selectedModel.model}`);

    pushLog({
      source: selectedModel.provider === 'nvidia' ? 'nvidia' : 'openrouter',
      message: `Direct Prompt Test → Routing to ${selectedModel.modelDisplay}...`,
      level: 'info',
    });

    try {
      const res = await fetch('/api/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          courseCode: 'ALL',
          selectedModelId: selectedModel.model,
          messages: [{ role: 'user', content: testPrompt }],
        }),
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);
      setLastLatency(elapsed);

      if (data.text) {
        setResponse(data.text);
        pushLog({
          source: selectedModel.provider === 'nvidia' ? 'nvidia' : 'openrouter',
          message: `Inference succeeded via ${data.provider.toUpperCase()} (${elapsed}ms, ~${data.tokens} tokens)`,
          level: 'success',
          model: data.model,
          tokens: data.tokens,
        });
      } else {
        setResponse(`Error: ${data.error || 'Unknown error'}`);
        pushLog({
          source: selectedModel.provider === 'nvidia' ? 'nvidia' : 'openrouter',
          message: `Inference error: ${data.error}`,
          level: 'error',
        });
      }
    } catch (err) {
      setResponse(`Network Error: ${err}`);
    } finally {
      setTesting(false);
      endOp(`test-${selectedModel.model}`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#070709' }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 gap-2"
        style={{ borderColor: '#2A252025', background: '#0D0D11CC' }}
      >
        <div className="flex items-center gap-3">
          <Cpu size={16} style={{ color: '#9B8DF5' }} />
          <div>
            <div className="text-xs font-bold tracking-[0.2em]" style={{ color: '#9B8DF5' }}>
              MULTI-MODEL INFERENCE COCKPIT
            </div>
            <div className="text-[9px] tracking-wider hidden sm:block" style={{ color: '#3D3580' }}>
              OPENROUTER (1B TOKEN POOL) + NVIDIA NIM CLUSTER
            </div>
          </div>
        </div>

        {/* Global Provider Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-wider text-stone-400" style={{ color: '#8A8A9A' }}>
            ROUTING MODE:
          </span>
          {(['auto', 'openrouter', 'nvidia'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreferredProvider(p)}
              className="px-2.5 py-1 rounded-sm text-[9px] font-bold tracking-wider uppercase transition-all"
              style={{
                background: preferredProvider === p ? '#7C6BF025' : '#0D0D11',
                border: `1px solid ${preferredProvider === p ? '#7C6BF060' : '#2A252030'}`,
                color: preferredProvider === p ? '#B4A5FF' : '#8A8A9A',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Two-Column View ────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto lg:overflow-hidden pb-24 lg:pb-0">
        {/* Left 5 Cols: Model Catalog */}
        <div
          className="w-full lg:col-span-5 border-b lg:border-b-0 lg:border-r overflow-y-visible lg:overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 shrink-0"
          style={{ borderColor: '#2A252020', background: '#0A0A0E' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] tracking-[0.25em] font-bold" style={{ color: '#3D3580' }}>
              ACTIVE MODEL CATALOG ({ALL_MODELS.length})
            </span>
            <span className="text-[9px]" style={{ color: '#4ADE80' }}>
              ● 2 CLUSTERS LIVE
            </span>
          </div>

          {ALL_MODELS.map((model) => {
            const isSelected = selectedModel.model === model.model;
            return (
              <motion.div
                key={model.model}
                onClick={() => setSelectedModel(model)}
                className="p-3.5 rounded-sm cursor-pointer transition-all relative overflow-hidden"
                style={{
                  background: isSelected ? `${model.color}15` : '#0D0D1160',
                  border: `1px solid ${isSelected ? `${model.color}60` : '#2A252025'}`,
                }}
                whileHover={{ x: 2 }}
              >
                {/* Left color bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: model.color }}
                />

                <div className="ml-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold tracking-wide" style={{ color: model.color }}>
                      {model.modelDisplay}
                    </div>
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider"
                      style={{
                        background: model.provider === 'nvidia' ? '#76B90020' : '#7C6BF020',
                        color: model.provider === 'nvidia' ? '#76B900' : '#9B8DF5',
                        border: `1px solid ${model.provider === 'nvidia' ? '#76B90040' : '#7C6BF040'}`,
                      }}
                    >
                      {model.provider}
                    </span>
                  </div>

                  <div className="text-[10px] mt-1 text-stone-400 leading-snug">
                    {model.reason}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[9px]" style={{ color: '#3D3580' }}>
                    <span>{model.contextWindow}</span>
                    <span>•</span>
                    <span>Domain: {model.domain}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right 7 Cols: Testing & Diagnostics Console */}
        <div className="w-full lg:col-span-7 flex flex-col overflow-visible lg:overflow-hidden p-4 sm:p-6 gap-4" style={{ background: '#070709' }}>
          {/* Selected Model Details Header */}
          <div
            className="p-4 rounded-sm border flex items-center justify-between"
            style={{
              background: '#0D0D1190',
              borderColor: `${selectedModel.color}35`,
            }}
          >
            <div>
              <div className="text-sm font-bold tracking-wider" style={{ color: selectedModel.color }}>
                {selectedModel.modelDisplay}
              </div>
              <div className="text-[10px] mt-0.5 text-stone-400">
                Model ID: <span className="font-mono">{selectedModel.model}</span>
              </div>
            </div>
            {lastLatency !== null && (
              <div className="text-right">
                <div className="text-xs font-bold text-[#9B8DF5]">{lastLatency}ms</div>
                <div className="text-[9px]" style={{ color: '#3D3580' }}>LATENCY</div>
              </div>
            )}
          </div>

          {/* Test Prompt Input */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[9px] tracking-[0.25em] font-bold" style={{ color: '#3D3580' }}>
              TEST INFERENCE PROMPT
            </div>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-sm text-xs font-mono outline-none resize-none"
              style={{
                background: '#0D0D11',
                border: '1px solid #2A252035',
                color: '#E0E0E8',
              }}
            />
            <div className="flex justify-end mt-1">
              <button
                onClick={runTestPrompt}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold tracking-wider transition-all"
                style={{
                  background: `${selectedModel.color}20`,
                  border: `1px solid ${selectedModel.color}50`,
                  color: selectedModel.color,
                }}
              >
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {testing ? 'RUNNING INFERENCE...' : 'EXECUTE TEST'}
              </button>
            </div>
          </div>

          {/* Response Console */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-[9px] tracking-[0.25em] font-bold mb-1" style={{ color: '#3D3580' }}>
              INFERENCE OUTPUT CONSOLE
            </div>
            <div
              className="flex-1 p-4 rounded-sm font-mono text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap"
              style={{
                background: '#040406',
                border: '1px solid #2A252025',
                color: '#D6C8B0',
              }}
            >
              {response ? (
                response
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-stone-600 text-center">
                  <Sparkles size={24} style={{ opacity: 0.3 }} />
                  <div>Select a model and click Execute Test to inspect live inference response.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
