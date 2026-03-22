"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Github, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const frameworks = [
  {
    name: "React",
    install: "npm install @janus/react @janus/sdk",
    code: `import { JanusProvider, useJanus } from '@janus/react';

function LoginForm() {
  const { execute, loading } = useJanus();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { success, token } = await execute();
    if (success) { /* submit with token */ }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={loading}>Log in</button>
    </form>
  );
}`,
  },
  {
    name: "Next.js",
    install: "npm install @janus/nextjs @janus/sdk",
    code: `// app/api/submit/route.ts
import { verifyJanusToken } from '@janus/nextjs/server';

export async function POST(request) {
  const body = await request.json();
  const result = await verifyJanusToken(
    body['janus-token'],
    {
      secretKey: process.env.JANUS_SECRET_KEY,
      apiUrl: process.env.JANUS_API_URL,
    }
  );

  if (!result.success || result.action === 'block') {
    return Response.json({ error: 'Bot' }, { status: 403 });
  }
}`,
  },
  {
    name: "Express",
    install: "npm install @janus/express",
    code: `import { janusVerify } from '@janus/express';

app.post('/login',
  janusVerify({
    secretKey: process.env.JANUS_SECRET_KEY,
    apiUrl: 'https://janus.example.com',
  }),
  (req, res) => {
    // req.janus.success === true
    // req.janus.risk_score available
    res.json({ ok: true });
  }
);`,
  },
  {
    name: "HTML",
    install: '<script src="https://janus.example.com/sdk.js"></script>',
    code: `const janus = new Janus.Janus({
  siteKey: "jns_site_live_xxx",
  apiUrl: "https://janus.example.com",
  mode: "invisible",
});

const form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { success, token } = await janus.execute();
  if (success) {
    document.querySelector("[name=janus-token]").value = token;
    form.submit();
  }
});`,
  },
];

/* All colors use CSS vars from global.css so light/dark mode works automatically */
const s = {
  bg: { background: 'var(--j-bg)' },
  bgCode: { backgroundColor: 'var(--j-bg-code)' },
  border: { borderColor: 'var(--j-border)' },
  borderB: { borderBottom: '1px solid var(--j-border)' },
  borderT: { borderTop: '1px solid var(--j-border)' },
  accent: { color: 'var(--j-accent)' },
  accentBg: { backgroundColor: 'var(--j-accent)', color: 'var(--j-accent-text)' },
  text: { color: 'var(--j-text)' },
  text2: { color: 'var(--j-text-secondary)' },
  text3: { color: 'var(--j-text-tertiary)' },
  muted: { color: 'var(--j-text-muted)' },
  code: { color: 'var(--j-code-text)' },
} as const;

