import Link from 'next/link';

const features = [
  {
    title: 'Proof-of-Work',
    description: 'SHA-256 challenges solved in a Web Worker. Non-blocking, configurable difficulty, adaptive under attack.',
  },
  {
    title: 'Browser Fingerprinting',
    description: 'Canvas, WebGL, audio context, fonts, navigator — hashed with SHA-256. Never stored raw.',
  },
  {
    title: 'Behavioral Analysis',
    description: 'Mouse velocity, keyboard timing, scroll patterns, touch events. Aggregate scores, not raw data.',
  },
  {
    title: 'Automation Detection',
    description: 'Detects Selenium, Puppeteer, PhantomJS, CDP, headless browsers, and webdriver flags.',
  },
  {
    title: 'GeoIP Intelligence',
    description: 'Self-hosted MaxMind lookups. Detects datacenters, VPNs, proxies. GDPR-safe — only country code stored.',
  },
  {
    title: 'Plugin System',
    description: 'Extend risk scoring with custom logic. Global or per-site plugins. Built-in rate-abuse and time-of-day plugins.',
  },
];

const stats = [
  { label: 'SDK Size', value: '~5KB', detail: 'gzipped' },
  { label: 'Detection Signals', value: '20+', detail: 'independent signals' },
  { label: 'Tests', value: '168', detail: 'passing' },
  { label: 'External Dependencies', value: '0', detail: 'in browser SDK' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Janus</span>
          </div>
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Open source &middot; Self-hosted &middot; Privacy-first
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Bot detection
          <br />
          <span className="text-zinc-500">you own.</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          A self-hosted alternative to Cloudflare Turnstile and reCAPTCHA.
          No third-party scripts. No user tracking. No data leaving your servers.
          Deploy on your infrastructure and keep full control.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/docs/getting-started/quickstart"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/demo"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            Live Demo
          </Link>
        </div>

        {/* Install command */}
        <div className="mt-10 inline-flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5">
          <code className="text-sm text-zinc-300">
            <span className="text-zinc-500">$</span> docker compose up -d
          </code>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-800">
          {stats.map((stat) => (
            <div key={stat.label} className="px-6 py-8 text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{stat.detail}</p>
              <p className="mt-0.5 text-sm text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-2xl font-bold text-center mb-12">Why Janus</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-zinc-400 font-medium" />
                <th className="px-6 py-3 text-left text-zinc-400 font-medium">Turnstile / reCAPTCHA</th>
                <th className="px-6 py-3 text-left text-white font-medium">Janus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[
                ['Data', 'Sent to Cloudflare/Google', 'Stays on your servers'],
                ['Privacy', 'Third-party cookies, tracking', 'Zero tracking, no cookies'],
                ['Control', 'Black box scoring', 'Open source, tunable thresholds'],
                ['Availability', 'Depends on external service', 'Runs on your infra'],
                ['Cost', 'Free tier with limits', 'Free forever, self-hosted'],
                ['SDK Size', '50-200KB', '~5KB gzipped'],
              ].map(([label, them, us]) => (
                <tr key={label} className="hover:bg-zinc-900/30">
                  <td className="px-6 py-3 text-zinc-300 font-medium">{label}</td>
                  <td className="px-6 py-3 text-zinc-500">{them}</td>
                  <td className="px-6 py-3 text-emerald-400">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12">Detection Engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-700 transition-colors"
            >
              <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold">Ready to own your bot detection?</h2>
          <p className="mt-4 text-zinc-400">
            Deploy in minutes. Integrate in 3 lines of code. No vendor lock-in.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/docs/getting-started/quickstart"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 transition-colors"
            >
              Read the Docs
            </Link>
            <a
              href="https://github.com/elliot736/janus"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="text-xs text-zinc-600">MIT License</span>
          <span className="text-xs text-zinc-600">Built with Fumadocs</span>
        </div>
      </footer>
    </div>
  );
}
