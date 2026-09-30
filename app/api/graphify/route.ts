// app/api/graphify/route.ts — Serves Graphify Multimodal Knowledge Graph

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'graphify', 'graph.json');
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: 'Graphify data not generated yet' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error reading graphify data' },
      { status: 500 }
    );
  }
}
