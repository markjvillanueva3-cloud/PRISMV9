import { useState } from "react";
import { Link } from "react-router-dom";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

function IconCalculator() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/>
      <line x1="14" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/>
      <line x1="14" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/>
      <line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  );
}

function IconCode() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}

function IconPlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  );
}

function IconDollar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}

function IconBook() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  );
}

function IconLightbulb() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-7 w-7" aria-hidden="true">
      <line x1="9" y1="18" x2="15" y2="18"/>
      <line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ─── Feature Cards Data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <IconCalculator />,
    title: "Calculate",
    description:
      "Physics-backed speed & feed with Kienzle force models, stability lobes, and tool deflection.",
    accent: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
  },
  {
    icon: <IconCode />,
    title: "Generate",
    description:
      "Full CNC programs with 20 controller dialects, auto speed/feed, and motion dynamics.",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
  },
  {
    icon: <IconPlay />,
    title: "Simulate",
    description:
      "Vericut-class swept volume simulation with force, thermal, and deflection analysis.",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  {
    icon: <IconDollar />,
    title: "Quote",
    description:
      "Instant job costing with cycle time, tooling, material, and secondary ops.",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  {
    icon: <IconBook />,
    title: "Troubleshoot",
    description:
      "296-rule machining playbook with ISO-group tips and tribal knowledge from 18 CAM systems.",
    accent: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  {
    icon: <IconLightbulb />,
    title: "Learn",
    description:
      "Interactive learning paths, material wizards, and digital twin exploration.",
    accent: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  },
] as const;

// ─── Pricing Data ─────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try the platform with no commitment.",
    features: [
      "10 speed/feed calculations/day",
      "Basic material database",
      "100 tools from catalog",
      "Community support",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For individual machinists and students.",
    features: [
      "Unlimited calculations",
      "2,957 material database",
      "10,000 tools from catalog",
      "Basic post-processor (5 dialects)",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    description: "For professional programmers and job shops.",
    features: [
      "Everything in Starter",
      "94,000+ tool catalog",
      "20 controller dialects",
      "CNC program generation",
      "Tool CSV import",
      "Simulation engine",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Shop",
    price: "$199",
    period: "/mo",
    description: "For teams and production environments.",
    features: [
      "Everything in Pro",
      "Custom material databases",
      "ERP integration module",
      "Quoting & job scheduling",
      "5 seats included",
      "Phone support",
    ],
    cta: "Contact Sales",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "$499",
    period: "/mo",
    description: "For large manufacturers and OEMs.",
    features: [
      "Everything in Shop",
      "Full REST API access",
      "Unlimited seats",
      "On-prem deployment option",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    href: "/login",
    highlighted: false,
  },
] as const;

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is there a free tier?",
    a: "Yes — 10 speed/feed calculations per day, basic material database, and 100 tools from our catalog.",
  },
  {
    q: "What post-processors are available?",
    a: "20 controller dialects including Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma, and more.",
  },
  {
    q: "Can I import my own tools?",
    a: "Pro and above can import tools via CSV. Shop and Enterprise get custom material databases.",
  },
  {
    q: "Is there an API?",
    a: "Enterprise tier includes full REST API access for integration with your existing systems.",
  },
  {
    q: "How accurate are the calculations?",
    a: "All calculations use peer-reviewed physics models: Kienzle cutting forces, Taylor tool life, Johnson-Cook constitutive models, and Monte Carlo uncertainty quantification.",
  },
] as const;

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-700 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left
          text-base font-medium text-slate-100 hover:text-white transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <span>{q}</span>
        <IconChevronDown open={open} />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-slate-400">{a}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const handleScrollToPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80
        bg-slate-900/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between
          px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-blue-400">
              PRISM
            </span>
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
              Manufacturing Intelligence
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
            <a
              href="#pricing"
              onClick={handleScrollToPricing}
              className="text-sm text-slate-400 hover:text-slate-100 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                rounded px-2 py-1"
            >
              Pricing
            </a>
            <Link
              to="/login"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold
                text-white shadow hover:bg-blue-500 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Log In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex min-h-[calc(100vh-57px)] items-center justify-center
          overflow-hidden bg-gradient-to-b from-slate-900 via-blue-900/60 to-slate-900
          px-4 py-24 sm:px-6 lg:px-8"
      >
        {/* Subtle dot-grid background (pure CSS, no JS) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px]
            -translate-x-1/2 -translate-y-1/2 rounded-full
            bg-blue-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-1/4 bottom-1/4 h-64 w-64
            rounded-full bg-violet-600/15 blur-2xl"
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full
            border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs
            font-semibold uppercase tracking-widest text-blue-400">
            PRISM v9 — Now Available
          </div>

          <h1
            id="hero-heading"
            className="text-4xl font-black leading-tight tracking-tight
              text-white sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            The World&rsquo;s Smartest
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400
              bg-clip-text text-transparent">
              Speed &amp; Feed Calculator
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed
            text-slate-300 sm:text-lg">
            Physics-backed cutting parameters, instant quoting, and CNC program
            generation — powered by{" "}
            <strong className="text-slate-100">2,957 materials</strong>,{" "}
            <strong className="text-slate-100">94,000+ tools</strong>, and{" "}
            <strong className="text-slate-100">910 machines</strong>.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold
                text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500
                transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-400 focus-visible:ring-offset-2
                focus-visible:ring-offset-slate-900"
            >
              Try Free
            </Link>
            <a
              href="#pricing"
              onClick={handleScrollToPricing}
              className="rounded-lg border border-slate-600 px-8 py-3.5 text-base
                font-semibold text-slate-200 hover:border-slate-400 hover:text-white
                transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-slate-400 focus-visible:ring-offset-2
                focus-visible:ring-offset-slate-900"
            >
              See Pricing
            </a>
          </div>

          {/* Social proof micro-row */}
          <p className="mt-8 text-xs text-slate-500">
            Trusted by machinists, programmers, and job shops worldwide.
          </p>
        </div>
      </section>

      {/* ── Feature Grid ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="features-heading"
        className="bg-slate-900 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2
              id="features-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Everything your shop needs
            </h2>
            <p className="mt-3 text-slate-400">
              One platform from raw stock to finished part.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className={`group rounded-xl border ${f.border} ${f.bg}
                  p-6 transition-all duration-200
                  hover:border-opacity-60 hover:shadow-lg hover:shadow-black/30`}
              >
                <div className={`mb-4 ${f.accent}`}>{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div
        aria-label="Platform statistics"
        className="border-y border-slate-800 bg-slate-950 px-4 py-8 sm:px-6 lg:px-8"
      >
        <ul
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-center
            gap-x-8 gap-y-4 text-sm font-semibold text-slate-300"
          role="list"
        >
          {[
            "2,957 Materials",
            "94,000+ Tools",
            "910 Machines",
            "20 Controller Dialects",
            "296 Playbook Rules",
          ].map((stat, i) => (
            <li key={stat} className="flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden="true" className="hidden text-slate-700 sm:block">•</span>
              )}
              <span className="text-white">{stat.split(" ")[0]}</span>
              <span className="text-slate-400">{stat.split(" ").slice(1).join(" ")}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="bg-slate-900 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2
              id="pricing-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-slate-400">
              Start free. Scale as your shop grows.
            </p>
          </div>

          {/* Tier grid — 2-col on md, 3-col on lg, 5 cards total */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border p-6 transition-shadow
                  ${
                    tier.highlighted
                      ? "border-blue-500 bg-blue-600/10 shadow-xl shadow-blue-900/30 ring-1 ring-blue-500/50"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs
                      font-bold uppercase tracking-widest text-white shadow">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-base font-bold text-white">{tier.name}</h3>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-3xl font-black text-white">{tier.price}</span>
                    {tier.period && (
                      <span className="text-sm text-slate-400">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {tier.description}
                  </p>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5" role="list">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="mt-0.5 text-emerald-400">
                        <IconCheck />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.href}
                  className={`mt-auto block rounded-lg px-4 py-2.5 text-center text-sm
                    font-semibold transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-offset-2
                    focus-visible:ring-offset-slate-900
                    ${
                      tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-400"
                        : "border border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white focus-visible:ring-slate-500"
                    }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="faq-heading"
        className="border-t border-slate-800 bg-slate-950 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="faq-heading"
            className="mb-10 text-center text-3xl font-bold tracking-tight text-white"
          >
            Frequently asked questions
          </h2>
          <div className="divide-y divide-slate-700 rounded-xl border border-slate-700
            bg-slate-900/60 px-6">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ──────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        className="border-t border-slate-800 bg-gradient-to-r from-blue-900/40
          via-slate-900 to-blue-900/40 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="cta-heading"
            className="text-2xl font-bold text-white sm:text-3xl"
          >
            Ready to cut smarter?
          </h2>
          <p className="mt-3 text-slate-400">
            Join thousands of machinists using physics-backed parameters to
            extend tool life and maximize throughput.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block rounded-lg bg-blue-600 px-10 py-3.5
              text-base font-semibold text-white shadow-lg shadow-blue-900/50
              hover:bg-blue-500 transition-colors focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
              focus-visible:ring-offset-slate-900"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-10
        sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-slate-500">
              PRISM Manufacturing Intelligence &mdash; &copy; 2026
            </p>
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <a
                href="#pricing"
                onClick={handleScrollToPricing}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                Pricing
              </a>
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                Login
              </Link>
              <a
                href="#"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                Documentation
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
