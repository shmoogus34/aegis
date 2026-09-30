'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useAegisStore } from '@/lib/store';
import CourseKnowledgeModal from './CourseKnowledgeModal';
import AssignmentModal from './AssignmentModal';
import type { Assignment } from '@/lib/types';

// ── Course knowledge base nodes ───────────────────────────────
const COURSES = [
  { id: 'ANTH-202', title: 'Archaeology',                  color: '#E8B368', hex: 0xe8b368, angle: 90,   z:  0.4, notes: '4 Notes' },
  { id: 'BUSN-296', title: 'Legal Environment',            color: '#60A5FA', hex: 0x60a5fa, angle: 30,   z: -0.3, notes: '4 Notes' },
  { id: 'BUSN-110', title: 'Business Bootcamp',            color: '#4ADE80', hex: 0x4ade80, angle: -30,  z:  0.3, notes: '3 Notes' },
  { id: 'MATH-171', title: 'Statistical Decision Making',  color: '#4DD9E0', hex: 0x4dd9e0, angle: -90,  z: -0.3, notes: '4 Notes' },
  { id: 'ECON-217', title: 'Principles of Microeconomics', color: '#F87171', hex: 0xf87171, angle: -150, z:  0.4, notes: '3 Notes' },
  { id: 'CTZN-110', title: 'Social Entrepreneurship',      color: '#C084FC', hex: 0xc084fc, angle: 150,  z: -0.4, notes: '3 Notes' },
] as const;

// Cross-course links
const CROSS_LINKS: [number, number][] = [
  [0, 5], // ANTH ↔ CTZN
  [1, 2], // BUSN-296 ↔ BUSN-110
  [3, 4], // MATH ↔ ECON
  [4, 5], // ECON ↔ CTZN
  [0, 1], // ANTH ↔ BUSN-296
];

// Urgent deliverable nodes
const URGENT_NODES = [
  {
    courseIdx: 0,
    offset: new THREE.Vector3(0.5, 0.9, 0.5),
    assignmentId: 'u1',
    label: 'ANTH-202: Site Preservation',
    due: 'Sep 20',
  },
  {
    courseIdx: 1,
    offset: new THREE.Vector3(1.1, -0.2, 0.5),
    assignmentId: 'u4',
    label: 'BUSN-296: Test 1 Exam',
    due: 'Sep 21',
  },
];

const COURSE_R = 3.2;

function cpos(angle: number, z: number) {
  const r = (angle * Math.PI) / 180;
  return new THREE.Vector3(COURSE_R * Math.cos(r), COURSE_R * Math.sin(r), z);
}

