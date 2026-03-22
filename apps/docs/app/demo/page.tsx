"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Shield, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface LogEntry { id: number; ts: string; type: "info" | "success" | "error" | "signal"; msg: string; }

const SIGNALS = [
  { delay: 100, type: "info" as const, msg: "Requesting PoW challenge..." },
  { delay: 600, type: "signal" as const, msg: "Collecting fingerprint..." },
  { delay: 800, type: "signal" as const, msg: "  canvas: sha256(a4f2c8...)" },
  { delay: 900, type: "signal" as const, msg: "  webgl: ANGLE (Apple, M2)" },
  { delay: 1000, type: "signal" as const, msg: "  audio: sha256(7e1b3d...)" },
  { delay: 1100, type: "signal" as const, msg: "  fonts: 14 detected" },
  { delay: 1300, type: "signal" as const, msg: "Tracking behavior..." },
  { delay: 1500, type: "signal" as const, msg: "  mouse: 23 events, CV 0.42" },
  { delay: 1600, type: "signal" as const, msg: "  keyboard: variance 0.31" },
  { delay: 1700, type: "signal" as const, msg: "  scroll: 4 events" },
  { delay: 1900, type: "signal" as const, msg: "Automation check..." },
  { delay: 2000, type: "signal" as const, msg: "  webdriver: false" },
  { delay: 2050, type: "signal" as const, msg: "  headless: false" },
  { delay: 2300, type: "info" as const, msg: "Solving PoW (difficulty 4)..." },
  { delay: 3800, type: "info" as const, msg: "Solved in 1,847ms (nonce 48291)" },
  { delay: 4000, type: "info" as const, msg: "Submitting..." },
  { delay: 4400, type: "info" as const, msg: "GeoIP: US, residential" },
];

function now(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
}

