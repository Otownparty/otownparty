## Edition management
- Keep edition content in Cloud event_editions and read it at runtime on the client and in edge functions; static content is only the initial fallback so Cloudflare does not need rebuilding for each flyer.
- Publishing editions must be atomic and admin-authorized, and historical purchases must retain their original edition and event details.