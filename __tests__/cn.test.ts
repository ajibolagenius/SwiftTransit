import { cn } from '@/components/ui/cn';

describe('cn', () => {
  it('joins class fragments with single spaces', () => {
    expect(cn('font-sans', 'text-label-md')).toBe('font-sans text-label-md');
  });

  it('filters out falsy values so conditional classes can be passed inline', () => {
    expect(cn('bg-primary', false, undefined, null)).toBe('bg-primary');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, undefined)).toBe('');
  });

  it('returns an empty string with no arguments', () => {
    expect(cn()).toBe('');
  });
});
