import { CleanupSettings } from '../types';

// Common acronyms to preserve
const ACRONYMS = new Set(['TV', 'OK', 'AI', 'USA', 'UK', 'FBI', 'CIA', 'NASA', 'CEO', 'ID', 'VIP', 'FAQ', 'SOS']);

export interface CleanupResult {
  text: string;
  stats: {
    removed: Record<string, number>;
    modified: Record<string, string>;
    formattingFixed: number;
  }
}

export const cleanText = (text: string, settings: CleanupSettings): CleanupResult => {
  let cleaned = text;
  const stats = {
    removed: {} as Record<string, number>,
    modified: {} as Record<string, string>,
    formattingFixed: 0,
  };

  if (settings.removeBracketedTags) {
    // Remove anything in square brackets or angle brackets.
    // Also optionally match an extra trailing bracket to handle typos like `[grim tone]]THAT`
    cleaned = cleaned.replace(/\[[^\]]*\]\]?/g, (match) => {
      const key = match.endsWith(']]') ? '[...]]' : '[...]';
      stats.removed[key] = (stats.removed[key] || 0) + 1;
      return '';
    }).replace(/<[^>]*>>?/g, (match) => {
      const key = match.endsWith('>>') ? '<...>>' : '<...>';
      stats.removed[key] = (stats.removed[key] || 0) + 1;
      return '';
    });
  }

  if (settings.lowercaseAllCaps) {
    // Find words that are fully capitalized, optionally with an internal apostrophe
    // e.g. "HYSTERICAL", "WASN'T", "I'M", "A"
    cleaned = cleaned.replace(/\b[A-Z]+(?:'[A-Z]+)?\b/g, (match, offset, string) => {
      // Always preserve "I" and "A" as standalone words
      if (match === 'I' || match === 'A') return match;
      if (ACRONYMS.has(match)) return match;
      
      // Check if this capitalized word is at the start of a sentence.
      // Look back for start of string, or sentence-ending punctuation optionally followed by spaces/quotes
      const prevText = string.slice(0, offset);
      const isStartOfSentence = /(?:^|[.!?]\s*|["'\n]\s*)$/.test(prevText);
      
      let lower = match.toLowerCase();
      
      // Preserve uppercase I for contractions like "I'm", "I've", "I'll", "I'd"
      if (lower.startsWith("i'")) {
        lower = 'I' + lower.slice(1);
      }
      
      let result = lower;
      if (isStartOfSentence) {
        result = lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      
      if (result !== match) {
        stats.modified[match] = result;
      }
      
      return result;
    });
  }

  if (settings.normalizeSpacing) {
    // Replace multiple spaces with a single space, and multiple newlines with double newlines
    cleaned = cleaned.replace(/[ \t]{2,}/g, () => {
      stats.formattingFixed++;
      return ' ';
    });
    cleaned = cleaned.replace(/\n{3,}/g, () => {
      stats.formattingFixed++;
      return '\n\n';
    });
  }

  if (settings.normalizePunctuation) {
    // Replace double commas
    cleaned = cleaned.replace(/,{2,}/g, () => {
      stats.formattingFixed++;
      return ',';
    });
    // Fix spacing around punctuation, strictly targeting stray spaces before punctuation
    cleaned = cleaned.replace(/\s+([.,!?])/g, (_, p1) => {
      stats.formattingFixed++;
      return p1;
    });
  }

  // Restore leading/trailing spaces for user convenience while writing, unless it's just pure empty.
  // Actually, we'll trim the whole block.
  return { 
    text: cleaned.trim(),
    stats
  };
};
