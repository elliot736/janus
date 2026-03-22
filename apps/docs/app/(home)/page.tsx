"use client";

import Link from "next/link";
import { useState } from "react";

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

export default function HomePage() {
  const [activeFramework, setActiveFramework] = useState(0);
  const fw = frameworks[activeFramework]!;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] antialiased">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1100px] flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a254" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span className="font-semibold text-[15px]">Janus</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">Docs</Link>
            <Link href="/demo" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">Demo</Link>
            <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">GitHub</a>
            <Link href="/docs/getting-started/quickstart" className="hidden sm:flex h-8 px-3 items-center rounded-md text-[13px] font-medium bg-[#d4a254] text-[#0a0a0a] hover:bg-[#c4933f] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + Product Preview */}
      <section className="mx-auto max-w-[1100px] px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <p className="text-[13px] font-medium text-[#d4a254] mb-4">Open source bot detection</p>
            <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
              Protect your forms without selling your users.
            </h1>
            <p className="mt-4 text-[16px] text-[#888] leading-[1.7] max-w-[440px]">
              Self-hosted alternative to Turnstile and reCAPTCHA. Proof-of-work, fingerprinting, behavioral analysis. Your servers, your data.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href="/docs/getting-started/quickstart" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium bg-[#d4a254] text-[#0a0a0a] hover:bg-[#c4933f] transition-colors">
                Get started
              </Link>
              <Link href="/demo" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium border border-[#2a2a2a] text-[#888] hover:text-[#ededed] hover:border-[#444] transition-colors">
                Live demo
              </Link>
            </div>
            <code className="mt-6 block text-[13px] text-[#555] font-mono">$ docker compose up -d</code>
          </div>

          {/* Right: Widget + Score Preview */}
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <span className="ml-2 text-[11px] text-[#444] font-mono">your-app.com/login</span>
            </div>
            <div className="space-y-3 font-mono text-[12px]">
              <div className="flex items-center gap-2 text-[#555]">
                <span className="text-[#d4a254]">1</span> Challenge requested <span className="text-[#333]">............</span> <span className="text-emerald-400">ok</span>
              </div>
              <div className="flex items-center gap-2 text-[#555]">
                <span className="text-[#d4a254]">2</span> Fingerprint collected <span className="text-[#333]">...........</span> <span className="text-emerald-400">14 signals</span>
              </div>
              <div className="flex items-center gap-2 text-[#555]">
                <span className="text-[#d4a254]">3</span> Behavior analyzed <span className="text-[#333]">..............</span> <span className="text-emerald-400">human-like</span>
              </div>
              <div className="flex items-center gap-2 text-[#555]">
                <span className="text-[#d4a254]">4</span> PoW solved <span className="text-[#333]">.....................</span> <span className="text-[#888]">1,847ms</span>
              </div>
              <div className="flex items-center gap-2 text-[#555]">
                <span className="text-[#d4a254]">5</span> GeoIP check <span className="text-[#333]">....................</span> <span className="text-emerald-400">residential</span>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex items-center justify-between">
                <span className="text-[#888]">Risk score</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div className="h-full w-[15%] rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-emerald-400 font-bold">15</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#888]">Action</span>
                <span className="text-emerald-400">allow</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#888]">Token</span>
                <span className="text-[#555]">jns_tok_a8f2...c41d</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Framework Tabs + Code */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium text-[#d4a254] mb-2">Integration</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Works with your stack</h2>
        <p className="mt-2 text-[14px] text-[#666] max-w-[420px]">First-party SDKs for React, Next.js, and Express. Or use the 5KB browser SDK directly.</p>

        <div className="mt-8 flex gap-1 border-b border-[#1a1a1a]">
          {frameworks.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setActiveFramework(i)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                i === activeFramework
                  ? "border-[#d4a254] text-[#ededed]"
                  : "border-transparent text-[#666] hover:text-[#888]"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#111] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-2">
            <code className="text-[12px] text-[#555] font-mono">{fw.install}</code>
          </div>
          <pre className="p-4 text-[13px] font-mono text-[#999] leading-[1.7] overflow-x-auto"><code>{fw.code}</code></pre>
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Comparison */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium text-[#d4a254] mb-2">Comparison</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Why switch</h2>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="pb-3 text-left text-[#666] font-normal w-[120px]" />
                <th className="pb-3 text-left text-[#666] font-normal">Turnstile / reCAPTCHA</th>
                <th className="pb-3 text-left font-medium text-[#d4a254]">Janus</th>
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
                <tr key={label} className="border-b border-[#1a1a1a]/60">
                  <td className="py-3 text-[#888]">{label}</td>
                  <td className="py-3 text-[#555]">{them}</td>
                  <td className="py-3 text-[#ededed]">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Detection Engine — visual grid */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <p className="text-[13px] font-medium text-[#d4a254] mb-2">Detection</p>
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Multiple layers, one score</h2>
        <p className="mt-2 text-[14px] text-[#666] max-w-[480px]">Every verification combines 20+ independent signals into a single risk score from 0 (human) to 100 (bot).</p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#1a1a1a]">
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
            <div key={title} className="bg-[#0a0a0a] p-5">
              <h3 className="text-[13px] font-medium text-[#ededed]">{title}</h3>
              <p className="mt-1 text-[12px] text-[#555] leading-[1.6]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Numbers */}
      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            ["~5 KB", "SDK gzipped"],
            ["20+", "detection signals"],
            ["168", "tests passing"],
            ["0", "browser deps"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[32px] font-bold tracking-tight text-[#d4a254]">{value}</p>
              <p className="text-[13px] text-[#555]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* CTA */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">Start protecting your forms.</h2>
        <p className="mt-2 text-[14px] text-[#666]">Deploy in minutes. No vendor lock-in. MIT licensed.</p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/docs/getting-started/quickstart" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium bg-[#d4a254] text-[#0a0a0a] hover:bg-[#c4933f] transition-colors">
            Read the docs
          </Link>
          <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="h-10 px-5 inline-flex items-center rounded-md text-[14px] font-medium border border-[#2a2a2a] text-[#888] hover:text-[#ededed] hover:border-[#444] transition-colors">
            GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6">
        <div className="mx-auto max-w-[1100px] px-6 flex items-center justify-between">
          <span className="text-[12px] text-[#444]">MIT License</span>
          <span className="text-[12px] text-[#444]">Janus</span>
        </div>
      </footer>
    </div>
  );
}
