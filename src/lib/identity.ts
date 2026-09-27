// Identification, not authentication: an ANU ID typed into a cookie, no
// password and no signature. It's enough to scope "your jobs" and stop one
// tab from cancelling another's job by accident — not enough to stop anyone
// who edits their own cookie from claiming any ID. See README for the limits.
export const IDENTITY_COOKIE = "anu_id";

const ANU_ID_PATTERN = /^u\d{7}$/i;

export function normalizeAnuId(raw: string): string | null {
  const id = raw.trim().toLowerCase();
  return ANU_ID_PATTERN.test(id) ? id : null;
}
