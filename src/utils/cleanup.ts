import { CleanupSettings } from '../types';

export const cleanText = (text: string, settings: CleanupSettings): string => {
  let cleaned = text;

  if (settings.removeBracketedTags) {
    // Remove anything in square brackets or angle brackets
    cleaned = cleaned.replace(/\[.*?\]/g, '').replace(/<.*?>/g, '');
  }

  if (settings.lowercaseAllCaps) {
    // Find words that are fully capitalized (at least 2 letters) and lowercase them
    // Be careful not to lowercase acronyms if possible, but the requirement says "converting fully capitalized words or runs to lowercase"
    cleaned = cleaned.replace(/\b[A-Z]{2,}\b/g, (match) => match.toLowerCase());
  }

  if (settings.normalizeSpacing) {
    // Replace multiple spaces with a single space, and multiple newlines with double newlines
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  }

  if (settings.normalizePunctuation) {
    // Replace multiple punctuation marks (like !!! or ???) with a single one conservatively
    cleaned = cleaned.replace(/!{2,}/g, '!');
    cleaned = cleaned.replace(/\?{2,}/g, '?');
    // Replace double commas
    cleaned = cleaned.replace(/,{2,}/g, ',');
    // Fix spacing around punctuation
    cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');
  }

  return cleaned.trim();
};
