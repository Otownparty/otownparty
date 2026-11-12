# Fix Resend QR for buyers who used the wrong email

## What I found
- The order is in the records: reference `OTP-32533635-0fc1-4dde-af65-430538c70492`, paid with **bhadbdsweet@gmail.com** (the wrong email), 16.0 Mosho Edition, ticket not yet scanned.
- So the tool should have found it. The first attempt was rejected because the pasted text included extra words/spaces (e.g. "Reference  OTP-..."), and the tool demands the reference be typed perfectly. The later attempts most likely had a hidden character or a small typo from copying on the phone, and the tool only accepts an exact match.
- Separately, the tool uses **one** email box for both "find the order" and "send to", so you can't say "find the order paid with the wrong email, send it to the right one".

## Changes
1. **Forgiving reference box** — paste anything (e.g. "Reference OTP-3253…", with spaces, line breaks or different capital letters). The tool pulls out the reference itself and matches it regardless of case.
2. **Two email boxes**:
   - "Email used when paying (optional)" — the wrong/old email to look up.
   - "Send tickets to" — the correct email.
   Find the order by reference **or** by the old email, then deliver the same QR codes to the new email. Leave the first box empty to keep the old behaviour.
3. **Near-match help** — if nothing matches exactly, show close matches (e.g. "Did you mean bhadbdsweet@gmail.com — 1 ticket, 16.0?") with a one-tap "Send to new email" button.
4. **Clearer messages** — say exactly what was searched and why it failed (wrong reference, no paid order, email limit reached).
5. Same QR codes as before, so each ticket still scans only once. Optionally update the order's email to the corrected one so future resends and records show the right address.
6. **Send this buyer's ticket now** to bhadndsweet@gmail.com once the fix is live, and confirm it shows as delivered.

## Technical details
- `resend-ticket-email`: extract `/OTP-[0-9a-f-]{36}/i` (fallback: strip whitespace) and match with `ilike`; accept `lookupEmail` + `email` (destination); return `suggestions` from `tickets`/`payment_intents` with similar emails (same edition, trimmed/lowercased, edit-distance ≤ 2) when nothing matches.
- Staff Resend QR UI in `Record.tsx`: add lookup-email field, suggestions list, clearer errors.
- Add a small test for reference extraction and lookup-vs-destination behaviour; deploy the function.
