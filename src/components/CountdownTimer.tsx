import { useState, useEffect } from "react";

const TARGET = new Date("2026-10-17T17:00:00Z").getTime();
const CountdownTimer = () => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, TARGET - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  return (
    <div className="flex gap-4 sm:gap-6">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="text-3xl sm:text-5xl font-display font-bold text-primary tabular-nums">
            {String(u.value).padStart(2, "0")}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest mt-1">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
