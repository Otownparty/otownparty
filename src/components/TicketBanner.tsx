// Shared banner used on the tickets page and in the staff live preview.
// Same look as the "tickets at the venue" closed banner used in past editions.
const TicketBanner = ({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-pink-400/10 to-sky-400/5 ${compact ? "p-5" : "p-6 sm:p-8 mb-10"}`}>
    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
    <div className="absolute bottom-0 left-0 w-56 h-56 bg-pink-400/15 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

    <div className="relative z-10 flex flex-col items-center text-center gap-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/40 border border-primary/30 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <p className="text-primary text-[10px] font-bold uppercase tracking-[0.25em]">Tonight We Rave</p>
      </div>

      {title.trim() && (
        <h2 className={`font-display font-bold leading-tight bg-gradient-to-r from-primary via-pink-400 to-sky-400 bg-clip-text text-transparent ${compact ? "text-2xl" : "text-3xl sm:text-5xl"}`}>
          {title}
        </h2>
      )}

      {message.trim() && (
        <p className={`max-w-xl text-foreground font-medium leading-relaxed whitespace-pre-line ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
          {message}
        </p>
      )}
    </div>
  </div>
);

export default TicketBanner;
