# Find A Raver: full profiles, auto-approval, voice notes

## 1. View full profile while swiping
- Add an **eye button** between the X and the heart on the swipe card.
- Tapping it (or tapping the photo) opens a full-screen profile sheet: all uploaded photos as a swipeable carousel with dots, name, age, gender, what they're looking for, and their bio.
- From the sheet they can Pass, Like or close and come back to the card.
- Same profile view available from the inbox/chat header (tap the match's photo).
- Card itself gets small photo-count dots at the top so people know there are more pictures.

## 2. Automatic approval with "Reviewed / Declined"
- New applicants are approved automatically about 2 minutes after submitting (they get the existing approval email and can start swiping).
- They stay in the staff **Pending review** list until you tap **Mark reviewed**, or **Decline** (with optional reason) which removes them from swiping immediately and shows them the existing rejected screen.
- Staff buttons change from Approve/Reject to **Reviewed / Decline**; a "Needs review" count replaces the pending count.
- Applicant's own waiting screen says "You'll be live in about 2 minutes".
- Disabled/declined users are never auto-approved again unless they resubmit.

## 3. Voice notes in chat
- Mic button next to the send box: hold-or-tap to record (max 60 seconds), preview, send or cancel.
- Voice notes show as a play bar with duration in the chat; inbox preview shows "🎤 Voice note".
- Same 24-hour chat rules and reply email notifications apply. No calls.

## Technical details
- DB: add `reviewed_at timestamptz`, `auto_approve_at timestamptz` to `partner_profiles`; on submit/resubmit set `status='pending'`, `auto_approve_at=now()+2min`. Approve server-side: a pg_cron job every minute flips due pending rows to `approved` and invokes `notify-partner-approved` (so it works even if the applicant closes the page). Staff "pending review" filter = `reviewed_at IS NULL AND status <> 'rejected'`.
- Messages: add `kind text default 'text'`, `audio_url text`, `audio_duration int` to `partner_messages`; private `partner-voice` storage bucket, upload path `{match_id}/{uuid}.webm`, RLS allowing only the two match members to read/write; playback via signed URLs. Recording with MediaRecorder (webm/opus, mp4 fallback for iOS Safari).
- `notify-partner-message` email text handles voice notes.
- Components: new `ProfileSheet.tsx`; edits to `SwipeDeck.tsx`, `ChatPanel.tsx`, `Inbox.tsx`, `usePartnerInbox.ts`, `Partner.tsx`, `PartnerAdminPanel.tsx`.
- Changes to the site need a Cloudflare update; auto-approval runs on the backend.
