'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Sparkles, BookOpen, Layers, ExternalLink,
  ChevronRight, Eye, RefreshCw, Compass, ArrowUpRight, Zap, X
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';
import CourseKnowledgeModal from './CourseKnowledgeModal';
import AssignmentModal from './AssignmentModal';
import type { Assignment } from '@/lib/types';

interface GraphNode {
  id: string;
  label: string;
  community: number;
  community_name: string;
  color: { background: string; border: string; highlight: { background: string; border: string } };
  size: number;
  file_type: string;
  source_file: string;
  title: string;
  degree: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  confidence: string;
  title: string;
  width: number;
  color: { color: string; highlight: string };
  dashes: boolean;
}

export default function GraphifyView() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [connectedNeighbors, setConnectedNeighbors] = useState<GraphNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommunity, setActiveCommunity] = useState<number | null>(null);
  const [selectedCourseModal, setSelectedCourseModal] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setActiveTab = useAegisStore((s) => s.setActiveTab);
  const pushLog = useAegisStore((s) => s.pushLog);

  // Load Graphify data
  useEffect(() => {
    async function loadGraphData() {
      try {
        const res = await fetch('/api/graphify');
        if (res.ok) {
          const data = await res.json();
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          // Do not auto-select node so the graph starts 100% full-screen and uncluttered
        }
      } catch (err) {
        console.error('Error loading graphify data:', err);
      }
    }
    loadGraphData();
  }, []);

  const handleSelectNode = (node: GraphNode, allNodes: GraphNode[] = nodes, allEdges: GraphEdge[] = edges) => {
    setSelectedNode(node);
    const neighborIds = new Set<string>();
    allEdges.forEach((e) => {
      if (e.from === node.id) neighborIds.add(e.to);
      if (e.to === node.id) neighborIds.add(e.from);
    });
    const neighbors = allNodes.filter((n) => neighborIds.has(n.id));
    setConnectedNeighbors(neighbors);
  };

  const handleNodeAction = (node: GraphNode) => {
    if (node.id.startsWith('URGENT')) {
      const isBusn = node.id.includes('BUSN');
      setSelectedAssignment({
        id: isBusn ? 'u4' : 'u1',
        courseId: isBusn ? 'busn296' : 'anth',
        courseName: isBusn ? 'BUSN-296: Legal Environment' : 'ANTH-202: Archaeology',
        courseCode: isBusn ? 'BUSN-296' : 'ANTH-202',
        courseColor: isBusn ? '#60A5FA' : '#E8B368',
        name: node.label,
        dueAt: isBusn ? '2026-09-21T23:59:00' : '2026-09-20T23:59:00',
        pointsPossible: isBusn ? 100 : 25,
        submissionType: ['online_assignment'],
        submitted: false,
        missing: false,
        late: false,
        lockdownBrowser: isBusn,
        htmlUrl: 'https://longwood.instructure.com',
      });
    } else {
      // Open Course Knowledge modal
      const codeMatch = node.community_name.split(':')[0].trim();
      setSelectedCourseModal(codeMatch || 'BUSN-296');
    }
  };

  const communities = [
    { id: null, label: 'ALL COMMUNITIES', color: '#D4A359' },
    { id: 0, label: 'ANTH-202', color: '#E8B368' },
    { id: 1, label: 'BUSN-296', color: '#60A5FA' },
    { id: 2, label: 'BUSN-110', color: '#4ADE80' },
    { id: 3, label: 'CTZN-110', color: '#C084FC' },
    { id: 4, label: 'ECON-217', color: '#F87171' },
    { id: 5, label: 'MATH-171', color: '#4DD9E0' },
  ];

  const filteredNodes = nodes.filter((n) => {
    const matchesSearch = !searchQuery.trim() || n.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesComm = activeCommunity === null || n.community === activeCommunity;
    return matchesSearch && matchesComm;
  });

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden select-none" style={{ background: '#070709' }}>
      {/* ── Top Bar: Search, Communities & Controls ────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0 z-20"
        style={{ background: '#0B0B11F0', borderColor: '#2A252030' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-amber-light uppercase">
              GRAPHIFY KNOWLEDGE NETWORK
            </span>
          </div>
          <span className="text-[10px] text-stone-400 font-mono hidden md:inline">
            ({nodes.length} NODES // {edges.length} RELATIONS)
          </span>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              placeholder="Search concepts, rules, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-sm text-xs font-mono outline-none w-56 bg-black/80 border border-stone-800 text-stone-200 focus:border-amber-500/60"
            />
          </div>

          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-bold tracking-wider text-amber-light border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all"
          >
            <Compass size={12} />
            {showReport ? 'HIDE REPORT' : 'GOD NODES'}
          </button>
        </div>
      </div>

      {/* ── Community Filter Row ───────────────────────────── */}
      <div
        className="flex items-center gap-2 px-6 py-2 border-b overflow-x-auto shrink-0 z-10"
        style={{ background: '#07070BF0', borderColor: '#2A252020' }}
      >
        {communities.map((comm) => {
          const isActive = activeCommunity === comm.id;
          return (
            <button
              key={comm.label}
              onClick={() => setActiveCommunity(comm.id)}
              className="flex items-center gap-2 px-3 py-1 rounded text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap"
              style={{
                background: isActive ? `${comm.color}25` : '#0E0E14',
                border: `1px solid ${isActive ? comm.color : '#2A252040'}`,
                color: isActive ? '#FFFFFF' : '#A89F91',
                boxShadow: isActive ? `0 0 10px ${comm.color}30` : 'none',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: comm.color }} />
              {comm.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Viewport Area ─────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Full Interactive Graph Canvas via iframe (standalone Vis.js network) */}
        <div className="flex-1 h-full relative">
          <iframe
            ref={iframeRef}
            src="/graphify/graph.html"
            className="w-full h-full border-none"
            title="Graphify Obsidian Knowledge Graph"
          />
        </div>

        {/* ── Right Overlay Drawer: Node Inspector & Neighbors ── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-84 max-w-[90vw] border-l flex flex-col z-30 shadow-2xl"
              style={{
                background: '#0B0B11FA',
                borderColor: '#2A252080',
                backdropFilter: 'blur(20px)',
              }}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
            >
              {/* Inspector Header with Close Button */}
              <div className="p-4 border-b border-stone-800 shrink-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest font-mono"
                    style={{
                      background: `${selectedNode.color.background}25`,
                      color: selectedNode.color.background,
                      border: `1px solid ${selectedNode.color.background}40`,
                    }}
                  >
                    {selectedNode.file_type.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-mono">
                      {selectedNode.degree} CONNECTIONS
                    </span>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                      title="Close Inspector"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                  {selectedNode.label}
                </h3>

                <div className="text-xs text-stone-400 mt-1">
                  {selectedNode.community_name}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleNodeAction(selectedNode)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-sm text-xs font-bold text-amber-light border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 transition-all shadow-[0_0_10px_#D4A35915]"
                  >
                    <BookOpen size={13} />
                    EXPLORE KNOWLEDGE
                  </button>
                </div>
              </div>

            {/* Connected Neighbors List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <div className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">
                CONNECTED CONCEPTS ({connectedNeighbors.length})
              </div>

              {connectedNeighbors.map((nb) => (
                <div
                  key={nb.id}
                  onClick={() => handleSelectNode(nb)}
                  className="p-2 rounded-sm border border-stone-800/80 bg-black/40 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: nb.color.background }} />
                    <span className="text-xs text-stone-200 group-hover:text-amber-light truncate">
                      {nb.label}
                    </span>
                  </div>
                  <ChevronRight size={12} className="text-stone-500 group-hover:text-amber transition-colors" />
                </div>
              ))}
            </div>

            {/* Quick Vault Link */}
            {selectedNode.source_file && (
              <div className="p-3 border-t border-stone-800 text-[10px] text-stone-400 flex items-center justify-between bg-black/30">
                <span className="truncate max-w-[200px]">{selectedNode.source_file}</span>
                <button
                  onClick={() => setActiveTab('vault')}
                  className="text-amber hover:text-amber-light font-bold"
                >
                  VAULT ↗
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── God Nodes Report Drawer Overlay ────────────────── */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            className="absolute inset-x-8 top-12 bottom-12 rounded-sm z-30 border p-6 flex flex-col overflow-hidden"
            style={{
              background: '#0B0B11F8',
              borderColor: '#E8B36860',
              boxShadow: '0 0 50px rgba(0,0,0,0.9), 0 0 30px #E8B36820',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-amber-light" />
                <span className="text-sm font-bold tracking-widest text-amber uppercase">
                  GRAPHIFY REPORT: GOD NODES & INTERDISCIPLINARY BRIDGES
                </span>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="text-stone-400 hover:text-white px-2 py-1"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-200">
              {/* Left Column: God Nodes */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-amber-light uppercase tracking-wider">
                  👑 Top God Nodes (Highest Connective Centrality)
                </h4>
                {[
                  { name: 'BUSN-296: Legal Environment of Business', degree: 36, comm: 'Law & Contracts' },
                  { name: 'ANTH-202: Archaeology & Material Culture', degree: 33, comm: 'Archaeology' },
                  { name: 'MATH-171: Statistical Decision Making', degree: 30, comm: 'Quantitative Inference' },
                  { name: 'CTZN-110: Social Entrepreneurship', degree: 28, comm: 'Social Impact' },
                  { name: 'ECON-217: Principles of Microeconomics', degree: 24, comm: 'Economic Theory' },
                  { name: 'BUSN-110: Business Bootcamp', degree: 24, comm: 'Student Success' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-sm border border-stone-800 bg-black/40 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{item.comm}</div>
                    </div>
                    <span className="text-xs font-bold text-amber px-2 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20">
                      {item.degree} Edges
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Column: Surprising Cross-Course Connections */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  ⚡ Surprising Cross-Course Bridges
                </h4>
                {[
                  {
                    title: 'BUSN-296 Negligence ↔ ANTH-202 NAGPRA Ethics',
                    why: 'Legal fiduciary duties of care directly map onto archaeological ethical requirements under NAGPRA for artifact repatriation.',
                  },
                  {
                    title: 'ECON-217 Elasticity ↔ MATH-171 Normal Distribution',
                    why: 'Total revenue elasticity thresholds are empirically validated using sample hypothesis testing and standard deviations.',
                  },
                  {
                    title: 'CTZN-110 Theory of Change ↔ ECON-217 Market Failure',
                    why: 'Social enterprises intervene specifically where free markets produce negative externalities or underprovide public goods.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-sm border border-cyan-500/30 bg-cyan-950/10">
                    <div className="font-bold text-cyan-200">{item.title}</div>
                    <div className="text-[11px] text-stone-300 mt-1 leading-relaxed">{item.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {selectedCourseModal && (
        <CourseKnowledgeModal
          courseCode={selectedCourseModal}
          onClose={() => setSelectedCourseModal(null)}
        />
      )}

      {selectedAssignment && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}
