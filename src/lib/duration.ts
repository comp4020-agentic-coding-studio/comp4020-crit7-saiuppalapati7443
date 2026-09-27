// Compressed for a live demo — see README for the real-world numbers these
// stand in for. Every constant a print job's duration depends on lives here,
// in one place, so the formula is never re-guessed at a call site.
export const BASE_SECONDS = 5;
export const PER_PAGE_SECONDS = 2;
export const DUPLEX_MULTIPLIER = 0.6;
export const COLOR_MULTIPLIER = 1.5;

export function printDurationSeconds(pageCount: number, color: boolean, duplex: boolean): number {
  let seconds = BASE_SECONDS + PER_PAGE_SECONDS * pageCount;
  if (duplex) seconds *= DUPLEX_MULTIPLIER;
  if (color) seconds *= COLOR_MULTIPLIER;
  return seconds;
}
