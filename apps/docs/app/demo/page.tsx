"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "signal";
  message: string;
}

const DEMO_SIGNALS = [
  { delay: 100, type: "info" as const, message: "Requesting PoW challenge..." },
  { delay: 600, type: "signal" as const, message: "Collecting browser fingerprint..." },
  { delay: 800, type: "signal" as const, message: "  canvas: sha256(a4f2c8...)" },
  { delay: 900, type: "signal" as const, message: "  webgl: ANGLE (Apple, M2)" },
  { delay: 1000, type: "signal" as const, message: "  audio: sha256(7e1b3d...)" },
  { delay: 1100, type: "signal" as const, message: "  fonts: 14 detected" },
  { delay: 1300, type: "signal" as const, message: "Tracking behavioral signals..." },
  { delay: 1500, type: "signal" as const, message: "  mouse events: 23, CV: 0.42" },
  { delay: 1600, type: "signal" as const, message: "  keyboard variance: 0.31" },
  { delay: 1700, type: "signal" as const, message: "  scroll events: 4" },
  { delay: 1900, type: "signal" as const, message: "Checking automation markers..." },
  { delay: 2000, type: "signal" as const, message: "  webdriver: false" },
  { delay: 2050, type: "signal" as const, message: "  phantom: false" },
  { delay: 2100, type: "signal" as const, message: "  headless: false" },
  { delay: 2300, type: "info" as const, message: "Solving PoW (difficulty: 4)..." },
  { delay: 3800, type: "info" as const, message: "PoW solved in 1,847ms (nonce: 48291)" },
  { delay: 4000, type: "info" as const, message: "Submitting verification..." },
  { delay: 4400, type: "info" as const, message: "GeoIP: US, residential, no VPN" },
];

const DEMO_RESULT_HUMAN = { delay: 4800, score: 15, action: "allow", anomalies: [] as string[] };
const DEMO_RESULT_BOT = { delay: 4800, score: 87, action: "block", anomalies: ["datacenter_ip", "pow_solve_too_fast", "no_mouse_movement", "headless_detected"] };

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
}

