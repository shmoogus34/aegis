// app/api/vault/route.ts — Obsidian vault file listing endpoint

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { VaultFile } from '@/lib/types';

const VAULT_PATH = join(process.cwd(), 'vault');

async function walkVault(dir: string, base = ''): Promise<VaultFile[]> {
  const files: VaultFile[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath  = join(dir, entry.name);
      const relPath   = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const sub = await walkVault(fullPath, relPath);
        files.push(...sub);
      } else if (entry.name.endsWith('.md')) {
        const s = await stat(fullPath);
        files.push({
          name:         entry.name,
          path:         relPath,
          course:       relPath.split('/')[0],
          lastModified: s.mtime.toISOString(),
        });
      }
    }
  } catch {}
  return files;
}

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (path) {
    // Serve a specific file's content
    try {
      const fullPath = join(VAULT_PATH, path);
      // Security: ensure path stays within vault
      if (!fullPath.startsWith(VAULT_PATH)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const content = await readFile(fullPath, 'utf8');
      return NextResponse.json({ content, path });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  // List all vault files
  const files = await walkVault(VAULT_PATH);
  return NextResponse.json({ files, count: files.length });
}
