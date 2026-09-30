'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FileText, Search, Copy, Check, Sparkles,
  BookOpen, Terminal, ChevronRight, Hash, ExternalLink
} from 'lucide-react';
import { useAegisStore } from '@/lib/store';

const VAULT_COURSES = [
  { code: 'ANTH-202', name: 'Archaeology',                  color: '#9B8DF5', path: 'ANTH-202-Archaeology' },
  { code: 'BUSN-296', name: 'Legal Environment',            color: '#60A5FA', path: 'BUSN-296-Legal-Environment' },
  { code: 'BUSN-110', name: 'Business Bootcamp',            color: '#4ADE80', path: 'BUSN-110-Business-Bootcamp' },
  { code: 'CTZN-110', name: 'Social Entrepreneurship',      color: '#C084FC', path: 'CTZN-110-Social-Entrepreneurship' },
  { code: 'ECON-217', name: 'Microeconomics',               color: '#F87171', path: 'ECON-217-Microeconomics' },
  { code: 'MATH-171', name: 'Statistical Decision Making',  color: '#4DD9E0', path: 'MATH-171-Statistical-Decision-Making' },
];

export default function VaultTab() {
  const [selectedCourse, setSelectedCourse] = useState(VAULT_COURSES[1]); // Default to BUSN-296
  const [activeFile, setActiveFile] = useState<string>('study-guide.md');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [mobilePane, setMobilePane] = useState<'sidebar' | 'content'>('content');

  const pushLog = useAegisStore((s) => s.pushLog);
  const setActiveTab = useAegisStore((s) => s.setActiveTab);

  // Available files per course
  const COURSE_FILES: Record<string, string[]> = {
    'ANTH-202':  ['overview.md', 'notes.md', 'study-guide.md', 'assignments.md'],
    'BUSN-296':  ['overview.md', 'notes.md', 'study-guide.md', 'test1-prep.md'],
    'BUSN-110':  ['overview.md', 'notes.md', 'study-guide.md'],
    'CTZN-110':  ['overview.md', 'notes.md', 'study-guide.md'],
    'ECON-217':  ['overview.md', 'notes.md', 'study-guide.md'],
    'MATH-171':  ['overview.md', 'notes.md', 'study-guide.md', 'formula-sheet.md'],
  };

  // Fetch file content from API
  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      setLoading(true);
      try {
        const filePath = `${selectedCourse.path}/${activeFile}`;
        const res = await fetch(`/api/vault?path=${encodeURIComponent(filePath)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setContent(data.content || '');
        } else {
          if (isMounted) setContent(`# ${selectedCourse.code} — ${activeFile}\n\nNotes loaded from local Obsidian vault cache.`);
        }
      } catch (err) {
        if (isMounted) setContent(`# ${selectedCourse.code}\nError reading vault note: ${err}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadContent();
    return () => { isMounted = false; };
  }, [selectedCourse, activeFile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStudyThisNote = () => {
    pushLog({
      source: 'vault',
      message: `Exported ${selectedCourse.code}/${activeFile} to Study Drill Engine`,
      level: 'info',
    });
    setActiveTab('study');
  };

  const currentFiles = (COURSE_FILES[selectedCourse.code] || []).filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#070709' }}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 gap-2"
        style={{ borderColor: '#2A252025', background: '#0D0D11CC' }}
      >
        <div className="flex items-center gap-3">
          <FolderOpen size={16} style={{ color: '#4ADE80' }} />
          <div>
            <div className="text-xs font-bold tracking-[0.2em]" style={{ color: '#4ADE80' }}>
              OBSIDIAN KNOWLEDGE VAULT
            </div>
            <div className="text-[9px] tracking-wider hidden sm:block" style={{ color: '#3D3580' }}>
              LOCAL ACADEMIC REPOSITORY // 21 ACTIVE MODULES
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile pane switcher */}
          <button
            onClick={() => setMobilePane(mobilePane === 'sidebar' ? 'content' : 'sidebar')}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] tracking-wider transition-all"
            style={{
              background: '#7C6BF020',
              border: '1px solid #7C6BF050',
              color: '#B4A5FF',
            }}
          >
            {mobilePane === 'sidebar' ? '📖 NOTE' : '📁 FILES'}
          </button>
          <button
            onClick={handleStudyThisNote}
            className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] tracking-wider transition-all"
            style={{
              background: '#7C6BF015',
              border: '1px solid #7C6BF040',
              color: '#9B8DF5',
            }}
          >
            <Sparkles size={11} />
            <span className="hidden sm:inline">STUDY DRILL</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] tracking-wider transition-all"
            style={{
              background: '#4ADE8015',
              border: '1px solid #4ADE8040',
              color: '#4ADE80',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Two-Pane Explorer ──────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Course Roster & File Tree */}
        <aside
          className={`w-full md:w-72 border-r shrink-0 overflow-hidden flex-col ${
            mobilePane === 'sidebar' ? 'flex' : 'hidden md:flex'
          }`}
          style={{ borderColor: '#2A252020', background: '#0A0A0E' }}
        >
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: '#2A252020' }}>
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-2.5" style={{ color: '#3D3580' }} />
              <input
                type="text"
                placeholder="Search notes in vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-sm text-[10px] outline-none"
                style={{
                  background: '#0D0D11',
                  border: '1px solid #2A252030',
                  color: '#E0E0E8',
                }}
              />
            </div>
          </div>

          {/* Courses List */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            <div className="text-[9px] tracking-[0.25em] font-bold px-2 py-1" style={{ color: '#3D3580' }}>
              ENROLLED COURSES
            </div>
            {VAULT_COURSES.map((course) => {
              const isSelected = selectedCourse.code === course.code;
              return (
                <div key={course.code} className="flex flex-col">
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      const files = COURSE_FILES[course.code] || [];
                      if (files.length > 0) setActiveFile(files[0]);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-sm text-left transition-all"
                    style={{
                      background: isSelected ? `${course.color}15` : 'transparent',
                      border: `1px solid ${isSelected ? `${course.color}40` : 'transparent'}`,
                      color: isSelected ? course.color : '#8A8A9A',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: course.color }} />
                      <span className="text-[10px] font-bold tracking-wider">{course.code}</span>
                    </div>
                    <span className="text-[9px]" style={{ color: '#3D3580' }}>
                      {COURSE_FILES[course.code]?.length ?? 0} files
                    </span>
                  </button>

                  {/* Child files when selected */}
                  {isSelected && (
                    <div className="ml-4 pl-2 border-l my-1 flex flex-col gap-0.5" style={{ borderColor: `${course.color}30` }}>
                      {currentFiles.map((file) => {
                        const isFileActive = activeFile === file;
                        return (
                          <button
                            key={file}
                            onClick={() => {
                              setActiveFile(file);
                              setMobilePane('content');
                            }}
                            className="flex items-center gap-2 px-2 py-1 rounded-sm text-left transition-all text-[10px]"
                            style={{
                              background: isFileActive ? '#7C6BF020' : 'transparent',
                              color: isFileActive ? '#B4A5FF' : '#8A8A9A',
                              fontWeight: isFileActive ? 'bold' : 'normal',
                            }}
                          >
                            <FileText size={10} style={{ color: isFileActive ? '#B4A5FF' : '#3D3580' }} />
                            <span className="truncate">{file}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-3 border-t text-[9px] flex items-center justify-between" style={{ borderColor: '#2A252020', color: '#3D3580' }}>
            <span>PATH: ./vault/</span>
            <span className="text-emerald-400">SYNCED</span>
          </div>
        </aside>

        {/* Right Pane: Document Viewer */}
        <main
          className={`flex-1 flex-col overflow-hidden pb-24 md:pb-0 ${
            mobilePane === 'content' ? 'flex' : 'hidden md:flex'
          }`}
          style={{ background: '#070709' }}
        >
          {/* File Meta Header */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-2 border-b shrink-0 text-[10px]"
            style={{ borderColor: '#2A252015', background: '#09090C' }}
          >
            <div className="flex items-center gap-2" style={{ color: '#8A8A9A' }}>
              <span className="truncate max-w-[120px] sm:max-w-none">{selectedCourse.name}</span>
              <span>/</span>
              <span className="font-bold text-[#9B8DF5]">{activeFile}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px]" style={{ color: '#3D3580' }}>
              <span>{content.split(/\s+/).length} words</span>
              <span className="hidden sm:inline">~{Math.max(1, Math.round(content.split(/\s+/).length / 200))} min read</span>
            </div>
          </div>

          {/* Markdown Content Pane */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center h-48 gap-3" style={{ color: '#3D3580' }}>
                <span className="animate-spin text-[#7C6BF0]">⬡</span>
                <span className="text-xs">Loading note from vault...</span>
              </div>
            ) : (
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono font-normal"
                style={{ color: '#D6C8B0' }}
              >
                {content}
              </pre>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
