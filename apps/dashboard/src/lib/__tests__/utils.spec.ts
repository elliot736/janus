import { cn } from '../utils';

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind classes', () => {
    const result = cn('p-4', 'p-6');
    expect(result).toBe('p-6');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
