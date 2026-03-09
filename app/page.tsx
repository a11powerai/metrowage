import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-lg">M</div>
          <span className="text-xl font-semibold tracking-tight">MetroWage</span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-medium"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Version 2.0 — Roles, Permissions &amp; Multi-Location
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Smart Factory{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Workforce
          </span>{" "}
          &amp; Payroll Management
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
          Track attendance, manage production, run payroll with auto overtime, and
          control access with customizable roles — all in one platform built for
          multi-location factory operations.
        </p>
        <div className="flex items-center gap-4 mt-10">
          <Link
            href="/login"
            className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all duration-200 font-semibold shadow-lg shadow-blue-700/40 hover:shadow-blue-600/50 hover:-translate-y-0.5"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="px-7 py-3 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200 font-semibold"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto px-6 pb-20">
        {[
          { label: "Multi-Location", value: "Yes" },
          { label: "Auto OT Calc", value: "Yes" },
          { label: "Custom Roles", value: "Yes" },
          { label: "Report Exports", value: "PDF + XLS" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 border border-white/10 rounded-xl p-5 text-center"
          >
            <div className="text-2xl font-bold text-blue-400">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-28">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "👷",
              title: "Worker Management",
              desc: "Manage workers across multiple locations with salary profiles, duty hours, and geo check-in support.",
            },
            {
              icon: "🕐",
              title: "Attendance & Time Tracking",
              desc: "Daily check-in/out with biometric machine integration, auto hours calculation, and admin edit controls.",
            },
            {
              icon: "📋",
              title: "Production Tracking",
              desc: "Fast daily entry with automatic slab matching, no-pay flagging, duplicate prevention, and day locking.",
            },
            {
              icon: "💰",
              title: "Payroll & Auto OT",
              desc: "Full payroll with basic salary, allowances, deductions, commissions, assembly earnings, and automatic overtime calculation.",
            },
            {
              icon: "🔐",
              title: "Roles & Permissions",
              desc: "Customizable roles with granular permission control. Admins toggle exactly which features each role can access.",
            },
            {
              icon: "📍",
              title: "Location-Based Privacy",
              desc: "Managers only see their own location's workers and salary data. No cross-location salary visibility.",
            },
            {
              icon: "📊",
              title: "Rich Reports & Exports",
              desc: "Daily, weekly, monthly, and yearly reports with attendance summaries. One-click Excel and PDF exports.",
            },
            {
              icon: "⚙️",
              title: "Shift Configuration",
              desc: "Configure standard shift hours per location. System auto-calculates overtime for hours exceeding the standard.",
            },
            {
              icon: "🤖",
              title: "AI Assistant",
              desc: "Built-in AI assistant to help with queries, generate insights, and streamline factory management tasks.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-blue-500/40 transition-all duration-200"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} MetroWage. Built for factory floor efficiency.
      </footer>
    </main>
  );
}
