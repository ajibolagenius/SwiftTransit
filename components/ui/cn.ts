// Minimal class joiner: filters falsy values so conditional class lists stay readable.
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
