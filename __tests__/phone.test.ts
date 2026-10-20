import { displayNumber, toE164 } from '@/features/auth/phone';

// Spec 0003 / AGENTS.md: the input carries national digits, numbers default to +234, stored E.164.
describe('toE164', () => {
  // covers: AC-2
  it('normalises a national mobile number to E.164 with the +234 country code', () => {
    expect(toE164('08021234567')).toBe('+2348021234567');
  });

  it('accepts the number without the leading national trunk zero', () => {
    expect(toE164('8021234567')).toBe('+2348021234567');
  });

  it('ignores spaces and dashes typed into the field', () => {
    expect(toE164('0802 123-4567')).toBe('+2348021234567');
  });

  it('passes through an already international number', () => {
    expect(toE164('+2348021234567')).toBe('+2348021234567');
  });

  // covers: AC-2
  it('returns null for an empty string', () => {
    expect(toE164('')).toBeNull();
  });

  it('returns null when the number is too short to be valid', () => {
    expect(toE164('0802123')).toBeNull();
  });

  it('returns null for non digit text', () => {
    expect(toE164('abcdefgh')).toBeNull();
  });

  it('returns null for a number that is not a Nigerian line', () => {
    expect(toE164('0000000')).toBeNull();
  });
});

describe('displayNumber', () => {
  // covers: AC-2
  it('formats a stored E.164 number for the verify header', () => {
    expect(displayNumber('+2348021234567')).toBe('+234 802 123 4567');
  });

  it('falls back to the raw input when it cannot be parsed, so the screen never blanks', () => {
    expect(displayNumber('not-a-number')).toBe('not-a-number');
  });
});
