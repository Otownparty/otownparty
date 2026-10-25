## Edition management
- Keep edition content in Cloud event_editions and read it at runtime on the client and in edge functions; static content is only the initial fallback so Cloudflare does not need rebuilding for each flyer.
- Publishing editions must be atomic and admin-authorized, and historical purchases must retain their original edition and event details.
- Mount edition management on a dedicated admin-authorized staff route, independent of ticket-record loading and controls, to keep staff workflows separate.
- Gallery imports stage photos in Cloud storage in resumable, admin-triggered batches; publish atomically only after every source is verified complete, retaining published albums as the archive. Provider access restrictions must fail visibly without changing the public gallery.
- Last Edition shows every published album whose edition number matches the latest published album, so extra photographers for the same edition add to it rather than replace it.
- Pixieset galleries are read through their public crawler page and photo-list feed, since the normal page is behind a browser check.
- Return expected photographer-access failures as terminal failed-job results, not HTTP errors; the staff importer must stop polling and retain its page so blocked sources never masquerade as application crashes.
- Scope vendor records, summaries, exports, clearing and availability to their stored edition; expose public availability only as current-edition aggregate counts to avoid leaking vendor contacts.