// ── Glowing sphere node with HTML clickable button badge ─────
function InteractiveCourseNode({
  pos,
  course,
  pulse,
  onSelect,
}: {
  pos: THREE.Vector3;
  course: typeof COURSES[number];
  pulse: boolean;
  onSelect: (courseId: string) => void;
}) {
  const inner = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!inner.current) return;
    const t = clock.elapsedTime;
    const s = 1 + (hovered ? 0.25 : 0.08 * Math.sin(t * 2));
    inner.current.scale.setScalar(s);
  });

  return (
    <group position={pos}>
      {/* 3D Sphere */}
      <mesh
        ref={inner}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onSelect(course.id)}
      >
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color={course.hex} />
      </mesh>

      {/* Atmospheric Halo */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial
          color={course.hex}
          transparent
          opacity={hovered ? 0.18 : 0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={course.hex} intensity={hovered ? 2.5 : 1.2} distance={3.5} decay={2} />

      {/* HTML Interactive Button Badge */}
      <Html center distanceFactor={11} zIndexRange={[10, 0]}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(course.id);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex flex-col items-center px-3 py-1.5 rounded-sm transition-all cursor-pointer whitespace-nowrap group select-none"
          style={{
            background: hovered ? '#12121CEE' : '#0B0B11DD',
            border: `1.5px solid ${hovered ? '#FFFFFF' : `${course.color}90`}`,
            boxShadow: `0 0 16px ${course.color}50, 0 4px 12px rgba(0,0,0,0.8)`,
            transform: hovered ? 'scale(1.12)' : 'scale(1)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: course.color }} />
            <span className="text-xs font-bold tracking-widest text-white">
              {course.id}
            </span>
          </div>
          <div className="text-[10px] font-bold text-stone-200 mt-0.5">
            {course.title}
          </div>
          <div
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm mt-1 uppercase tracking-wider"
            style={{
              background: `${course.color}25`,
              color: course.color,
              border: `1px solid ${course.color}40`,
            }}
          >
            OPEN KNOWLEDGE BASE ▶
          </div>
        </button>
      </Html>
    </group>
  );
}

// ── Urgent Task Node with HTML Clickable Badge ───────────────
function InteractiveUrgentNode({
  pos,
  urgent,
  onOpenUrgent,
}: {
  pos: THREE.Vector3;
  urgent: typeof URGENT_NODES[number];
  onOpenUrgent: (id: string) => void;
}) {
  const inner = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!inner.current) return;
    const t = clock.elapsedTime;
    inner.current.scale.setScalar(1 + 0.3 * Math.sin(t * 6));
  });

  return (
    <group position={pos}>
      <mesh
        ref={inner}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onOpenUrgent(urgent.assignmentId)}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color={0xf87171} />
      </mesh>

      <pointLight color={0xf87171} intensity={2} distance={2.5} />

      <Html center distanceFactor={11} zIndexRange={[20, 0]}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenUrgent(urgent.assignmentId);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex flex-col items-center px-2.5 py-1 rounded-sm cursor-pointer whitespace-nowrap select-none transition-all"
          style={{
            background: '#1A0A0ADD',
            border: '1.5px solid #F87171',
            boxShadow: '0 0 15px rgba(248, 113, 113, 0.6)',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <div className="flex items-center gap-1 text-[9px] font-bold text-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>⚠ DUE {urgent.due}</span>
          </div>
          <div className="text-[10px] font-bold text-white">
            {urgent.label}
          </div>
          <div className="text-[8px] text-red-200 mt-0.5 underline">
            CLICK TO SOLVE WITH AI
          </div>
        </button>
      </Html>
    </group>
  );
}

// ── Graph Links ──────────────────────────────────────────────
function Links({ positions, pulse }: { positions: THREE.Vector3[]; pulse: boolean }) {
  const geo = useMemo(() => {
    const verts: number[] = [];
    // Cross-course links
    CROSS_LINKS.forEach(([i, j]) => {
      const a = positions[i], b = positions[j];
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    });
    // Center spoke links
    const center = new THREE.Vector3(0, 0, 0);
    positions.forEach((p) => {
      verts.push(center.x, center.y, center.z, p.x, p.y, p.z);
    });
    // Urgent links
    URGENT_NODES.forEach(({ courseIdx, offset }) => {
      const cp = positions[courseIdx];
      const up = cp.clone().add(offset);
      verts.push(cp.x, cp.y, cp.z, up.x, up.y, up.z);
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return g;
  }, [positions]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial
        color={pulse ? 0xf5c878 : 0xd4a359}
        transparent
        opacity={pulse ? 0.65 : 0.35}
      />
    </lineSegments>
  );
}

// ── 3D Scene ─────────────────────────────────────────────────
function Scene({
  pulse,
  onSelectCourse,
  onOpenUrgent,
}: {
  pulse: boolean;
  onSelectCourse: (id: string) => void;
  onOpenUrgent: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => COURSES.map((c) => cpos(c.angle, c.z)), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y += pulse ? 0.0025 : 0.0006;
    group.current.rotation.x = 0.12 * Math.sin(clock.elapsedTime * 0.1);
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.06} color={0xd4a359} />

      {/* Center A.E.G.I.S. Core Hub */}
      <group position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 20, 20]} />
          <meshBasicMaterial color={0xe8b368} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color={0xd4a359} transparent opacity={0.08} side={THREE.BackSide} />
        </mesh>
        <Html center distanceFactor={11} zIndexRange={[10, 0]}>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-sm select-none pointer-events-none whitespace-nowrap"
            style={{
              background: '#070709EE',
              border: '1px solid #E8B36870',
              boxShadow: '0 0 15px #E8B36840',
            }}
          >
            <span className="text-[9px] font-bold tracking-widest text-amber-light">
              ⬡ A.E.G.I.S. CORE
            </span>
          </div>
        </Html>
      </group>

      {/* 6 Course Nodes */}
      {COURSES.map((c, i) => (
        <InteractiveCourseNode
          key={c.id}
          pos={positions[i]}
          course={c}
          pulse={pulse}
          onSelect={onSelectCourse}
        />
      ))}

      {/* Urgent Deliverables */}
      {URGENT_NODES.map((u, i) => {
        const cp = positions[u.courseIdx];
        const up = cp.clone().add(u.offset);
        return (
          <InteractiveUrgentNode
            key={`urgent-${i}`}
            pos={up}
            urgent={u}
            onOpenUrgent={onOpenUrgent}
          />
        );
      })}

      {/* Structural Links */}
      <Links positions={positions} pulse={pulse} />
    </group>
  );
}

