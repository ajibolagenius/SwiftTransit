import { useTranslation } from 'react-i18next';

import en from '@/locales/en.json';

type Translate = ReturnType<typeof useTranslation>['t'];

const knownCodes = Object.keys(en.errors);

const FALLBACK = 'network.offline';

// The backend and the geo function both answer with a dotted code, never prose.
// This maps one onto `errors.<code>` and falls back rather than showing a raw key.
export function errorLabel(t: Translate, code: string | null | undefined): string {
  const resolved = code && knownCodes.includes(code) ? code : FALLBACK;
  // The key is built at run time, so the literal key union cannot be satisfied.
  return (t as (key: string) => string)(`errors.${resolved}`);
}
