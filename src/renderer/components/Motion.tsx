import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LatticeLoader({ className = "" }: { className?: string }) {
  return (
    <span className={`lattice-loader ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} style={{ "--cell": index } as CSSProperties} />
      ))}
    </span>
  );
}

export function StatusMark({ state }: { state: "ok" | "error" | "running" }) {
  if (state === "running") return <LatticeLoader />;
  return (
    <svg className={`status-mark ${state}`} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {state === "ok" ? (
        <path d="M1.5 6.5 4.5 9.5 10.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      ) : (
        <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      )}
    </svg>
  );
}

function elapsedLabel(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ThoughtLine({
  label,
  working = true,
  className = "",
}: {
  label: string;
  working?: boolean;
  className?: string;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!working) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [working]);

  return (
    <div className={`thought-line ${working ? "is-working" : ""} ${className}`.trim()} role="status" aria-live="polite">
      <span className="thought-mark">
        <LatticeLoader />
      </span>
      <span className="thought-label">{label || "Working"}</span>
      <span className="thought-track" aria-hidden="true">
        <span />
      </span>
      <span className="thought-time">{elapsedLabel(seconds)}</span>
    </div>
  );
}

interface Spark {
  id: number;
  angle: number;
  distance: number;
  length: number;
}

export function ClickSpark({ children }: { children: ReactNode }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    };
  }, []);

  const fire = (_event: ReactPointerEvent<HTMLSpanElement>) => {
    if (prefersReducedMotion()) return;
    const batch = Array.from({ length: 8 }, (_, index) => ({
      id: nextId.current++,
      angle: index * 45 + Math.random() * 18,
      distance: 15 + Math.random() * 13,
      length: 4 + Math.random() * 4,
    }));
    setSparks((current) => [...current, ...batch]);
    const ids = new Set(batch.map((spark) => spark.id));
    const timer = window.setTimeout(() => {
      setSparks((current) => current.filter((spark) => !ids.has(spark.id)));
    }, 520);
    timers.current.push(timer);
  };

  return (
    <span className="click-spark" onPointerDown={fire}>
      {children}
      <span className="spark-field" aria-hidden="true">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="spark"
            style={
              {
                "--angle": `${spark.angle}deg`,
                "--distance": `${spark.distance}px`,
                "--length": `${spark.length}px`,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </span>
  );
}

export function CountUp({
  value,
  format = (n) => n.toLocaleString(),
  className = "",
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={`count-up ${className}`.trim()}>{format(shown)}</span>;
}
