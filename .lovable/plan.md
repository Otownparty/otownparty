# Find A Raver: invite email + new-profile alerts

## 1. "Join Find A Raver" invite (one-off, staff-triggered)
- New card on the staff **Emails** page: "Invite ticket buyers to Find A Raver".
- Audience: every unique email that bought a ticket in any edition, minus anyone who already has a Find A Raver profile, minus anyone who opted out.
- Shows the count first, then a **Send invite** button. Each person gets it only once (re-pressing skips people already invited).
- Catchy, rave-style copy (dark/amber look), e.g. subject: "Your next rave partner is already inside 👥⚡" — "You've partied with us before. Now find who you'll faaji with at Mosh Edition. Swipe, match, voice-note, link up at the gate." Big button to the Find A Raver page.
- Sent in small batches with pauses, from the Find A Raver sender name (not the tickets sender), so ticket QR delivery is not starved.

## 2. "New ravers just dropped" alerts (automatic)
- When a new profile goes live, approved members who have already seen every profile get an email: "New ravers just joined — go swipe 👀".
- To avoid flooding inboxes and burning your email quota: at most **one alert per person every 12 hours**, grouping all new profiles in that window ("3 new ravers…").
- Not sent to the new person themselves, or to anyone who opted out.

## 3. Opt-out
- Every invite/alert email has a "Stop these emails" link that records the opt-out. Ticket QR emails are never affected.

## Things to know
- Both use your existing email account; the invite to a few hundred people uses a big share of your daily sending limit. I'll send it in batches and show progress, and you can send it at a quiet time (not right before an event).
- Marketing-style mail to people who didn't ask for it can land in spam; the opt-out link helps protect your sender reputation.

## Technical details
- Tables: `raver_email_optouts(email)`, `raver_invites_sent(email, sent_at)`, `partner_alert_state(user_id, last_alert_at, last_seen_profile_at)`.
- Edge function `send-raver-invite` (admin-only, batched, idempotent), `notify-new-ravers` (triggered when a profile becomes approved via apply_partner_auto_approvals/staff visit; throttled 12h per recipient; "seen everything" = no unswiped approved profiles before the new one), `raver-email-optout` (public token link).
- Sender uses the existing Find A Raver display name.
