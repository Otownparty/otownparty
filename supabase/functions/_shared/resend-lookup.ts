// Pure helpers for the staff Resend QR tool (shared with tests).
export function extractReference(raw: string): string {
  const text = (raw ?? "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");
  const m = text.match(/OTP-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (m) return m[0].toUpperCase().replace(/^OTP/, "OTP").replace(/^(OTP-)(.*)$/, (_, p, r) => p + r.toLowerCase());
  const cleaned = text.replace(/^\s*(payment\s*)?ref(erence)?(\s*id)?\s*[:#-]?\s*/i, "").replace(/\s+/g, "");
  return cleaned;
}

export function normalizeEmail(raw: string): string {
  return (raw ?? "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u00A0\s]/g, "").toLowerCase();
}

export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function closeEmails(target: string, candidates: string[], max = 2): string[] {
  const t = normalizeEmail(target);
  return [...new Set(candidates.map(normalizeEmail))].filter((c) => c !== t && editDistance(c, t) <= max).slice(0, 5);
}
