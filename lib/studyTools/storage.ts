// lib/studyTools/storage.ts — Persistent Server-Side Storage for Study Tools & Progress

import fs from 'fs';
import path from 'path';
import type { StudyToolItem, StudyToolType } from './types';

// In-memory fallback in case of filesystem permission constraints
let memoryCache: StudyToolItem[] = [];
let storageFileInitialized = false;

function resolveStoragePath(): string {
  const primaryDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return path.join(primaryDir, 'study-tools.json');
  } catch (err) {
    // Fallback to /tmp/aegis-data if current working directory is not writable
    try {
      const fallbackDir = path.join('/tmp', 'aegis-data');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return path.join(fallbackDir, 'study-tools.json');
    } catch {
      return '';
    }
  }
}

function ensureStorage(): string {
  const filePath = resolveStoragePath();
  if (!filePath) return '';

  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
    }
    storageFileInitialized = true;
  } catch (err) {
    console.warn('[StudyTools Storage] ensureStorage warning:', err);
  }
  return filePath;
}

function readAll(): StudyToolItem[] {
  const filePath = ensureStorage();
  if (!filePath) return memoryCache;

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[StudyTools Storage] Read error, using memory cache:', err);
  }
  return memoryCache;
}

function writeAll(items: StudyToolItem[]): void {
  memoryCache = items;
  const filePath = ensureStorage();
  if (!filePath) return;

  try {
    // Write atomically via temporary file
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(items, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    try {
      // Fallback direct write
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.warn('[StudyTools Storage] Write error (memory cache preserved):', fallbackErr);
    }
  }
}

export async function getAllStudyTools(): Promise<StudyToolItem[]> {
  const items = readAll();
  return items.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
}

export async function getStudyToolById(id: string): Promise<StudyToolItem | null> {
  const items = readAll();
  const match = items.find((i) => i.id === id);
  if (match) {
    // Touch lastOpenedAt
    match.lastOpenedAt = new Date().toISOString();
    writeAll(items);
    return match;
  }
  return null;
}

export async function saveStudyTool(tool: StudyToolItem): Promise<StudyToolItem> {
  const items = readAll();
  const existingIdx = items.findIndex((i) => i.id === tool.id);

  const updatedTool: StudyToolItem = {
    ...tool,
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    items[existingIdx] = updatedTool;
  } else {
    items.unshift(updatedTool);
  }

  writeAll(items);
  return updatedTool;
}

export async function updateStudyToolProgress(
  id: string,
  progress: number,
  data?: any
): Promise<StudyToolItem | null> {
  const items = readAll();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  item.progress = Math.max(0, Math.min(100, Math.round(progress)));
  item.updatedAt = new Date().toISOString();
  item.lastOpenedAt = new Date().toISOString();
  if (data) {
    item.data = data;
  }

  writeAll(items);
  return item;
}

export async function renameStudyTool(id: string, newTitle: string): Promise<StudyToolItem | null> {
  const items = readAll();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  item.title = newTitle.trim();
  item.updatedAt = new Date().toISOString();
  writeAll(items);
  return item;
}

export async function duplicateStudyTool(id: string): Promise<StudyToolItem | null> {
  const items = readAll();
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  const copy: StudyToolItem = {
    ...JSON.parse(JSON.stringify(item)),
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: `${item.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
  };

  items.unshift(copy);
  writeAll(items);
  return copy;
}

export async function deleteStudyTool(id: string): Promise<{ success: boolean; deletedItem?: StudyToolItem }> {
  const items = readAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return { success: false };

  const [deletedItem] = items.splice(idx, 1);
  writeAll(items);
  return { success: true, deletedItem };
}

export async function restoreStudyTool(tool: StudyToolItem): Promise<StudyToolItem> {
  return saveStudyTool(tool);
}

/**
 * Extracts all previously asked questions or flashcard prompts for a course/type
 * to ensure newly generated study tools never repeat the same questions.
 */
export function getPreviousQuestionsForCourse(courseCode?: string, type?: StudyToolType): string[] {
  const items = readAll();
  const filtered = items.filter((t) => {
    if (type && t.type !== type) return false;
    if (courseCode && courseCode !== 'ALL' && t.courseCode && t.courseCode !== courseCode) return false;
    return true;
  });

  const questions: string[] = [];
  for (const item of filtered) {
    if (item.type === 'flashcards') {
      const cards = (item.data as any)?.cards;
      if (Array.isArray(cards)) {
        for (const card of cards) {
          if (card.front && typeof card.front === 'string') {
            questions.push(card.front.trim());
          }
        }
      }
    } else if (item.type === 'quiz') {
      const qList = (item.data as any)?.questions;
      if (Array.isArray(qList)) {
        for (const q of qList) {
          if (q.question && typeof q.question === 'string') {
            questions.push(q.question.trim());
          }
        }
      }
    }
  }

  return Array.from(new Set(questions));
}

/**
 * Provides a human-readable summary of existing study tools for Jarvis memory
 */
export function getStudyToolsSummary(): string {
  const items = readAll();
  if (items.length === 0) return 'No study tools currently generated.';
  return items.slice(0, 8).map((t) => {
    let detail = '';
    if (t.type === 'flashcards') {
      const count = (t.data as any)?.cards?.length || 0;
      detail = `${count} cards`;
    } else if (t.type === 'quiz') {
      const count = (t.data as any)?.questions?.length || 0;
      detail = `${count} questions`;
    } else {
      detail = `${t.progress}% complete`;
    }
    return `• [${t.type.toUpperCase()}] ${t.courseCode}: "${t.title}" (${detail}, last active ${new Date(t.lastOpenedAt).toLocaleDateString()})`;
  }).join('\n');
}