// ── Public VisualCore Component with Bottom Knowledge Bar ─────
export default function VisualCore() {
  const pulse        = useAegisStore((s) => s.spherePulse);
  const activeOps    = useAegisStore((s) => s.activeOps);
  const assignments  = useAegisStore((s) => s.assignments);

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const handleOpenUrgent = (id: string) => {
    const match = assignments.find((a) => a.id === id) || {
      id,
      courseId: id === 'u1' ? 'anth' : 'busn296',
      courseName: id === 'u1' ? 'ANTH-202: Archaeology' : 'BUSN-296: Legal Environment',
      courseCode: id === 'u1' ? 'ANTH-202' : 'BUSN-296',
      courseColor: id === 'u1' ? '#E8B368' : '#60A5FA',
      name: id === 'u1' ? 'Module 2 Discussion — Site Preservation' : 'Test 1 — LockDown Browser + Webcam',
      dueAt: id === 'u1' ? '2026-09-20T23:59:00' : '2026-09-21T23:59:00',
      pointsPossible: id === 'u1' ? 25 : 100,
      submissionType: ['online_assignment'],
      submitted: false,
      missing: false,
      late: false,
      lockdownBrowser: id === 'u4',
      htmlUrl: 'https://longwood.instructure.com',
    };
    setSelectedAssignment(match);
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-between overflow-hidden relative">

      {/* Top Banner Notice */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-sm bg-black/70 border border-amber-500/30 text-[10px] text-amber-light backdrop-blur-md">
        <span>💡 Click any course node to open its Knowledge Base & AI Tutor</span>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full flex-1 min-h-0">
        <Canvas
          camera={{ position: [0, 0, 9.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={5}
            maxDistance={14}
          />
          <Scene
            pulse={pulse}
            onSelectCourse={(id) => setSelectedCourse(id)}
            onOpenUrgent={handleOpenUrgent}
          />
        </Canvas>
      </div>

      {/* ── Bottom Knowledge Base Button Deck (Actual Clickable Buttons) ── */}
      <div
        className="w-full px-4 py-2.5 border-t shrink-0 z-10 flex flex-col gap-1.5"
        style={{ background: '#09090DF0', borderColor: '#2A252030' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.25em] text-amber uppercase">
            COURSE KNOWLEDGE BASES (CLICK TO OPEN)
          </span>
          <span className="text-[9px] text-stone-400">
            6 ACTIVE MODULES // 21 REPOSITORY NOTES
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {COURSES.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course.id)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-all group text-left cursor-pointer"
              style={{
                background: '#0D0D14',
                border: `1px solid ${course.color}40`,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: course.color }} />
                  <span className="text-[10px] font-bold tracking-wider text-white group-hover:text-amber-light truncate">
                    {course.id}
                  </span>
                </div>
                <div className="text-[8px] text-stone-400 truncate">
                  {course.title}
                </div>
              </div>
              <span className="text-[8px] text-stone-500 group-hover:text-amber transition-colors ml-1">
                ▶
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal Dialogs */}
      {selectedCourse && (
        <CourseKnowledgeModal
          courseCode={selectedCourse}
          onClose={() => setSelectedCourse(null)}
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
