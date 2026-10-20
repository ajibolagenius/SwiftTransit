import { parsePhoneNumberFromString } from 'libphonenumber-js';

// AGENTS.md: numbers default to +234, stored E.164. The input carries national digits only.
export function toE164(digits: string): string | null {
  const phone = parsePhoneNumberFromString(digits, 'NG');
  if (!phone || !phone.isValid()) return null;
  return phone.formatInternational().replace(/[^+\d]/g, '');
}

// "sent to +234 802 123 4567" for the verify header (spec 0003 value sourcing).
export function displayNumber(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  return phone ? phone.formatInternational() : e164;
}