export default function DemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: number; action: string; anomalies: string[] } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { id: idCounter.current++, timestamp: formatTime(), type, message }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const runDemo = (simMode: "human" | "bot") => {
    setRunning(true);
    setResult(null);
    setLogs([]);
    idCounter.current = 0;

    const signals = simMode === "bot"
      ? DEMO_SIGNALS.map((s) => {
          if (s.message.includes("mouse events")) return { ...s, message: "  mouse events: 0, CV: 0.00" };
          if (s.message.includes("keyboard")) return { ...s, message: "  keyboard variance: 0.00" };
          if (s.message.includes("scroll events")) return { ...s, message: "  scroll events: 0" };
          if (s.message.includes("webdriver")) return { ...s, message: "  webdriver: true" };
          if (s.message.includes("headless")) return { ...s, message: "  headless: true" };
          if (s.message.includes("Solving PoW")) return { ...s, message: "Solving PoW (difficulty: 7)..." };
          if (s.message.includes("PoW solved")) return { ...s, delay: 2500, message: "PoW solved in 42ms (nonce: 1203)" };
          if (s.message.includes("GeoIP")) return { ...s, message: "GeoIP: DE, datacenter (AWS), VPN detected" };
          return s;
        })
      : DEMO_SIGNALS;

    const demoResult = simMode === "bot" ? DEMO_RESULT_BOT : DEMO_RESULT_HUMAN;

    signals.forEach(({ delay, type, message }) => {
      setTimeout(() => addLog(type, message), delay);
    });

    setTimeout(() => {
      setResult(demoResult);
      if (demoResult.action === "allow") {
        addLog("success", `Score: ${demoResult.score}/100 → ALLOWED`);
        addLog("success", "Token issued: jns_tok_a8f2...c41d (expires in 5m)");
      } else {
        addLog("error", `Score: ${demoResult.score}/100 → BLOCKED`);
        addLog("error", `Anomalies: ${demoResult.anomalies.join(", ")}`);
      }
      setRunning(false);
    }, demoResult.delay);
  };

  const logColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-emerald-400";
      case "warning": return "text-[#d4a254]";
      case "error": return "text-red-400";
      case "signal": return "text-[#d4a254]/70";
      default: return "text-zinc-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a254" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Janus</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</Link>
            <Link href="/demo" className="text-sm" style={{ color: '#d4a254' }}>Demo</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-14">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#d4a254' }}>Interactive</p>
          <h1 className="text-4xl font-bold">Live Demo</h1>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            See how Janus scores a real browser vs a headless bot. This is a client-side simulation.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => runDemo("human")}
            disabled={running}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all hover:brightness-110"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}
          >
            Simulate Human
          </button>
          <button
            onClick={() => runDemo("bot")}
            disabled={running}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all hover:brightness-110"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
          >
            Simulate Bot
          </button>
        </div>

        {/* Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Widget simulation */}
          <div className="rounded-xl bg-white/[0.02] p-8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-6">Client (Browser)</h2>
            <div className="flex items-center justify-center py-16">
              {!running && !result && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 rounded-lg px-5 py-3" style={{ border: '1px solid rgba(212, 162, 84, 0.2)', backgroundColor: 'rgba(212, 162, 84, 0.04)' }}>
                    <div className="h-6 w-6 rounded" style={{ border: '2px solid rgba(212, 162, 84, 0.4)' }} />
                    <span className="text-sm text-zinc-300">I&apos;m not a robot</span>
                    <span className="text-[10px] ml-4" style={{ color: '#d4a254' }}>Janus</span>
                  </div>
                  <p className="mt-4 text-xs text-zinc-600">Click a button above to start</p>
                </div>
              )}
              {running && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 rounded-lg px-5 py-3" style={{ border: '1px solid rgba(212, 162, 84, 0.3)', backgroundColor: 'rgba(212, 162, 84, 0.06)' }}>
                    <div className="h-5 w-5 animate-spin rounded-full border-t-transparent" style={{ borderWidth: '2px', borderColor: '#d4a254', borderTopColor: 'transparent' }} />
                    <span className="text-sm text-zinc-300">Verifying...</span>
                  </div>
                </div>
              )}
              {!running && result && (
                <div className="text-center">
                  <div
                    className="inline-flex items-center gap-3 rounded-lg px-5 py-3"
                    style={{
                      border: `1px solid ${result.action === "allow" ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                      backgroundColor: result.action === "allow" ? "rgba(34, 197, 94, 0.06)" : "rgba(239, 68, 68, 0.06)",
                    }}
                  >
                    {result.action === "allow" ? (
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M3 8l3.5 3.5L13 5" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    )}
                    <span className="text-sm text-zinc-300">
                      {result.action === "allow" ? "Verified" : "Blocked"}
                    </span>
                  </div>
                  <div className="mt-8">
                    <div className="relative h-1.5 w-56 mx-auto rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${result.score}%`, backgroundColor: result.action === "allow" ? "#22c55e" : "#ef4444" }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      <span style={{ color: result.action === "allow" ? "#22c55e" : "#ef4444" }}>
                        Risk: {result.score}/100
                      </span>
                    </p>
                  </div>
                  {result.anomalies.length > 0 && (
                    <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                      {result.anomalies.map((a) => (
                        <span key={a} className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Server log */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">Server Log</h2>
              {running && (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: '#d4a254' }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#d4a254' }} />
                  </span>
                  <span className="text-xs text-zinc-500">Processing</span>
                </span>
              )}
            </div>
            <div ref={logRef} className="h-80 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
              {logs.length === 0 && (
                <p className="text-zinc-700">Waiting for verification request...</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-zinc-700 shrink-0">{log.timestamp}</span>
                  <span className={logColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-600">
            This is a client-side simulation. In production, all verification happens server-side.
          </p>
          <Link
            href="/docs/getting-started/quickstart"
            className="mt-4 inline-flex rounded-lg px-5 py-2 text-sm font-medium transition-all hover:brightness-110"
            style={{ border: '1px solid rgba(212, 162, 84, 0.3)', color: '#d4a254' }}
          >
            Deploy your own instance
          </Link>
        </div>
      </div>
    </div>
  );
}
