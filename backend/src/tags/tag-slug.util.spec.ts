import { slugifyTag } from './tag-slug.util';

describe('slugifyTag', () => {
  it('collapses the spellings a user would consider the same tag', () => {
    const expected = 'dark-mode';
    expect(slugifyTag('Dark Mode')).toBe(expected);
    expect(slugifyTag('dark mode')).toBe(expected);
    expect(slugifyTag('dark-mode')).toBe(expected);
    expect(slugifyTag('  DARK   MODE  ')).toBe(expected);
    expect(slugifyTag('Dark_Mode')).toBe(expected);
  });

  it('strips accents', () => {
    expect(slugifyTag('Café')).toBe('cafe');
  });

  it('drops punctuation without leaving separators behind', () => {
    expect(slugifyTag('UI / UX!')).toBe('ui-ux');
    expect(slugifyTag('#3d-render')).toBe('3d-render');
  });

  it('caps the length so a pasted paragraph cannot become a tag', () => {
    expect(slugifyTag('a'.repeat(200))).toHaveLength(60);
  });

  it('returns an empty string for input with nothing sluggable', () => {
    expect(slugifyTag('!!!')).toBe('');
    expect(slugifyTag('   ')).toBe('');
  });
});
