// lib/webFetcher.ts — Intelligent Document & Web Resource Fetching for Assignments

import fs from 'fs';
import path from 'path';

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL ?? 'https://longwood.instructure.com';
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN ?? '';
const VAULT_PATH = process.env.VAULT_PATH ?? './vault';

export interface FetchedResource {
  url: string;
  title: string;
  sourceType: 'web' | 'canvas_file' | 'vault_note';
  contentSnippet: string;
  fullLength: number;
}

export interface ResourceExtractionResult {
  resources: FetchedResource[];
  combinedContext: string;
  foundUrls: string[];
}

/** Clean HTML into readable, plain text */
function cleanHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .trim();
}

/** Extract all URLs from text or HTML */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s"'<>()]+)/gi;
  const matches: string[] = Array.from(text.match(urlRegex) || []);
  
  // Also look for href attributes: href="([^"]+)"
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(text)) !== null) {
    const url = hrefMatch[1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      matches.push(url);
    } else if (url.startsWith('/courses/') || url.startsWith('/files/')) {
      matches.push(`${CANVAS_BASE_URL}${url}`);
    }
  }

  // Deduplicate and filter out common media or tracking links
  const unique = Array.from(new Set(matches.map((u) => u.replace(/[.,;!?)]+$/, ''))));
  return unique.filter(
    (u) =>
      !u.includes('instructuremedia.com') &&
      !u.includes('fonts.googleapis.com') &&
      !u.endsWith('.png') &&
      !u.endsWith('.jpg') &&
      !u.endsWith('.svg') &&
      !u.endsWith('.css')
  );
}

/** Fetch external website content with timeout */
async function fetchWebContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
    };

    // If fetching an internal Canvas file or API, include Canvas Bearer Token
    if (url.includes('instructure.com') && CANVAS_API_TOKEN) {
      headers['Authorization'] = `Bearer ${CANVAS_API_TOKEN}`;
    }

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return `[Unable to fetch resource from ${url} (HTTP ${res.status})]`;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return JSON.stringify(data, null, 2).slice(0, 15000);
    }

    const html = await res.text();
    const cleanText = cleanHtmlToText(html);
    return cleanText.slice(0, 15000);
  } catch (err: any) {
    clearTimeout(timeoutId);
    return `[Resource retrieval timed out or inaccessible: ${url} (${err.message || err})]`;
  }
}

/** Search local Obsidian Vault notes for relevant course content */
function searchLocalVault(courseCode?: string): FetchedResource[] {
  if (!courseCode) return [];
  const results: FetchedResource[] = [];

  try {
    const vaultDir = path.resolve(process.cwd(), VAULT_PATH);
    if (!fs.existsSync(vaultDir)) return [];

    const dirs = fs.readdirSync(vaultDir);
    const targetDir = dirs.find(
      (d) => d.toLowerCase().includes(courseCode.toLowerCase().replace('-', '')) || d.toLowerCase().includes(courseCode.toLowerCase())
    );

    if (targetDir) {
      const fullCoursePath = path.join(vaultDir, targetDir);
      if (fs.existsSync(fullCoursePath) && fs.statSync(fullCoursePath).isDirectory()) {
        const files = fs.readdirSync(fullCoursePath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(fullCoursePath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            results.push({
              url: `vault://${targetDir}/${file}`,
              title: `Obsidian Note: ${file.replace('.md', '')}`,
              sourceType: 'vault_note',
              contentSnippet: content.slice(0, 4000),
              fullLength: content.length,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Vault search error]:', err);
  }

  return results.slice(0, 3); // Top 3 relevant vault files
}

/**
 * Main Resource Extraction Pipeline:
 * Discovers URLs and documents, fetches live contents, cross-references vault,
 * and packages them into clean prompt context.
 */
export async function extractAndFetchLinkedResources(
  assignmentHtmlOrText: string,
  courseCode?: string
): Promise<ResourceExtractionResult> {
  const foundUrls = extractUrls(assignmentHtmlOrText);
  const resources: FetchedResource[] = [];

  // 1. Fetch live content from discovered URLs (parallel with limit of 4)
  const urlsToFetch = foundUrls.slice(0, 4);
  const fetchPromises = urlsToFetch.map(async (url) => {
    const content = await fetchWebContent(url);
    let title = url;
    try {
      const parsed = new URL(url);
      title = `${parsed.hostname}${parsed.pathname}`;
    } catch (_) {}

    return {
      url,
      title,
      sourceType: url.includes('instructure.com') ? ('canvas_file' as const) : ('web' as const),
      contentSnippet: content,
      fullLength: content.length,
    };
  });

  const webResults = await Promise.all(fetchPromises);
  resources.push(...webResults);

  // 2. Fetch local Obsidian Vault reference notes for this course
  if (courseCode) {
    const vaultResults = searchLocalVault(courseCode);
    resources.push(...vaultResults);
  }

  // 3. Assemble combined context block
  let combinedContext = '';
  if (resources.length > 0) {
    combinedContext += '\n\n=== ATTACHED DOCUMENTS & WEBSITES ===\n';
    for (const r of resources) {
      combinedContext += `\n--- [RESOURCE: ${r.title}] (${r.sourceType.toUpperCase()}) ---\n`;
      combinedContext += `${r.contentSnippet}\n`;
    }
    combinedContext += '=== END ATTACHED DOCUMENTS & WEBSITES ===\n\n';
  }

  return {
    resources,
    combinedContext,
    foundUrls,
  };
}
