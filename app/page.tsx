export default function Home() {
  const features = [
    {
      title: "Inventory Tracking",
      description:
        "Catalog every firearm with make, model, serial number, and photos.",
      icon: (
        <path
          d="M4 7h16M4 12h16M4 17h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ),
    },
    {
      title: "Access Logs",
      description:
        "Record who opened the safe, when, and why — full accountability.",
      icon: (
        <path
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      title: "Compliance Ready",
      description:
        "Export records for insurance, estate planning, or regulatory needs.",
      icon: (
        <path
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              className="flex-shrink-0"
              aria-label="GunSafe logo"
            >
              <rect
                width="36"
                height="36"
                rx="8"
                fill="#141a24"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <rect
                x="8"
                y="10"
                width="20"
                height="16"
                rx="2"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              <circle cx="24" cy="18" r="2.5" fill="#60a5fa" />
              <path
                d="M8 26h20"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <div>
              <div className="font-semibold text-2xl tracking-tighter">
                GunSafe
              </div>
              <div className="text-[10px] text-blue-400 -mt-1 tracking-widest uppercase">
                Secure Inventory
              </div>
            </div>
          </div>
          <div className="text-xs px-3 py-1 bg-[var(--card)] rounded-full border border-[var(--border)]">
            Coming Soon
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <p className="text-sm text-blue-400 font-medium tracking-widest uppercase mb-4">
              Know what&apos;s in your safe
            </p>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter leading-[1.05] mb-6">
              Secure firearm inventory, simplified.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10">
              GunSafe helps responsible owners track firearms, log safe access,
              and keep compliance-ready records — all in one private dashboard.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-2xl transition"
              >
                Get Early Access
              </button>
              <button
                type="button"
                className="px-6 py-3 border border-[var(--border)] hover:bg-[var(--card)] rounded-2xl transition"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-5">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">{feature.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-500">
          GunSafe — responsible ownership starts with knowing what you have.
        </div>
      </footer>
    </div>
  );
}