export default function DemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: number; action: string; anomalies: string[] } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(0);
  const { resolvedTheme, setTheme } = useTheme();

  const log = (type: LogEntry["type"], msg: string) =>
    setLogs((p) => [...p, { id: id.current++, ts: now(), type, msg }]);

  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [logs]);

  const run = (mode: "human" | "bot") => {
    setRunning(true); setResult(null); setLogs([]); id.current = 0;
    const sigs = mode === "bot"
      ? SIGNALS.map((s) => {
          if (s.msg.includes("mouse:")) return { ...s, msg: "  mouse: 0 events, CV 0.00" };
          if (s.msg.includes("keyboard:")) return { ...s, msg: "  keyboard: variance 0.00" };
          if (s.msg.includes("scroll:")) return { ...s, msg: "  scroll: 0 events" };
          if (s.msg.includes("webdriver:")) return { ...s, msg: "  webdriver: true" };
          if (s.msg.includes("headless:")) return { ...s, msg: "  headless: true" };
          if (s.msg.includes("difficulty")) return { ...s, msg: "Solving PoW (difficulty 7)..." };
          if (s.msg.includes("Solved")) return { ...s, delay: 2500, msg: "Solved in 42ms (nonce 1203)" };
          if (s.msg.includes("GeoIP")) return { ...s, msg: "GeoIP: DE, datacenter (AWS), VPN" };
          return s;
        })
      : SIGNALS;
    const res = mode === "bot"
      ? { score: 87, action: "block", anomalies: ["datacenter_ip", "pow_solve_too_fast", "no_mouse_movement", "headless_detected"] }
      : { score: 15, action: "allow", anomalies: [] as string[] };
    sigs.forEach(({ delay, type, msg }) => setTimeout(() => log(type, msg), delay));
    setTimeout(() => {
      setResult(res);
      if (res.action === "allow") { log("success", `→ score ${res.score} — allowed`); log("success", "  token: jns_tok_a8f2...c41d (5m TTL)"); }
      else { log("error", `→ score ${res.score} — blocked`); log("error", `  anomalies: ${res.anomalies.join(", ")}`); }
      setRunning(false);
    }, 4800);
  };

  const color = (t: LogEntry["type"]) =>
    t === "success" ? "text-emerald-500" : t === "error" ? "text-red-500" : t === "signal" ? "text-[var(--j-accent)]" : "text-[var(--j-text-tertiary)]";

  return (
    <div className="min-h-screen" style={{ background: 'var(--j-bg)', color: 'var(--j-text)' }}>
      <nav style={{ borderBottom: '1px solid var(--j-border)' }}>
        <div className="mx-auto max-w-[980px] flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Shield size={18} style={{ color: 'var(--j-accent)' }} />
            <span className="font-semibold text-[15px]">Janus</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] transition-colors" style={{ color: 'var(--j-text-secondary)' }}>Docs</Link>
            <span className="text-[13px]">Demo</span>
            <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="transition-colors" style={{ color: 'var(--j-text-secondary)' }} aria-label="Toggle theme">
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[980px] px-6 py-16">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Demo</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--j-text-tertiary)' }}>Client-side simulation. No real API calls.</p>

        <div className="mt-8 flex gap-3">
          <button onClick={() => run("human")} disabled={running} className="h-8 px-3 rounded-md text-[13px] font-medium disabled:opacity-40 transition-colors" style={{ backgroundColor: 'var(--j-bg-code)', border: '1px solid var(--j-border)' }}>
            Human
          </button>
          <button onClick={() => run("bot")} disabled={running} className="h-8 px-3 rounded-md text-[13px] font-medium disabled:opacity-40 transition-colors" style={{ backgroundColor: 'var(--j-bg-code)', border: '1px solid var(--j-border)' }}>
            Bot
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-px rounded-md overflow-hidden" style={{ backgroundColor: 'var(--j-border)', border: '1px solid var(--j-border)' }}>
          <div className="p-6" style={{ background: 'var(--j-bg)' }}>
            <p className="text-[11px] uppercase tracking-wider font-medium mb-6" style={{ color: 'var(--j-text-tertiary)' }}>Client</p>
            <div className="flex items-center justify-center min-h-[200px]">
              {!running && !result && (
                <div className="flex items-center gap-3 rounded-md px-4 py-2.5" style={{ border: '1px solid var(--j-border)' }}>
                  <div className="h-5 w-5 rounded-sm" style={{ border: '2px solid var(--j-text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--j-text-secondary)' }}>I&apos;m not a robot</span>
                  <span className="text-[10px] ml-3" style={{ color: 'var(--j-text-tertiary)' }}>Janus</span>
                </div>
              )}
              {running && (
                <div className="flex items-center gap-3 rounded-md px-4 py-2.5" style={{ border: '1px solid var(--j-border)' }}>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--j-accent)', borderTopColor: 'transparent' }} />
                  <span className="text-[13px]" style={{ color: 'var(--j-text-secondary)' }}>Verifying</span>
                </div>
              )}
              {!running && result && (
                <div className="text-center">
                  <div className="flex items-center gap-3 rounded-md px-4 py-2.5" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: result.action === "allow" ? "#22c55e44" : "#ef444444" }}>
                    <span className="text-[13px]" style={{ color: result.action === "allow" ? "#22c55e" : "#ef4444" }}>
                      {result.action === "allow" ? "Verified" : "Blocked"}
                    </span>
                    <span className="text-[13px]" style={{ color: 'var(--j-text-tertiary)' }}>score {result.score}</span>
                  </div>
                  {result.anomalies.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {result.anomalies.map((a) => (
                        <code key={a} className="text-[11px] text-red-500 bg-red-500/5 border border-red-500/10 rounded px-1.5 py-0.5">{a}</code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--j-bg)' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--j-border)' }}>
              <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--j-text-tertiary)' }}>Server</p>
              {running && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--j-accent)' }} />}
            </div>
            <div ref={ref} className="h-[230px] overflow-y-auto p-4 font-mono text-[12px] leading-[1.7]" style={{ backgroundColor: 'var(--j-bg-code)' }}>
              {logs.length === 0 && <span style={{ color: 'var(--j-text-muted)' }}>waiting...</span>}
              {logs.map((l) => (
                <div key={l.id}><span className="mr-2" style={{ color: 'var(--j-text-muted)' }}>{l.ts}</span><span className={color(l.type)}>{l.msg}</span></div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-[12px]" style={{ color: 'var(--j-text-tertiary)' }}>
          In production, all scoring happens server-side. <Link href="/docs/getting-started/quickstart" className="hover:underline" style={{ color: 'var(--j-accent)' }}>Deploy yours</Link>.
        </p>
      </div>
    </div>
  );
}
