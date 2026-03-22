import Link from 'next/link';

const features = [
  {
    icon: '01',
    title: 'Proof-of-Work',
    description: 'SHA-256 challenges solved in a Web Worker. Non-blocking, configurable difficulty, adaptive under attack.',
  },
  {
    icon: '02',
    title: 'Browser Fingerprinting',
    description: 'Canvas, WebGL, audio context, fonts, navigator — hashed with SHA-256. Never stored raw.',
  },
  {
    icon: '03',
    title: 'Behavioral Analysis',
    description: 'Mouse velocity, keyboard timing, scroll patterns, touch events. Aggregate scores, not raw data.',
  },
  {
    icon: '04',
    title: 'Automation Detection',
    description: 'Detects Selenium, Puppeteer, PhantomJS, CDP, headless browsers, and webdriver flags.',
  },
  {
    icon: '05',
    title: 'GeoIP Intelligence',
    description: 'Self-hosted MaxMind lookups. Detects datacenters, VPNs, proxies. GDPR-safe — only country code stored.',
  },
  {
    icon: '06',
    title: 'Plugin System',
    description: 'Extend risk scoring with custom logic. Global or per-site plugins with priority ordering.',
  },
];

const stats = [
  { value: '~5KB', label: 'SDK Size', detail: 'gzipped' },
  { value: '20+', label: 'Signals', detail: 'detection signals' },
  { value: '168', label: 'Tests', detail: 'passing' },
  { value: '0', label: 'Dependencies', detail: 'in browser SDK' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a254" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Janus</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/demo" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Demo
            </Link>
            <a
              href="https://github.com/elliot736/janus"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <Link
              href="/docs/getting-started/quickstart"
              className="hidden sm:inline-flex rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors"
              style={{ backgroundColor: '#d4a254', color: '#09090b' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative hero-gradient grid-pattern pt-32 pb-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs mb-8"
            style={{ border: '1px solid rgba(212, 162, 84, 0.3)', backgroundColor: 'rgba(212, 162, 84, 0.08)', color: '#d4a254' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#d4a254' }} />
            Open source &middot; Self-hosted &middot; Privacy-first
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-[1.1]">
            Bot detection
            <br />
            <span style={{ color: '#d4a254' }}>you own.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A self-hosted alternative to Cloudflare Turnstile and reCAPTCHA.
            No third-party scripts. No user tracking. No data leaving your servers.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/docs/getting-started/quickstart"
              className="rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: '#d4a254', color: '#09090b' }}
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              className="rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(212, 162, 84, 0.3)', color: '#d4a254' }}
            >
              Live Demo
            </Link>
          </div>

          {/* Install command */}
          <div
            className="mt-10 inline-flex items-center gap-3 rounded-lg px-5 py-3"
            style={{ border: '1px solid rgba(212, 162, 84, 0.15)', backgroundColor: 'rgba(212, 162, 84, 0.05)' }}
          >
            <code className="text-sm text-zinc-300">
              <span style={{ color: '#d4a254' }}>$</span> docker compose up -d
            </code>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid rgba(212, 162, 84, 0.1)', borderBottom: '1px solid rgba(212, 162, 84, 0.1)' }}>
        <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="px-6 py-10 text-center"
              style={i < 3 ? { borderRight: '1px solid rgba(212, 162, 84, 0.1)' } : {}}
            >
              <p className="text-4xl font-bold" style={{ color: '#d4a254' }}>{stat.value}</p>
              <p className="mt-1.5 text-sm text-zinc-400">{stat.label}</p>
              <p className="text-xs text-zinc-600">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <p className="text-center text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#d4a254' }}>Comparison</p>
        <h2 className="text-3xl font-bold text-center mb-12">Why Janus</h2>
        <div className="overflow-hidden rounded-xl accent-glow-sm" style={{ border: '1px solid rgba(212, 162, 84, 0.15)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(212, 162, 84, 0.1)', backgroundColor: 'rgba(212, 162, 84, 0.04)' }}>
                <th className="px-6 py-3.5 text-left text-zinc-500 font-medium" />
                <th className="px-6 py-3.5 text-left text-zinc-500 font-medium">Turnstile / reCAPTCHA</th>
                <th className="px-6 py-3.5 text-left font-medium" style={{ color: '#d4a254' }}>Janus</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Data', 'Sent to Cloudflare/Google', 'Stays on your servers'],
                ['Privacy', 'Third-party cookies, tracking', 'Zero tracking, no cookies'],
                ['Control', 'Black box scoring', 'Open source, tunable thresholds'],
                ['Availability', 'Depends on external service', 'Runs on your infra'],
                ['Cost', 'Free tier with limits', 'Free forever, self-hosted'],
                ['SDK Size', '50-200KB', '~5KB gzipped'],
              ].map(([label, them, us]) => (
                <tr key={label} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-6 py-3.5 text-zinc-300 font-medium">{label}</td>
                  <td className="px-6 py-3.5 text-zinc-500">{them}</td>
                  <td className="px-6 py-3.5" style={{ color: '#d4a254' }}>{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <p className="text-center text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#d4a254' }}>Features</p>
        <h2 className="text-3xl font-bold text-center mb-12">Detection Engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold mb-4"
                style={{ backgroundColor: 'rgba(212, 162, 84, 0.1)', color: '#d4a254', border: '1px solid rgba(212, 162, 84, 0.2)' }}
              >
                {feature.icon}
              </span>
              <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative hero-gradient" style={{ borderTop: '1px solid rgba(212, 162, 84, 0.1)' }}>
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-4xl font-bold">Ready to own your bot detection?</h2>
          <p className="mt-4 text-zinc-400 text-lg">
            Deploy in minutes. Integrate in 3 lines of code. No vendor lock-in.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/docs/getting-started/quickstart"
              className="rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: '#d4a254', color: '#09090b' }}
            >
              Read the Docs
            </Link>
            <a
              href="https://github.com/elliot736/janus"
              className="rounded-lg border border-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(212, 162, 84, 0.08)' }} className="py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a254" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs text-zinc-600">Janus &middot; MIT License</span>
          </div>
          <span className="text-xs text-zinc-700">Built with Fumadocs</span>
        </div>
      </footer>
    </div>
  );
}