export default function HomePage() {
  const [activeFramework, setActiveFramework] = useState(0);
  const fw = frameworks[activeFramework]!;
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen antialiased" style={{ ...s.bg, ...s.text }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm" style={{ ...s.borderB, backgroundColor: 'color-mix(in srgb, var(--j-bg) 95%, transparent)' }}>
        <div className="mx-auto max-w-[1100px] flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Shield size={18} style={s.accent} />
            <span className="font-semibold text-[15px]">Janus</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] transition-colors" style={s.text2}>Docs</Link>
            <Link href="/demo" className="text-[13px] transition-colors" style={s.text2}>Demo</Link>
            <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="transition-colors" style={s.text2} aria-label="GitHub">
              <Github size={18} />
            </a>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="transition-colors"
              style={s.text2}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/docs/getting-started/quickstart" className="hidden sm:flex h-8 px-3 items-center rounded-md text-[13px] font-medium transition-colors" style={s.accentBg}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1100px] px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[13px] font-medium mb-4" style={s.accent}>Open source bot detection</p>
            <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
              Protect your forms without selling your users.
            </h1>
            <p className="mt-4 text-[16px] leading-[1.7] max-w-[440px]" style={s.text2}>
              Self-hosted alternative to Turnstile and reCAPTCHA. Proof-of-work, fingerprinting, behavioral analysis. Your servers, your data.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href="/docs/getting-started/quickstart" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium" style={s.accentBg}>Get started</Link>
              <Link href="/demo" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium" style={{ border: '1px solid var(--j-border)', ...s.text2 }}>Live demo</Link>
            </div>
            <code className="mt-6 block text-[13px] font-mono" style={s.text3}>$ docker compose up -d</code>
          </div>

          <div className="rounded-lg p-6" style={{ border: '1px solid var(--j-border)', ...s.bgCode }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--j-text-muted)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--j-text-muted)' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--j-text-muted)' }} />
              <span className="ml-2 text-[11px] font-mono" style={s.text3}>your-app.com/login</span>
            </div>
            <div className="space-y-3 font-mono text-[12px]">
              {[
                ["1", "Challenge requested", "ok"],
                ["2", "Fingerprint collected", "14 signals"],
                ["3", "Behavior analyzed", "human-like"],
                ["4", "PoW solved", "1,847ms"],
                ["5", "GeoIP check", "residential"],
              ].map(([n, label, val]) => (
                <div key={n} className="flex items-center gap-2" style={s.text3}>
                  <span style={s.accent}>{n}</span> {label} <span className="text-emerald-500">{val}</span>
                </div>
              ))}
              <div className="mt-4 pt-3 flex items-center justify-between" style={s.borderT}>
                <span style={s.text2}>Risk score</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--j-border)' }}>
                    <div className="h-full w-[15%] rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-emerald-500 font-bold">15</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span style={s.text2}>Action</span>
                <span className="text-emerald-500">allow</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={s.text2}>Token</span>
                <span style={s.text3}>jns_tok_a8f2...c41d</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={s.borderT} />

      {/* Framework Tabs */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium mb-2" style={s.accent}>Integration</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Works with your stack</h2>
        <p className="mt-2 text-[14px] max-w-[420px]" style={s.text3}>First-party SDKs for React, Next.js, and Express. Or use the 5KB browser SDK directly.</p>

        <div className="mt-8 flex gap-1" style={s.borderB}>
          {frameworks.map((f, i) => (
            <button key={f.name} onClick={() => setActiveFramework(i)}
              className="px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px"
              style={{ borderColor: i === activeFramework ? 'var(--j-accent)' : 'transparent', color: i === activeFramework ? 'var(--j-text)' : 'var(--j-text-tertiary)' }}>
              {f.name}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg overflow-hidden" style={{ border: '1px solid var(--j-border)', ...s.bgCode }}>
          <div className="flex items-center px-4 py-2" style={s.borderB}>
            <code className="text-[12px] font-mono" style={s.text3}>{fw.install}</code>
          </div>
          <pre className="p-4 text-[13px] font-mono leading-[1.7] overflow-x-auto" style={s.code}><code>{fw.code}</code></pre>
        </div>
      </section>

      <div style={s.borderT} />

      {/* Comparison */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium mb-2" style={s.accent}>Comparison</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Why switch</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={s.borderB}>
                <th className="pb-3 text-left font-normal w-[120px]" style={s.text3} />
                <th className="pb-3 text-left font-normal" style={s.text3}>Turnstile / reCAPTCHA</th>
                <th className="pb-3 text-left font-medium" style={s.accent}>Janus</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Data", "Sent to Cloudflare / Google", "Stays on your servers"],
                ["Privacy", "Third-party cookies, tracking", "No cookies, no tracking"],
                ["Scoring", "Black box", "Open source, tunable"],
                ["Infra", "External dependency", "Self-hosted"],
                ["SDK", "50-200 KB", "~5 KB gzipped"],
                ["Cost", "Free tier with limits", "Free forever"],
              ].map(([label, them, us]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--j-border-subtle)' }}>
                  <td className="py-3" style={s.text2}>{label}</td>
                  <td className="py-3" style={s.text3}>{them}</td>
                  <td className="py-3">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={s.borderT} />

      {/* Features Grid */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium mb-2" style={s.accent}>Detection</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Multiple layers, one score</h2>
        <p className="mt-2 text-[14px] max-w-[480px]" style={s.text3}>Every verification combines 20+ independent signals into a single risk score from 0 (human) to 100 (bot).</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--j-border)', border: '1px solid var(--j-border)' }}>
          {[
            ["Proof-of-Work", "SHA-256 in Web Worker. Auto-scales under attack."],
            ["Fingerprinting", "Canvas, WebGL, audio, fonts. Hashed, never raw."],
            ["Behavioral Analysis", "Mouse velocity, keyboard timing, scroll, touch."],
            ["Automation Detection", "Selenium, Puppeteer, PhantomJS, CDP, headless."],
            ["GeoIP Intelligence", "Datacenter, VPN, proxy. Self-hosted MaxMind."],
            ["Adaptive Difficulty", "PoW difficulty auto-increases during attacks."],
            ["Plugin System", "Custom scoring logic. Global or per-site."],
            ["Email Alerts", "SMTP alerts with per-event throttling."],
            ["Webhook Events", "HMAC-signed payloads on block/spike."],
          ].map(([title, desc]) => (
            <div key={title} className="p-5" style={s.bg}>
              <h3 className="text-[13px] font-medium">{title}</h3>
              <p className="mt-1 text-[12px] leading-[1.6]" style={s.text3}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={s.borderT} />

      {/* Stats */}
      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[["~5 KB", "SDK gzipped"], ["20+", "detection signals"], ["168", "tests passing"], ["0", "browser deps"]].map(([v, l]) => (
            <div key={l}><p className="text-[32px] font-bold tracking-tight" style={s.accent}>{v}</p><p className="text-[13px]" style={s.text3}>{l}</p></div>
          ))}
        </div>
      </section>

      <div style={s.borderT} />

      {/* CTA */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Start protecting your forms.</h2>
        <p className="mt-2 text-[14px]" style={s.text3}>Deploy in minutes. No vendor lock-in. MIT licensed.</p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/docs/getting-started/quickstart" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium" style={s.accentBg}>Read the docs</Link>
          <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="h-10 px-5 inline-flex items-center gap-2 rounded-md text-[14px] font-medium" style={{ border: '1px solid var(--j-border)', ...s.text2 }}>
            <Github size={16} /> GitHub
          </a>
        </div>
      </section>

      <footer className="py-6" style={s.borderT}>
        <div className="mx-auto max-w-[1100px] px-6 flex items-center justify-between">
          <span className="text-[12px]" style={s.text3}>MIT License</span>
          <span className="text-[12px]" style={s.text3}>Janus</span>
        </div>
      </footer>
    </div>
  );
}
