// Money is integer kobo everywhere in the app. This is the only place it
// becomes a display string (AGENTS.md convention).

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});

const distance = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 200000 -> "₦2,000.00". Takes kobo, never naira. */
export function formatKobo(kobo: number): string {
  return naira.format(kobo / 100);
}

/** 14.98 -> "14.98 km". */
export function formatKilometres(km: number): string {
  return `${distance.format(km)} km`;
}

/** Weight for display: 3 -> "3 kg", 3.5 -> "3.5 kg". */
export function formatWeight(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}
