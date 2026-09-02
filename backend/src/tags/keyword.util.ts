/**
 * Stop words dropped before a phrase becomes a tag candidate. Deliberately short
 * — this is a tag suggester, not a search engine, and over-filtering costs more
 * than the occasional weak suggestion.
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'you',
  'your',
  'my',
  'our',
  'their',
  'they',
  'we',
  'i',
  // Words that appear in nearly every asset title and so carry no signal here.
  'file',
  'files',
  'new',
  'final',
  'copy',
  'version',
  'draft',
  'untitled',
  'asset',
  'assets',
  'download',
  'free',
  'premium',
  'pack',
  'set',
  'vol',
  'png',
  'jpg',
  'jpeg',
  'svg',
  'pdf',
  'zip',
  'psd',
  'fig',
]);

export interface Keyword {
  term: string;
  /** Higher for terms that appeared in the title rather than the description. */
  weight: number;
}

/**
 * Pulls weighted candidate terms out of an asset's text.
 *
 * Single words and adjacent pairs are both emitted, because the useful tags a
 * creator actually types are frequently two words — "dark mode", "landing page".
 */
export function extractKeywords(
  parts: Array<{ text: string | null | undefined; weight: number }>,
): Keyword[] {
  const scores = new Map<string, number>();

  const record = (term: string, weight: number) => {
    if (!term || term.length < 3 || term.length > 40) {
      return;
    }
    // Repeats add, so a term used in both title and description outranks one
    // that appears once — but with diminishing returns, hence the 0.5 factor.
    scores.set(term, (scores.get(term) ?? 0) + weight * (scores.has(term) ? 0.5 : 1));
  };

  for (const part of parts) {
    if (!part.text) {
      continue;
    }

    const words = part.text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, ' ')
      .split(/[\s-]+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

    words.forEach((word) => record(word, part.weight));

    for (let i = 0; i < words.length - 1; i += 1) {
      // A pair is worth slightly more than either half: a two-word tag is
      // usually the more specific and more useful one.
      record(`${words[i]} ${words[i + 1]}`, part.weight * 1.1);
    }
  }

  return [...scores.entries()]
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight);
}
