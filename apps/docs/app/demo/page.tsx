"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

interface LogEntry {
  id: number;
  ts: string;
  type: "info" | "success" | "error" | "signal";
  msg: string;
}

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
      if (res.action === "allow") {
        log("success", `→ score ${res.score} — allowed`);
        log("success", "  token: jns_tok_a8f2...c41d (5m TTL)");
      } else {
        log("error", `→ score ${res.score} — blocked`);
        log("error", `  anomalies: ${res.anomalies.join(", ")}`);
      }
      setRunning(false);
    }, 4800);
  };

  const color = (t: LogEntry["type"]) =>
    t === "success" ? "text-emerald-400" : t === "error" ? "text-red-400" : t === "signal" ? "text-[#d4a254]" : "text-[#666]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <nav className="border-b border-[#1a1a1a]">
        <div className="mx-auto max-w-[980px] flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Shield size={18} className="text-[#d4a254]" />
            <span className="font-semibold text-[15px]">Janus</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">Docs</Link>
            <span className="text-[13px] text-[#ededed]">Demo</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[980px] px-6 py-16">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Demo</h1>
        <p className="mt-2 text-[14px] text-[#666]">Client-side simulation. No real API calls.</p>

        <div className="mt-8 flex gap-3">
          <button onClick={() => run("human")} disabled={running} className="h-8 px-3 rounded-md text-[13px] font-medium bg-[#1a1a1a] text-[#ededed] border border-[#2a2a2a] hover:border-[#444] disabled:opacity-40 transition-colors">
            Human
          </button>
          <button onClick={() => run("bot")} disabled={running} className="h-8 px-3 rounded-md text-[13px] font-medium bg-[#1a1a1a] text-[#ededed] border border-[#2a2a2a] hover:border-[#444] disabled:opacity-40 transition-colors">
            Bot
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-px bg-[#1a1a1a] rounded-md overflow-hidden border border-[#1a1a1a]">
          {/* Widget */}
          <div className="bg-[#0a0a0a] p-6">
            <p className="text-[11px] text-[#555] uppercase tracking-wider font-medium mb-6">Client</p>
            <div className="flex items-center justify-center min-h-[200px]">
              {!running && !result && (
                <div className="flex items-center gap-3 border border-[#2a2a2a] rounded-md px-4 py-2.5">
                  <div className="h-5 w-5 rounded-sm border-2 border-[#333]" />
                  <span className="text-[13px] text-[#888]">I&apos;m not a robot</span>
                  <span className="text-[10px] text-[#555] ml-3">Janus</span>
                </div>
              )}
              {running && (
                <div className="flex items-center gap-3 border border-[#2a2a2a] rounded-md px-4 py-2.5">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4a254] border-t-transparent" />
                  <span className="text-[13px] text-[#888]">Verifying</span>
                </div>
              )}
              {!running && result && (
                <div className="text-center">
                  <div className="flex items-center gap-3 border rounded-md px-4 py-2.5" style={{ borderColor: result.action === "allow" ? "#22c55e33" : "#ef444433" }}>
                    <span className="text-[13px]" style={{ color: result.action === "allow" ? "#22c55e" : "#ef4444" }}>
                      {result.action === "allow" ? "Verified" : "Blocked"}
                    </span>
                    <span className="text-[13px] text-[#555]">score {result.score}</span>
                  </div>
                  {result.anomalies.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {result.anomalies.map((a) => (
                        <code key={a} className="text-[11px] text-red-400 bg-red-400/5 border border-red-400/10 rounded px-1.5 py-0.5">{a}</code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Log */}
          <div className="bg-[#0a0a0a]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
              <p className="text-[11px] text-[#555] uppercase tracking-wider font-medium">Server</p>
              {running && <span className="h-1.5 w-1.5 rounded-full bg-[#d4a254] animate-pulse" />}
            </div>
            <div ref={ref} className="h-[230px] overflow-y-auto p-4 font-mono text-[12px] leading-[1.7]">
              {logs.length === 0 && <span className="text-[#333]">waiting...</span>}
              {logs.map((l) => (
                <div key={l.id}><span className="text-[#333] mr-2">{l.ts}</span><span className={color(l.type)}>{l.msg}</span></div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-[12px] text-[#444]">
          In production, all scoring happens server-side. <Link href="/docs/getting-started/quickstart" className="text-[#d4a254] hover:underline">Deploy yours</Link>.
        </p>
      </div>
    </div>
  );
}
