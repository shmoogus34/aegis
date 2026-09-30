// app/api/study-tools/route.ts — CRUD & State Management for Persistent Study Tools
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStudyTools,
  getStudyToolById,
  saveStudyTool,
  updateStudyToolProgress,
  renameStudyTool,
  duplicateStudyTool,
  deleteStudyTool,
  restoreStudyTool,
} from '@/lib/studyTools/storage';
import type { StudyToolItem } from '@/lib/studyTools/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const tool = await getStudyToolById(id);
      if (!tool) {
        return NextResponse.json({ success: false, error: 'Study tool not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, tool });
    }

    const tools = await getAllStudyTools();
    return NextResponse.json({ success: true, tools });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch study tools' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, tool, progress, data, newTitle } = body as {
      action: 'save' | 'progress' | 'rename' | 'duplicate' | 'delete' | 'restore';
      id?: string;
      tool?: StudyToolItem;
      progress?: number;
      data?: any;
      newTitle?: string;
    };

    switch (action) {
      case 'save': {
        if (!tool || !tool.id) {
          return NextResponse.json({ success: false, error: 'Tool payload required' }, { status: 400 });
        }
        const saved = await saveStudyTool(tool);
        return NextResponse.json({ success: true, tool: saved });
      }

      case 'progress': {
        if (!id) {
          return NextResponse.json({ success: false, error: 'Tool ID required' }, { status: 400 });
        }
        const updated = await updateStudyToolProgress(id, progress ?? 0, data);
        if (!updated) {
          return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, tool: updated });
      }

      case 'rename': {
        if (!id || !newTitle) {
          return NextResponse.json({ success: false, error: 'Tool ID and newTitle required' }, { status: 400 });
        }
        const renamed = await renameStudyTool(id, newTitle);
        if (!renamed) {
          return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, tool: renamed });
      }

      case 'duplicate': {
        if (!id) {
          return NextResponse.json({ success: false, error: 'Tool ID required' }, { status: 400 });
        }
        const duplicated = await duplicateStudyTool(id);
        if (!duplicated) {
          return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, tool: duplicated });
      }

      case 'delete': {
        if (!id) {
          return NextResponse.json({ success: false, error: 'Tool ID required' }, { status: 400 });
        }
        const result = await deleteStudyTool(id);
        if (!result.success) {
          return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, deletedItem: result.deletedItem });
      }

      case 'restore': {
        if (!tool || !tool.id) {
          return NextResponse.json({ success: false, error: 'Deleted tool payload required' }, { status: 400 });
        }
        const restored = await restoreStudyTool(tool);
        return NextResponse.json({ success: true, tool: restored });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: "${action}"` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
