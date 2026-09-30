// lib/cleanAiResponse.ts — Safety Net Response Cleaner (Phase 1 Layer 2)
// Strips markdown emphasis markers, pound headers, and tables while preserving math, normal punctuation, and real code blocks.

/**
 * Clean AI responses so they read naturally like a sharp human wrote them.
 * Safe to call on complete messages or accumulated streaming text.
 */
export function cleanAiResponse(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Isolate and preserve real code blocks (``` ... ```)
  const codeBlocks: string[] = [];
  const placeholderPrefix = '__CODE_BLOCK_PLACEHOLDER_';
  let sanitized = raw.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  // Also preserve inline code (`...`)
  const inlineCode: string[] = [];
  const inlinePrefix = '__INLINE_CODE_';
  sanitized = sanitized.replace(/`([^`\n]+)`/g, (match) => {
    const idx = inlineCode.length;
    inlineCode.push(match);
    return `${inlinePrefix}${idx}__`;
  });

  // 2. Strip horizontal rules (---, ***, ___ on a line by themselves)
  sanitized = sanitized.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 3. Strip pound-sign markdown headers (# Header, ## Subheader, etc.)
  sanitized = sanitized.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');

  // 4. Strip markdown table separator lines (|---|---|)
  sanitized = sanitized.replace(/^[ \t]*\|?[\s:\-|]+\|[ \t]*$/gm, '');

  // Clean remaining table rows: "| Item | Price |" -> "Item — Price"
  sanitized = sanitized.replace(/^[ \t]*\|(.*?)\|[ \t]*$/gm, (_, content) => {
    const cells = content.split('|').map((c: string) => c.trim()).filter(Boolean);
    return cells.join(' — ');
  });

  // 5. Convert bullet markers (*, +, •) to plain hyphen lines (- )
  sanitized = sanitized.replace(/^[ \t]*[*+•][ \t]+/gm, '- ');

  // 6. Strip bold and italics markdown syntax
  // Triple asterisks/underscores: ***word*** -> word
  sanitized = sanitized.replace(/\*{3}([^\*\n]+)\*{3}/g, '$1');
  sanitized = sanitized.replace(/_{3}([^_\n]+)_{3}/g, '$1');

  // Double asterisks/underscores: **word** -> word
  sanitized = sanitized.replace(/\*{2}([^\*\n]+)\*{2}/g, '$1');
  sanitized = sanitized.replace(/_{2}([^_\n]+)_{2}/g, '$1');

  // Single asterisk for italics: *word* -> word
  // Note: Only match when asterisk is not surrounded by spaces (preserves multiplication like 3 * 4)
  sanitized = sanitized.replace(/(?<=\s|^|[([{"'])\*([^*\s\n][^*\n]*?[^*\s\n]|\w)\*(?=\s|$|[.,!?;:)\]}"'])/g, '$1');

  // Single underscore for italics: _word_ -> word
  sanitized = sanitized.replace(/(?<=\s|^|[([{"'])_([^_\s\n][^_\n]*?[^_\s\n]|\w)_(?=\s|$|[.,!?;:)\]}"'])/g, '$1');

  // Strikethrough: ~~word~~ -> word
  sanitized = sanitized.replace(/~~([^~\n]+)~~/g, '$1');

  // Blockquotes: > quote -> quote
  sanitized = sanitized.replace(/^[ \t]*>[ \t]?/gm, '');

  // 7. Restore inline code and code blocks
  sanitized = sanitized.replace(new RegExp(`${inlinePrefix}(\\d+)__`, 'g'), (_, idx) => {
    return inlineCode[Number(idx)] ?? '';
  });

  sanitized = sanitized.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, 'g'), (_, idx) => {
    return codeBlocks[Number(idx)] ?? '';
  });

  // 8. Clean up excess whitespace and blank lines (maximum of 2 newlines in a row)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized.trim();
}
