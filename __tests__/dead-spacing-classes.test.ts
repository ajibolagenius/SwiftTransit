import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// theme/tokens.ts REPLACES the default Tailwind spacing scale with keys 0..12 instead of
// extending it. Any numeric spacing utility above 12 (h-14, w-16, pb-40, ...) therefore
// compiles to no CSS at all. Jest mocks global.css, so a screen can render blank on device
// while every test stays green. This guard scans the UI source for those dead classes.
const MAX_SPACING_KEY = 12;

const SPACING_PREFIXES = new Set([
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'bottom',
  'left',
  'right',
  'w',
  'h',
  'min-w',
  'max-w',
  'min-h',
  'max-h',
  'basis',
]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function deadSpacingClasses(src: string): string[] {
  const found: string[] = [];
  const literal = /className\s*=\s*"([^"]*)"/g;
  for (const match of [...src.matchAll(literal)]) {
    for (const token of match[1].split(/\s+/)) {
      const parts = (token.startsWith('-') ? token.slice(1) : token).split('-');
      for (let n = 1; n < parts.length; n += 1) {
        if (!SPACING_PREFIXES.has(parts.slice(0, n).join('-'))) continue;
        const value = parts.slice(n).join('-');
        if (/^\d+$/.test(value) && Number(value) > MAX_SPACING_KEY) found.push(token);
        break;
      }
    }
  }
  return found;
}

describe('spacing utilities stay within the theme scale', () => {
  it('uses no numeric spacing utility above the 0..12 scale in the UI source', () => {
    const offenders: string[] = [];
    for (const dir of ['app', 'components']) {
      for (const file of sourceFiles(dir)) {
        for (const cls of deadSpacingClasses(readFileSync(file, 'utf8'))) {
          offenders.push(`${file}: ${cls}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
