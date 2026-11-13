# Never lose a ticket email to the daily limit again

## What went wrong
Resend's daily sending limit was used up (partly by the Find A Raver invites/alerts), so the ticket emails after that were rejected. Our system noted nothing, so nobody knew to retry — and Resend has no resend button.

## What I'll build

1. **Track every ticket email.** Each paid order records whether its ticket email was delivered to Resend, when, and why it failed (e.g. "daily limit reached").

2. **"Undelivered tickets" tab on the staff page.** Lists every paid buyer whose ticket email failed, with the reason. Buttons: **Resend** (one person) and **Resend all**. Same QR codes, so each ticket still scans only once.

3. **Automatic retries.** Failed ticket emails are retried automatically whenever someone opens the ticket, Find A Raver or staff pages (no background timer needed), in small batches. If the limit is still reached, they wait and try again later — nothing gets dropped.

4. **Tickets always come first.** Find A Raver invites and "new ravers" alerts pause whenever any ticket email is waiting to be retried, or once a daily share of the limit is used, so marketing emails can never again starve ticket delivery.

5. **Fix today's buyers now.** Find every recent paid order whose ticket email failed (the people in your screenshots) and resend their tickets once the limit has reset.

## Worth knowing
- The real fix for volume is a higher Resend plan (the free plan allows 100 emails a day). The steps above guarantee no ticket is lost, but they can't send more than Resend allows per day.

## Technical details
- Add `email_status`, `email_error`, `email_sent_at`, `email_attempts` to `payment_intents`; set them in `paystack-webhook`, `verify-payment`, `claim-tickets`, `resend-ticket-email`.
- New `retry-ticket-emails` edge function: admin "resend all/one" plus a public bounded sweep (batch of 10, single-flight lease row, stops on 429).
- `raver-outreach`: skip sends if any pending/failed ticket email exists or a daily outreach cap is hit; stop on Resend 429.
- Backfill: mark paid orders without a confirmed send as failed by checking Resend's email list for failed/missing ticket sends since the limit hit.
