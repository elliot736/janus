import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a]">
        <div className="mx-auto max-w-[980px] flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a254" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span className="font-semibold text-[15px]">Janus</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">Docs</Link>
            <Link href="/demo" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">Demo</Link>
            <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#888] hover:text-[#ededed] transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero — just text, nothing fancy */}
      <section className="mx-auto max-w-[980px] px-6 pt-24 pb-16">
        <h1 className="text-[42px] font-bold leading-[1.15] tracking-[-0.02em] max-w-[600px]">
          Bot detection for people who read the source.
        </h1>
        <p className="mt-4 text-[17px] text-[#888] max-w-[520px] leading-[1.6]">
          Self-hosted alternative to Turnstile and reCAPTCHA. Proof-of-work challenges, browser fingerprinting, behavioral analysis. Your servers, your data, your rules.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/docs/getting-started/quickstart"
            className="h-9 px-4 inline-flex items-center rounded-md text-[13px] font-medium bg-[#d4a254] text-[#0a0a0a] hover:bg-[#c4933f] transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/demo"
            className="h-9 px-4 inline-flex items-center rounded-md text-[13px] font-medium border border-[#2a2a2a] text-[#888] hover:text-[#ededed] hover:border-[#444] transition-colors"
          >
            Live demo
          </Link>
        </div>
        <div className="mt-6">
          <code className="text-[13px] text-[#666] font-mono">$ docker compose up -d</code>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[#1a1a1a]" />

      {/* What you get — plain list, no cards */}
      <section className="mx-auto max-w-[980px] px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {[
            ['Proof-of-work challenges', 'SHA-256 solved in a Web Worker. Configurable difficulty that auto-scales under attack.'],
            ['Browser fingerprinting', 'Canvas, WebGL, audio, fonts, navigator. Hashed, never stored raw.'],
            ['Behavioral analysis', 'Mouse velocity, keyboard timing, scroll, touch. Scores, not raw events.'],
            ['Automation detection', 'Selenium, Puppeteer, PhantomJS, CDP, headless flags.'],
            ['GeoIP intelligence', 'Self-hosted MaxMind. Datacenter, VPN, proxy detection. GDPR-safe.'],
            ['Plugin system', 'Custom scoring logic. Global or per-site. Async-safe, error-isolated.'],
          ].map(([title, desc]) => (
            <div key={title}>
              <h3 className="text-[14px] font-medium text-[#ededed]">{title}</h3>
              <p className="mt-1 text-[13px] text-[#666] leading-[1.6]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Comparison — minimal table */}
      <section className="mx-auto max-w-[980px] px-6 py-16">
        <h2 className="text-[15px] font-medium mb-6">Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="pb-3 text-left text-[#666] font-normal w-[140px]" />
                <th className="pb-3 text-left text-[#666] font-normal">Turnstile / reCAPTCHA</th>
                <th className="pb-3 text-left font-normal text-[#d4a254]">Janus</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Data', 'Sent to Cloudflare / Google', 'Stays on your servers'],
                ['Privacy', 'Third-party cookies, tracking', 'No cookies, no tracking'],
                ['Scoring', 'Black box', 'Open source, tunable'],
                ['Infra', 'External dependency', 'Self-hosted'],
                ['SDK', '50–200 KB', '~5 KB gzipped'],
                ['Cost', 'Free tier with limits', 'Free forever'],
              ].map(([label, them, us]) => (
                <tr key={label} className="border-b border-[#1a1a1a]/60">
                  <td className="py-2.5 text-[#888]">{label}</td>
                  <td className="py-2.5 text-[#555]">{them}</td>
                  <td className="py-2.5 text-[#ededed]">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Numbers */}
      <section className="mx-auto max-w-[980px] px-6 py-16">
        <div className="flex flex-wrap gap-12">
          {[
            ['~5 KB', 'SDK size (gzipped)'],
            ['20+', 'detection signals'],
            ['168', 'tests passing'],
            ['0', 'browser dependencies'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[28px] font-bold tracking-tight text-[#d4a254]">{value}</p>
              <p className="text-[13px] text-[#666]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* Integration preview */}
      <section className="mx-auto max-w-[980px] px-6 py-16">
        <h2 className="text-[15px] font-medium mb-2">Integration</h2>
        <p className="text-[13px] text-[#666] mb-6">Three lines. React, Next.js, Express, or plain HTML.</p>
        <pre className="rounded-md border border-[#1a1a1a] bg-[#111] p-4 text-[13px] font-mono text-[#999] overflow-x-auto leading-relaxed"><code>{`import { janusVerify } from '@janus/express';

app.post('/login', janusVerify({
  secretKey: process.env.JANUS_SECRET_KEY,
  apiUrl: 'https://janus.example.com',
}), handler);`}</code></pre>
      </section>

      <div className="border-t border-[#1a1a1a]" />

      {/* CTA */}
      <section className="mx-auto max-w-[980px] px-6 py-16">
        <h2 className="text-[22px] font-bold">Start protecting your forms.</h2>
        <p className="mt-2 text-[15px] text-[#666]">Deploy in minutes. No vendor lock-in.</p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/docs/getting-started/quickstart" className="h-9 px-4 inline-flex items-center rounded-md text-[13px] font-medium bg-[#d4a254] text-[#0a0a0a] hover:bg-[#c4933f] transition-colors">
            Read the docs
          </Link>
          <a href="https://github.com/elliot736/janus" target="_blank" rel="noopener noreferrer" className="h-9 px-4 inline-flex items-center rounded-md text-[13px] font-medium border border-[#2a2a2a] text-[#888] hover:text-[#ededed] hover:border-[#444] transition-colors">
            GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6">
        <div className="mx-auto max-w-[980px] px-6 flex items-center justify-between">
          <span className="text-[12px] text-[#444]">MIT License</span>
          <span className="text-[12px] text-[#444]">Janus</span>
        </div>
      </footer>
    </div>
  );
}
