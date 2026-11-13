## Edition management
- Keep edition content in Cloud event_editions and read it at runtime on the client and in edge functions; static content is only the initial fallback so Cloudflare does not need rebuilding for each flyer.
- Publishing editions must be atomic and admin-authorized, and historical purchases must retain their original edition and event details.
- Mount edition management on a dedicated admin-authorized staff route, independent of ticket-record loading and controls, to keep staff workflows separate.
- Gallery imports stage photos in Cloud storage in resumable, admin-triggered batches; publish atomically only after every source is verified complete, retaining published albums as the archive. Provider access restrictions must fail visibly without changing the public gallery.
- Last Edition shows every published album whose edition number matches the latest published album, so extra photographers for the same edition add to it rather than replace it.
- Pixieset galleries are read through their public crawler page and photo-list feed, since the normal page is behind a browser check.
- Return expected photographer-access failures as terminal failed-job results, not HTTP errors; the staff importer must stop polling and retain its page so blocked sources never masquerade as application crashes.
- Scope vendor records, summaries, exports, clearing and availability to their stored edition; expose public availability only as current-edition aggregate counts to avoid leaking vendor contacts.- Find A Raver applicants go live via a derived 2-minute auto_approve_at window (RLS + swipe query), persisted to approved by apply_partner_auto_approvals on applicant/staff visits; staff review is tracked separately in reviewed_at, so approval never waits for a person or a cron job.

- Find A Raver outreach (buyer invites + new-raver alerts) runs in one idempotent, batched function triggered by Partner/staff page visits, with signed opt-out links, so no cron is needed.
- Ticket email delivery is tracked on payment_intents (claimed only after the provider accepts); retry-ticket-emails retries undelivered orders on page visits with a lease and limit pause, and marketing outreach yields to it so tickets are never starved.
