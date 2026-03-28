const { useMemo } = React;

function App() {
  const insights = useMemo(
    () => [
      {
        title: "Unified Discovery Layer",
        text: "Search, filter, and discover all campus events from one intelligent feed."
      },
      {
        title: "Live Registration Intelligence",
        text: "Instant seat visibility, waitlist movement, and reminder automation."
      },
      {
        title: "Complete Event Lifecycle",
        text: "From registration to QR tickets and certificates, every step is digital."
      }
    ],
    []
  );

  const visual = {
    src: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80",
    alt: "Students moving through a university campus"
  };

  const motto = "Connecting every learner to opportunities, events, and impact.";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(130deg,#070d20,#0f1c3a)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-24 top-12 h-72 w-72 rounded-full bg-[#3ec5ff2b] blur-3xl animate-glowPulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-20 bottom-16 h-80 w-80 rounded-full bg-[#27d1a63d] blur-3xl animate-floatSlow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 [background-image:linear-gradient(rgba(202,218,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(202,218,255,0.06)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <header className="relative z-10 mx-auto flex w-[calc(100%-1rem)] max-w-[1200px] items-center justify-between pt-4 md:w-[calc(100%-2rem)] md:pt-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[linear-gradient(145deg,#27d1a6,#97ffe6)] font-display text-base font-bold text-[#0d1b3b] shadow-[0_12px_24px_rgba(39,209,166,0.35)]">
            CC
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Campus Connect</p>
            <p className="text-xs text-[#a9bbde]">Event Management Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href="signin.html"
            className="rounded-xl border border-[#cdddff4d] bg-[#0d1b3a99] px-4 py-2 text-sm font-semibold text-[#d9e6ff] transition hover:-translate-y-0.5 hover:border-[#ffc34d88] hover:text-[#ffc34d]"
          >
            Sign in
          </a>
          <a
            href="signup.html"
            className="rounded-xl bg-[linear-gradient(135deg,#27d1a6,#34e5be)] px-4 py-2 text-sm font-semibold text-[#052a22] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Sign up
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto mt-8 grid w-[calc(100%-1rem)] max-w-[1200px] gap-9 pb-14 md:w-[calc(100%-2rem)] lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <section className="animate-fadeUp">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#71f3d5]">Campus Connect Insight</p>
          <h1 className="mt-4 max-w-[18ch] font-display text-4xl font-bold leading-[1.02] md:text-6xl">
            Campus events, redesigned as a premium digital experience.
          </h1>
          <p className="mt-5 max-w-[34ch] font-display text-2xl leading-tight text-[#e7f2ff] md:text-3xl">
            {motto}
          </p>

          <div className="mt-8 space-y-5">
            {insights.map((item, index) => (
              <article key={item.title} className="opacity-0 animate-riseSoft" style={{ animationDelay: `${130 * index}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#27d1a6] shadow-[0_0_12px_rgba(39,209,166,0.9)]" />
                  <div>
                    <h2 className="font-display text-xl font-semibold text-[#f6faff]">{item.title}</h2>
                    <p className="mt-1 max-w-[58ch] text-sm text-[#a9bbde] md:text-base">{item.text}</p>
                  </div>
                </div>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-[#8bb5ff44] via-[#8bb5ff1f] to-transparent" />
              </article>
            ))}
          </div>
        </section>

        <section className="relative min-h-[460px] animate-fadeUp">
          <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-[#ffc34d4a] blur-3xl animate-driftX" />
          <div className="pointer-events-none absolute -left-8 bottom-8 h-36 w-36 rounded-full bg-[#2de4ff36] blur-3xl animate-floatSlow" />

          <div className="absolute left-0 top-0 w-[80%] overflow-hidden rounded-[2.2rem] shadow-[0_24px_48px_rgba(6,10,24,0.55)]">
            <img src={visual.src} alt={visual.alt} className="h-[430px] w-full object-cover animate-zoomSlow" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060a17b8] to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8cf7df]">Build. Engage. Grow.</p>
              <p className="mt-1 font-display text-2xl leading-tight text-white">The modern campus event network</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
