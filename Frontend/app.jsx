import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";

const runtimeHost = window.location.hostname || "localhost";
const API_HOST = runtimeHost === "0.0.0.0" ? "localhost" : runtimeHost;
const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${API_HOST}:4000/api`;
const TOKEN_KEY = "cc_token";
const USER_KEY = "cc_user";
const EXTRA_PROFILE_KEY = "cc_profile_extra";
const SIGNUP_DRAFT_KEY = "cc_signup_draft";
const THEME_STUDENT_KEY = "cc_student_theme";
const THEME_ORG_KEY = "cc_org_theme";

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizeUser(rawUser) {
  const safe = rawUser || {};
  const fullName = String(
    safe.fullName || `${safe.firstName || ""} ${safe.lastName || ""}`.trim() || safe.username || safe.email || "Campus User"
  ).trim();
  const role = String(safe.role || safe.accountType || "student").toLowerCase();

  return {
    id: safe.id ?? safe.userId ?? null,
    fullName,
    firstName: safe.firstName || fullName.split(" ")[0] || "",
    lastName: safe.lastName || fullName.split(" ").slice(1).join(" ") || "",
    username: safe.username || "",
    email: safe.email || "",
    role,
    phoneNumber: safe.phoneNumber || safe.phone || ""
  };
}

function getStoredUser() {
  try {
    return normalizeUser(JSON.parse(localStorage.getItem(USER_KEY) || "{}"));
  } catch (_error) {
    return normalizeUser({});
  }
}

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token || "");
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getTheme(themeKey) {
  return localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
}

function getSignupDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNUP_DRAFT_KEY) || "{}");
    return {
      role: String(saved.role || "").toLowerCase(),
      fullName: String(saved.fullName || ""),
      phoneNumber: String(saved.phoneNumber || ""),
      department: String(saved.department || ""),
      programOrUnit: String(saved.programOrUnit || ""),
      yearOrDesignation: String(saved.yearOrDesignation || ""),
      email: String(saved.email || ""),
      password: String(saved.password || ""),
      confirmPassword: String(saved.confirmPassword || "")
    };
  } catch (_error) {
    return {
      role: "",
      fullName: "",
      phoneNumber: "",
      department: "",
      programOrUnit: "",
      yearOrDesignation: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
  }
}

function clearSignupDraft() {
  localStorage.removeItem(SIGNUP_DRAFT_KEY);
}

function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "User", lastName: "User" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "User"
  };
}

function buildUsername(email) {
  const localPart = String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (localPart.length >= 4) {
    return localPart.slice(0, 16);
  }

  const fallback = `cc_${Date.now().toString().slice(-8)}`;
  return fallback.slice(0, 16);
}

function getFallbackEventImage() {
  return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80";
}

function formatDateTime(dateValue, timeValue) {
  if (!dateValue) return { dateLabel: "TBA", timeLabel: "TBA", longLabel: "TBA" };
  const merged = `${dateValue}T${timeValue || "00:00"}`;
  const parsed = new Date(merged);
  if (Number.isNaN(parsed.getTime())) {
    return { dateLabel: dateValue, timeLabel: timeValue || "TBA", longLabel: `${dateValue} ${timeValue || ""}`.trim() };
  }

  return {
    dateLabel: parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    timeLabel: parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    longLabel: parsed.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
  };
}

function IconCalendar() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M3 10h18" /></svg>; }
function IconClock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>; }
function IconPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function IconSearch() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>; }
function IconGrid() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>; }
function IconList() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>; }
function IconPlus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>; }
function IconLogout() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></svg>; }
function IconSun() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>; }
function IconMoon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>; }

function PublicOnly({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return children;
  const role = getStoredUser().role;
  return <Navigate to={role === "organizer" ? "/organizer" : "/dashboard"} replace />;
}

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = getStoredUser();
  if (!token) return <Navigate to="/signin" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "organizer" ? "/organizer" : "/dashboard"} replace />;
  return children;
}

function AppShell({ children, className = "", isDark = false }) {
  return (
    <div className={cx(
      isDark && "dark",
      "relative min-h-screen overflow-x-hidden transition-colors duration-300",
      "bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-gray-100",
      className
    )}>
      <div aria-hidden="true" className={cx(
        "pointer-events-none fixed inset-0 [background-size:42px_42px]",
        isDark
          ? "[background-image:linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)]"
          : "[background-image:linear-gradient(rgba(107,130,160,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(107,130,160,0.08)_1px,transparent_1px)]"
      )} />
      {children}
    </div>
  );
}

function Navbar({ title, subtitle, theme, onToggleTheme, rightSlot }) {
  const location = window.location.pathname;
  const links = [];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-3">
          <img src="/campus-connect-logo.svg" alt="Campus Connect" className="h-12 w-auto md:h-14" />
          <div className="hidden md:block">
            <p className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
        </Link>

        {links.length > 0 ? (
          <nav className="hidden items-center gap-1 rounded-full bg-white/90 p-1 text-sm font-semibold text-[#314860] ring-1 ring-[#dce6f0] lg:flex">
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cx(
                  "rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]",
                  location === item.to && "bg-[#ecf7f5] text-[#0e8f84]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {onToggleTheme ? (
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 text-sm font-semibold text-gray-800 transition-all duration-200 hover:scale-105 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          ) : null}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

function FormField({ label, className = "", ...props }) {
  return (
    <label className={cx("block text-sm font-medium text-gray-800 dark:text-gray-200", className)}>
      <span>{label}</span>
      <input
        {...props}
        className={cx(
          "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-500"
        )}
      />
    </label>
  );
}

function SelectField({ label, children, className = "", ...props }) {
  return (
    <label className={cx("block text-sm font-medium text-gray-800 dark:text-gray-200", className)}>
      <span>{label}</span>
      <select
        {...props}
        className={cx(
          "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100"
        )}
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({ label, className = "", ...props }) {
  return (
    <label className={cx("block text-sm font-medium text-gray-800 dark:text-gray-200", className)}>
      <span>{label}</span>
      <textarea
        {...props}
        className={cx(
          "mt-2 min-h-[120px] w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-500"
        )}
      />
    </label>
  );
}

function StatCard({ label, value, tone = "blue" }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-4 text-gray-900 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:shadow-lg dark:hover:shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </article>
  );
}

function EventCard({ event, compact = false, registered = false, actionLabel, onAction, actionHref, dark = false }) {
  const image = event.posterImage || event.image || getFallbackEventImage();
  const when = formatDateTime(event.date, event.time);
  const isActionDisabled = registered || (!actionHref && !onAction);

  return (
    <article className={cx(
      "group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg dark:hover:shadow-xl",
      compact ? "flex flex-col" : ""
    )}>
      <div className={cx("relative overflow-hidden", compact ? "h-40" : "h-52") }>
        <img src={image} alt={event.title || "Event poster"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,29,0.1),rgba(10,15,29,0.62))]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-xs font-semibold text-white">
          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-white backdrop-blur dark:bg-slate-950/80 dark:text-white">{event.eventType || "Event"}</span>
          <span className={cx("rounded-full px-3 py-1 text-white backdrop-blur", registered ? "bg-emerald-500 dark:bg-emerald-500" : "bg-white/20 dark:bg-slate-700/80")}>{registered ? "Registered" : (event.status || "Open")}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-display text-xl font-semibold text-gray-900 dark:text-white">{event.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{event.description}</p>
        </div>

        <div className="grid gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-slate-700"><IconCalendar />{when.dateLabel}</div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-slate-700"><IconClock />{when.timeLabel}</div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-slate-700 sm:col-span-2"><IconPin />{event.location || "Campus venue"}</div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{event.department || "General"}</span>
            {event.registrationsCount !== undefined ? <span className="ml-2">• {event.registrationsCount} registrations</span> : null}
          </div>
          {actionLabel ? (
            isActionDisabled ? (
              <button type="button" disabled className="inline-flex rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 transition-all duration-200 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-gray-200">
                {actionLabel}
              </button>
            ) : actionHref ? (
              <Link to={actionHref} className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600">
                {actionLabel}
              </Link>
            ) : (
              <button type="button" onClick={onAction} className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600">
                {actionLabel}
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}

function LandingRedirect() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return <Navigate to="/signin" replace />;
  return <Navigate to={getStoredUser().role === "organizer" ? "/organizer" : "/dashboard"} replace />;
}

function SigninPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "idle" });
  const [isBusy, setIsBusy] = useState(false);

  function handleInput(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (!formData.password.trim()) {
      setMessage({ text: "Password is required.", type: "error" });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await api.post("/auth/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      saveAuth(response.data.token, response.data.user);
      setMessage({ text: "Signed in successfully. Redirecting...", type: "success" });
      const role = getStoredUser().role;
      navigate(role === "organizer" ? "/organizer" : "/dashboard", { replace: true });
    } catch (error) {
      setMessage({ text: error?.response?.data?.message || "Could not sign in.", type: "error" });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen p-3 md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1100px] overflow-hidden rounded-[2rem] border border-[#cfdeeb] shadow-[0_22px_52px_rgba(26,49,74,0.12)] lg:grid-cols-2">
          <section className="relative overflow-hidden">
            <img src="/signup-hero.svg" alt="Students walking on a university campus" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,24,0.1),rgba(7,11,24,0.78))]" />
            <div className="absolute left-0 right-0 top-0 flex min-h-[92px] items-center overflow-hidden bg-[#5fd8cf] px-6 py-2 shadow-[0_7px_0_0_#5fd8cf] md:min-h-[110px] md:px-10 md:shadow-[0_9px_0_0_#5fd8cf] animate-fadeUp">
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(135deg, transparent 0 46%, rgba(255,255,255,0.14) 46% 48%, transparent 48% 100%)", backgroundSize: "56px 56px, 120px 120px", backgroundPosition: "0 0, 0 0" }} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_24%)]" />
              <img src="/campus-connect-logo.svg" alt="Campus Connect" className="relative z-10 h-auto w-full max-w-[255px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)] md:max-w-[330px]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 animate-fadeUp">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8df9e3]">Welcome Back</p>
              <h1 className="mt-2 max-w-[15ch] font-display text-4xl leading-tight text-white md:text-5xl">Continue your campus event journey.</h1>
              <p className="mt-4 max-w-[50ch] text-sm text-[#d6e6ff] md:text-base">Access your dashboard, track registrations, and stay connected to campus opportunities.</p>
            </div>
          </section>

          <section className="flex items-center bg-[linear-gradient(180deg,#ffffff,#f5faff)] p-5 md:p-8">
            <div className="w-full animate-fadeUp">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="font-display text-xl font-semibold text-[#1a2a3d]">Sign in</p>
                  <p className="text-sm text-[#5f748a]">Access your account</p>
                </div>
                <Link to="/" className="text-sm text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Home</Link>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <FormField label="Official email" type="email" name="email" value={formData.email} onChange={handleInput} placeholder="you@university.edu" autoComplete="email" />
                <FormField label="Password" type="password" name="password" value={formData.password} onChange={handleInput} placeholder="Enter your password" autoComplete="current-password" className="mt-3" />

                <button type="submit" disabled={isBusy} className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">
                  {isBusy ? "Signing in..." : "Sign In"}
                </button>

                <p className={cx("mt-3 min-h-[1.25rem] text-sm", message.type === "error" ? "text-[#d64a5e]" : message.type === "success" ? "text-[#16a084]" : "text-[#5f748a]")}>{message.text}</p>

                <p className="mt-2 text-sm text-[#5f748a]">
                  New here? <Link to="/signup" className="text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Create account</Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "idle" });
  const [formData, setFormData] = useState(() => getSignupDraft());

  useEffect(() => {
    localStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  function handleInput(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      const role = String(formData.role || "").trim().toLowerCase();
      if (!role) return "Please choose Student or Organizer to continue.";
      if (!["student", "organizer"].includes(role)) return "Please choose Student or Organizer to continue.";
    }
    if (currentStep === 2) {
      if (!formData.fullName.trim()) return "Please enter your full name.";
      if (!/^\+?\d{10,15}$/.test(formData.phoneNumber.trim())) return "Phone number must include country code and at least 10 digits.";
      if (!formData.department.trim()) return "Please select or enter your department.";
      const role = String(formData.role || "").trim().toLowerCase();
      if (!formData.programOrUnit.trim()) return role === "organizer" ? "Please enter your organizing unit." : "Please enter your program name.";
      if (!formData.yearOrDesignation.trim()) return role === "organizer" ? "Please enter your designation." : "Please enter your year.";
    }
    if (currentStep === 3) {
      const role = String(formData.role || "").trim().toLowerCase();
      if (!role || !["student", "organizer"].includes(role)) {
        return "Account type must be Student or Organizer.";
      }
      if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return "Please use a valid official email address.";
      if (formData.password.length < 8) return "Password must be at least 8 characters.";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match.";
    }
    return "";
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setMessage({ text: error, type: "error" });
      return;
    }
    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.min(3, prev + 1));
  }

  function goBack() {
    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const error = validateStep(3);
    if (error) {
      setMessage({ text: error, type: "error" });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const role = String(formData.role || "").trim().toLowerCase();
      const accountType = role === "organizer" ? "Organizer" : "Student";
      const { firstName, lastName } = splitFullName(formData.fullName);
      const username = buildUsername(formData.email);
      const regNo = String(formData.phoneNumber || "").replace(/\D/g, "") || username;

      const payload = {
        fullName: formData.fullName.trim(),
        firstName,
        lastName,
        regNo,
        department: formData.department.trim(),
        programOrUnit: formData.programOrUnit.trim(),
        yearOrDesignation: formData.yearOrDesignation.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role,
        accountType,
        userType: accountType,
        username,
        phoneNumber: formData.phoneNumber.trim()
      };

      const response = await api.post("/auth/register", payload);

      const profileExtras = {
        phoneNumber: formData.phoneNumber.trim(),
        department: formData.department.trim(),
        programOrUnit: formData.programOrUnit.trim(),
        yearOrDesignation: formData.yearOrDesignation.trim()
      };

      saveAuth(response.data.token, response.data.user);
      localStorage.setItem(EXTRA_PROFILE_KEY, JSON.stringify(profileExtras));
      clearSignupDraft();
      setMessage({ text: "Signup completed successfully. Redirecting...", type: "success" });
      navigate(role === "organizer" ? "/organizer" : "/dashboard", { replace: true });
    } catch (error) {
      setMessage({ text: error?.response?.data?.message || "Could not complete signup.", type: "error" });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen p-3 md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1200px] overflow-hidden rounded-[2rem] border border-[#cfdeeb] shadow-[0_22px_52px_rgba(26,49,74,0.12)] lg:grid-cols-2">
          <section className="relative overflow-hidden">
            <img src="/signup-hero.svg" alt="Students walking on a university campus" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,24,0.1),rgba(7,11,24,0.78))]" />
            <div className="absolute left-0 right-0 top-0 flex min-h-[92px] items-center overflow-hidden bg-[#5fd8cf] px-6 py-2 shadow-[0_7px_0_0_#5fd8cf] md:min-h-[110px] md:px-10 md:shadow-[0_9px_0_0_#5fd8cf] animate-fadeUp">
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(135deg, transparent 0 46%, rgba(255,255,255,0.14) 46% 48%, transparent 48% 100%)", backgroundSize: "56px 56px, 120px 120px" }} />
              <img src="/campus-connect-logo.svg" alt="Campus Connect" className="relative z-10 h-auto w-full max-w-[330px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 animate-fadeUp">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8df9e3]">Create your account</p>
              <h1 className="mt-2 max-w-[16ch] font-display text-4xl leading-tight text-white md:text-5xl">Build your place in the campus community.</h1>
              <p className="mt-4 max-w-[50ch] text-sm text-[#d6e6ff] md:text-base">A single account for discovering events, managing registrations, and keeping profile details in one place.</p>
            </div>
          </section>

          <section className="flex items-center bg-[linear-gradient(180deg,#ffffff,#f5faff)] p-5 md:p-8">
            <div className="w-full animate-fadeUp">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold text-[#1a2a3d]">Sign up</p>
                  <p className="text-sm text-[#5f748a]">Create a new Campus Connect account</p>
                </div>
                <Link to="/signin" className="text-sm text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Have an account?</Link>
              </div>

              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f748a]">
                <span className={cx("rounded-full px-3 py-1", step >= 1 ? "bg-[#0ea596] text-white" : "bg-[#e8f2ff]")}>1. Role</span>
                <span className={cx("rounded-full px-3 py-1", step >= 2 ? "bg-[#0ea596] text-white" : "bg-[#e8f2ff]")}>2. Details</span>
                <span className={cx("rounded-full px-3 py-1", step >= 3 ? "bg-[#0ea596] text-white" : "bg-[#e8f2ff]")}>3. Security</span>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {step === 1 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "student", title: "Student", text: "Discover events and register quickly." },
                      { value: "organizer", title: "Organizer", text: "Create events and manage registrations." }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, role: option.value }))}
                        className={cx(
                          "rounded-2xl border p-5 text-left transition hover:-translate-y-0.5",
                          String(formData.role || "").toLowerCase() === option.value ? "border-[#0ea596] bg-[#effcf8] shadow-[0_10px_24px_rgba(14,165,150,0.16)]" : "border-[#d2dfeb] bg-white"
                        )}
                      >
                        <p className="font-display text-xl font-semibold text-[#1f3147]">{option.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[#5f748a]">{option.text}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="Full name" name="fullName" value={formData.fullName} onChange={handleInput} placeholder="Your full name" autoComplete="name" />
                    <FormField label="Phone number" name="phoneNumber" value={formData.phoneNumber} onChange={handleInput} placeholder="+911234567890" autoComplete="tel" />
                    <FormField label={String(formData.role || "").toLowerCase() === "organizer" ? "Organizing unit" : "Program name"} name="programOrUnit" value={formData.programOrUnit} onChange={handleInput} placeholder={String(formData.role || "").toLowerCase() === "organizer" ? "Department / club / unit" : "e.g. BCA, MBA, CSE"} />
                    <FormField label={String(formData.role || "").toLowerCase() === "organizer" ? "Designation" : "Year / Section"} name="yearOrDesignation" value={formData.yearOrDesignation} onChange={handleInput} placeholder={String(formData.role || "").toLowerCase() === "organizer" ? "Event coordinator" : "e.g. 2nd Year"} />
                    <FormField label="Department" name="department" value={formData.department} onChange={handleInput} placeholder="e.g. Computer Science & Engineering" className="md:col-span-2" />
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="Official email" type="email" name="email" value={formData.email} onChange={handleInput} placeholder="you@university.edu" autoComplete="email" className="md:col-span-2" />
                    <FormField label="Password" type="password" name="password" value={formData.password} onChange={handleInput} placeholder="Create a strong password" autoComplete="new-password" />
                    <FormField label="Confirm password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInput} placeholder="Repeat your password" autoComplete="new-password" />
                  </div>
                ) : null}

                <p className={cx("min-h-[1.25rem] text-sm", message.type === "error" ? "text-[#d64a5e]" : message.type === "success" ? "text-[#16a084]" : "text-[#5f748a]")}>{message.text}</p>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button type="button" onClick={goBack} disabled={step === 1} className="rounded-xl border border-[#c8d5e3] bg-white px-5 py-3 text-sm font-semibold text-[#1f3147] transition hover:border-[#0ea59680] hover:text-[#0e8f84] disabled:cursor-not-allowed disabled:opacity-50">Back</button>
                  {step < 3 ? (
                    <button type="button" onClick={goNext} className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105">Continue</button>
                  ) : (
                    <button type="submit" disabled={isBusy} className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">{isBusy ? "Creating account..." : "Create account"}</button>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [theme, setTheme] = useState(() => getTheme(THEME_STUDENT_KEY));
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [eventType, setEventType] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(THEME_STUDENT_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [eventsRes, mineRes] = await Promise.all([
          api.get("/events", { params: { department: department !== "All" ? department : undefined, eventType: eventType !== "All" ? eventType : undefined, search: searchQuery || undefined } }),
          api.get("/users/events")
        ]);

        if (!mounted) return;
        setEvents(Array.isArray(eventsRes.data.events) ? eventsRes.data.events : []);
        setMyEvents(Array.isArray(mineRes.data.events) ? mineRes.data.events : []);
      } catch (error) {
        if (mounted) {
          setMessage(error?.response?.data?.message || "Could not load dashboard data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [department, eventType, searchQuery]);

  const registeredIds = useMemo(() => new Set(myEvents.map((item) => String(item.eventId || item.id))), [myEvents]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = [...events].filter((event) => {
      if (!query) return true;
      return [event.title, event.description, event.eventType, event.location].some((value) => String(value || "").toLowerCase().includes(query));
    });

    list.sort((a, b) => {
      const aDate = new Date(`${a.date}T${a.time || "00:00"}`);
      const bDate = new Date(`${b.date}T${b.time || "00:00"}`);
      return sortBy === "upcoming" ? aDate - bDate : bDate - aDate;
    });

    return list;
  }, [events, searchQuery, sortBy]);

  function handleLogout() {
    clearAuth();
    navigate("/signin", { replace: true });
  }

  return (
    <AppShell isDark={theme === "dark"}>
      <Navbar
        title="Student Dashboard"
        subtitle={user.fullName || "Campus Connect"}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          try { localStorage.setItem(THEME_STUDENT_KEY, next); } catch (e) {}
          window.dispatchEvent(new CustomEvent("cc-theme-change", { detail: { mode: next } }));
          return next;
        })}
        rightSlot={(
          <div className="flex items-center gap-2">
            <Link to="/profile" className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 text-sm font-semibold text-gray-800 transition-all duration-200 hover:scale-105 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"><IconUser /><span className="hidden sm:inline">Profile</span></Link>
            <button type="button" onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white dark:shadow-lg dark:hover:bg-emerald-600"><IconLogout /><span className="hidden sm:inline">Logout</span></button>
          </div>
        )}
      />

      <main className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1280px] pb-16 pt-6 text-gray-900 transition-colors duration-300 dark:text-gray-100 md:w-[calc(100%-2rem)] md:pb-20">
        <section className="animate-fadeUp overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg dark:hover:shadow-xl">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Discover campus events</p>
              <h1 className="mt-3 max-w-[16ch] font-display text-4xl font-extrabold leading-tight text-gray-900 dark:text-white md:text-6xl">Find events that fit your campus life.</h1>
              <p className="mt-4 max-w-[60ch] text-base leading-8 text-gray-600 dark:text-gray-300">Explore workshops, competitions, cultural nights, and networking sessions from one dashboard. Register quickly and keep your activity in sync.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatCard label="Available events" value={filteredEvents.length} tone="blue" />
                <StatCard label="My registrations" value={myEvents.length} tone="mint" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg dark:hover:shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Quick filters</p>
              <div className="mt-4 grid gap-3">
                <label className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100">
                  <IconSearch />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search events" className="w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400 dark:text-gray-100 dark:placeholder-gray-500" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}>
                    {['All', 'CSE', 'Civil', 'MBA', 'Agriculture'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </SelectField>
                  <SelectField label="Event type" value={eventType} onChange={(event) => setEventType(event.target.value)}>
                    {['All', 'Coding', 'Music', 'Sports', 'Dance', 'Drama', 'Debate', 'Quiz', 'Hackathon', 'Photography', 'Workshop', 'Seminar'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </SelectField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="recent">Recently added</option>
                    <option value="upcoming">Upcoming first</option>
                  </SelectField>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-100 p-2 dark:border-slate-700 dark:bg-slate-700">
                    <button type="button" onClick={() => setViewMode("grid")} className={cx("inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105", viewMode === "grid" ? "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white" : "bg-white text-gray-800 dark:bg-slate-800 dark:text-gray-200") }><IconGrid />Grid</button>
                    <button type="button" onClick={() => setViewMode("list")} className={cx("inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105", viewMode === "list" ? "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white" : "bg-white text-gray-800 dark:bg-slate-800 dark:text-gray-200") }><IconList />List</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">Upcoming events</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Tap an event to register from the dedicated form.</p>
            </div>
            {message ? <p className="text-sm text-red-500 dark:text-red-400">{message}</p> : null}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:shadow-lg">Loading events...</div>
          ) : filteredEvents.length ? (
            <div className={cx("grid gap-5", viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-1")}>
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact={viewMode === "list"}
                  registered={registeredIds.has(String(event.id))}
                  actionLabel={registeredIds.has(String(event.id)) ? "Registered" : "Register"}
                  actionHref={`/register-event?id=${encodeURIComponent(event.id)}`}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:shadow-lg">No events matched your filters.</div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function OrganizerPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [theme, setTheme] = useState(() => getTheme(THEME_ORG_KEY));
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "idle" });
  const [isBusy, setIsBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState("");
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [formData, setFormData] = useState({ title: "", eventType: "Workshop", department: "", eventDate: "", eventTime: "", location: "", description: "" });

  useEffect(() => { localStorage.setItem(THEME_ORG_KEY, theme); }, [theme]);

  useEffect(() => {
    let mounted = true;
    async function loadEvents() {
      try {
        const response = await api.get("/users/events");
        if (mounted) setEvents(Array.isArray(response.data.events) ? response.data.events : []);
      } catch (error) {
        if (mounted) setMessage({ text: error?.response?.data?.message || "Could not load organizer events.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvents();
    return () => { mounted = false; };
  }, []);

  function handleInput(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read selected image."));
      reader.readAsDataURL(file);
    });
  }

  function setPosterFromFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (JPG, JPEG, or PNG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Poster size must be under 2MB.");
      return;
    }

    if (posterPreview && posterPreview.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreview);
    }

    setUploadError("");
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  }

  function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    setPosterFromFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    setPosterFromFile(file);
  }

  useEffect(() => {
    return () => {
      if (posterPreview && posterPreview.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreview);
      }
    };
  }, [posterPreview]);

  async function handleCreateEvent(event) {
    event.preventDefault();
    if (!formData.title.trim() || !formData.department.trim() || !formData.eventDate || !formData.eventTime || !formData.location.trim() || !formData.description.trim()) {
      setMessage({ text: "Please complete all required fields.", type: "error" });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });
      setUploadError("");

      const imageUrl = posterFile ? await readFileAsDataUrl(posterFile) : undefined;

      const response = await api.post("/events", {
        title: formData.title.trim(),
        eventType: formData.eventType,
        department: formData.department.trim(),
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location.trim(),
        description: formData.description.trim(),
        imageUrl
      });

      setMessage({ text: response.data.message || "Event created successfully.", type: "success" });
      if (posterPreview && posterPreview.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreview);
      }
      setPosterFile(null);
      setPosterPreview("");
      setFormData({ title: "", eventType: "Workshop", department: "", eventDate: "", eventTime: "", location: "", description: "" });
      const refreshed = await api.get("/users/events");
      setEvents(Array.isArray(refreshed.data.events) ? refreshed.data.events : []);
    } catch (error) {
      setMessage({ text: error?.response?.data?.message || "Could not create event.", type: "error" });
    } finally {
      setIsBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate("/signin", { replace: true });
  }

  return (
    <AppShell isDark={theme === "dark"}>
      <Navbar
        title="Organizer Dashboard"
        subtitle={user.fullName || "Campus Connect"}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          try { localStorage.setItem(THEME_ORG_KEY, next); } catch (e) {}
          window.dispatchEvent(new CustomEvent("cc-theme-change", { detail: { mode: next } }));
          return next;
        })}
        rightSlot={(
          <div className="flex items-center gap-2">
            <Link to="/profile" className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 text-sm font-semibold text-gray-800 transition-all duration-200 hover:scale-105 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"><IconUser /><span className="hidden sm:inline">Profile</span></Link>
            <button type="button" onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white dark:shadow-lg dark:hover:bg-emerald-600"><IconLogout /><span className="hidden sm:inline">Logout</span></button>
          </div>
        )}
      />

      <main className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1280px] pb-16 pt-6 text-gray-900 transition-colors duration-300 dark:text-gray-100 md:w-[calc(100%-2rem)] md:pb-20"> 
        <section className="animate-fadeUp overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg dark:hover:shadow-xl"> 
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Create and manage events</p>
              <h1 className="mt-3 max-w-[16ch] font-display text-4xl font-extrabold leading-tight text-gray-900 dark:text-white md:text-6xl">Plan campus experiences with precision.</h1>
              <p className="mt-4 max-w-[60ch] text-base leading-8 text-gray-600 dark:text-gray-300">Publish workshops, talks, competitions, and cultural events with a streamlined organizer workspace and live registration overview.</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatCard label="Published events" value={events.length} tone="blue" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg dark:hover:shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">New event</p>
              <form onSubmit={handleCreateEvent} className="mt-4 grid gap-3 md:grid-cols-2">
                <FormField label="Title" name="title" value={formData.title} onChange={handleInput} placeholder="Event title" className="md:col-span-2" />
                <SelectField label="Event type" name="eventType" value={formData.eventType} onChange={handleInput}>
                  {['Workshop', 'Seminar', 'Hackathon', 'Cultural', 'Sports', 'Quiz', 'Debate', 'Photography'].map((item) => <option key={item} value={item}>{item}</option>)}
                </SelectField>
                <FormField label="Department" name="department" value={formData.department} onChange={handleInput} placeholder="e.g. CSE" />
                <FormField label="Date" type="date" name="eventDate" value={formData.eventDate} onChange={handleInput} />
                <FormField label="Time" type="time" name="eventTime" value={formData.eventTime} onChange={handleInput} />
                <FormField label="Location" name="location" value={formData.location} onChange={handleInput} placeholder="Auditorium / Lab / Hall" className="md:col-span-2" />
                <TextAreaField label="Description" name="description" value={formData.description} onChange={handleInput} placeholder="Describe the event, audience, and agenda." className="md:col-span-2" />
                <label
                  className={cx(
                    "md:col-span-2 rounded-xl border-2 border-dashed p-4 transition-colors duration-300",
                    "border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-700",
                    isDragActive && "border-emerald-500 dark:border-emerald-400"
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handleDrop}
                >
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Upload Poster</span>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">JPG, JPEG, PNG up to 2MB. Drag and drop or choose a file.</p>
                  <input type="file" accept=".jpg,.jpeg,.png,image/*" onChange={handleImageUpload} className="mt-3 block w-full cursor-pointer text-sm text-gray-900 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-semibold file:text-white dark:text-gray-100 dark:file:bg-emerald-500 dark:file:text-white" />
                </label>

                {uploadError ? <p className="md:col-span-2 text-sm text-red-500 dark:text-red-400">{uploadError}</p> : null}
                {posterPreview ? (
                  <div className="md:col-span-2 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                    <img src={posterPreview} alt="Poster preview" className="h-56 w-full object-cover" />
                  </div>
                ) : null}

                <p className={cx("md:col-span-2 min-h-[1.25rem] text-sm", message.type === "error" ? "text-red-500 dark:text-red-400" : message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400")}>{message.text}</p>
                <button type="submit" disabled={isBusy} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-emerald-500 dark:bg-emerald-500 dark:text-white dark:shadow-lg dark:hover:bg-emerald-600"><IconPlus />{isBusy ? "Publishing..." : "Publish event"}</button>
              </form>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Your events</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">These cards include the current registration totals returned by the backend.</p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:shadow-lg">Loading organizer events...</div>
          ) : events.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => <EventCard key={event.id} event={event} compact actionLabel={null} dark={theme === "dark"} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:shadow-lg">No organizer events yet.</div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const theme = getTheme(user.role === "organizer" ? THEME_ORG_KEY : THEME_STUDENT_KEY);
  const [extra, setExtra] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(EXTRA_PROFILE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  });
  const [myEvents, setMyEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadMyEvents() {
      try {
        const response = await api.get("/users/events");
        if (mounted) setMyEvents(Array.isArray(response.data.events) ? response.data.events : []);
      } catch (_error) {
        if (mounted) setMyEvents([]);
      }
    }
    loadMyEvents();
    return () => { mounted = false; };
  }, []);

  function handleInput(event) {
    const { name, value } = event.target;
    setExtra((prev) => ({ ...prev, [name]: value }));
  }

  function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem(EXTRA_PROFILE_KEY, JSON.stringify(extra));
      setMessage("Profile details saved locally.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate("/signin", { replace: true });
  }

  const displayName = user.fullName || user.username || "Campus User";

  return (
    <AppShell isDark={theme === "dark"}>
      <Navbar
        title="Profile"
        subtitle={displayName}
        rightSlot={(
          <div className="flex items-center gap-2">
            <Link to={user.role === "organizer" ? "/organizer" : "/dashboard"} className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 text-sm font-semibold text-gray-800 transition-all duration-200 hover:scale-105 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"><IconUser /><span className="hidden sm:inline">Back</span></Link>
            <button type="button" onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white dark:shadow-lg dark:hover:bg-emerald-600"><IconLogout /><span className="hidden sm:inline">Logout</span></button>
          </div>
        )}
      />

      <main className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1180px] pb-16 pt-6 text-gray-900 transition-colors duration-300 dark:text-gray-100 md:w-[calc(100%-2rem)] md:pb-20">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white shadow-sm dark:bg-emerald-500 dark:text-white dark:shadow-lg">{(displayName[0] || "C").toUpperCase()}</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Account</p>
                <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.role || "student"}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StatCard label="Saved extras" value={Object.keys(extra).length} tone="mint" />
              <StatCard label="My items" value={myEvents.length} tone="slate" />
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white">Signed in as</p>
              <p className="mt-1">{user.email || "No email stored"}</p>
              <p className="mt-1">Phone: {user.phoneNumber || extra.phoneNumber || "Not set"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Edit profile extras</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">These details are stored locally with your auth state.</p>

            <form onSubmit={handleSave} className="mt-5 grid gap-3 md:grid-cols-2">
              <FormField label="Phone" name="phoneNumber" value={extra.phoneNumber || ""} onChange={handleInput} placeholder="+911234567890" />
              <FormField label="Department" name="department" value={extra.department || ""} onChange={handleInput} placeholder="Department or school" />
              <FormField label={user.role === "organizer" ? "Organizing unit" : "Program name"} name="programOrUnit" value={extra.programOrUnit || ""} onChange={handleInput} placeholder="Enter a short label" />
              <FormField label={user.role === "organizer" ? "Designation" : "Year / Section"} name="yearOrDesignation" value={extra.yearOrDesignation || ""} onChange={handleInput} placeholder="Your current role" />
              <TextAreaField label="Bio" name="bio" value={extra.bio || ""} onChange={handleInput} placeholder="Add a short bio" className="md:col-span-2" />
              <p className="md:col-span-2 min-h-[1.25rem] text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
              <button type="submit" disabled={saving} className="md:col-span-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-emerald-500 dark:bg-emerald-500 dark:text-white dark:shadow-lg dark:hover:bg-emerald-600">{saving ? "Saving..." : "Save profile"}</button>
            </form>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Recent activity</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">For students, these are registrations. For organizers, these are the events you manage.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myEvents.length ? myEvents.map((event) => <EventCard key={event.id || event.eventId} event={event} compact actionLabel={null} dark={theme === "dark"} />) : <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400 dark:shadow-lg">No activity yet.</div>}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function EventRegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [eventData, setEventData] = useState(null);
  const [formData, setFormData] = useState({ name: getStoredUser().fullName || "", email: getStoredUser().email || "", phone: "", year: "", notes: "" });
  const [status, setStatus] = useState({ text: "", type: "idle" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      try {
        const eventId = searchParams.get("id");
        const rawSelected = sessionStorage.getItem("cc_selected_event");
        if (rawSelected) {
          try {
            const selected = JSON.parse(rawSelected);
            if (!eventId || String(selected.id) === String(eventId)) {
              if (mounted) setEventData(selected);
            }
          } catch (_error) {
            // ignore
          }
        }

        if (!eventData && eventId) {
          const response = await api.get("/events");
          const events = Array.isArray(response.data.events) ? response.data.events : [];
          const matched = events.find((item) => String(item.id) === String(eventId));
          if (mounted) setEventData(matched || null);
        }
      } catch (_error) {
        if (mounted) setStatus({ text: "Unable to load event details.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvent();
    return () => { mounted = false; };
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    async function loadRegistrations() {
      if (!eventData?.id) return;
      try {
        const response = await api.get("/users/events");
        const items = Array.isArray(response.data.events) ? response.data.events : [];
        const exists = items.some((item) => String(item.eventId || item.id) === String(eventData.id));
        if (mounted) setAlreadyRegistered(exists);
      } catch (_error) {
        if (mounted) setAlreadyRegistered(false);
      }
    }
    loadRegistrations();
    return () => { mounted = false; };
  }, [eventData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!eventData?.id) {
      setStatus({ text: "Event not found.", type: "error" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setStatus({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (!/^\+\d{10,}$/.test(formData.phone.trim())) {
      setStatus({ text: "Phone number must include country code and at least 10 digits.", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post("/events/register", { eventId: eventData.id });
      setAlreadyRegistered(true);
      setStatus({ text: response.data.message || "You are registered for this event.", type: "success" });
    } catch (error) {
      setStatus({ text: error?.response?.data?.message || "Could not register for this event.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <AppShell><div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8"><div className="rounded-3xl border border-[#d2e2ef] bg-white px-6 py-10 text-[#5a6f86] shadow-[0_16px_34px_rgba(30,53,79,0.08)]">Loading event registration details...</div></div></AppShell>;
  }

  if (!eventData) {
    return <AppShell><div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8"><div className="rounded-3xl border border-[#ecd0d0] bg-white px-6 py-10 shadow-[0_16px_34px_rgba(30,53,79,0.08)]"><h1 className="font-display text-2xl font-semibold text-[#9e2d4f]">Registration page unavailable</h1><p className="mt-2 text-[#5a6f86]">{status.text || "Please return to dashboard and select an event again."}</p><button type="button" onClick={() => navigate("/dashboard")} className="mt-6 inline-flex rounded-full bg-[#0e8f84] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d7a6e]">Back to dashboard</button></div></div></AppShell>;
  }

  const when = formatDateTime(eventData.date, eventData.time);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <EventCard event={eventData} actionLabel={null} compact />

          <div className="rounded-3xl border border-[#cfdeeb] bg-white p-6 shadow-[0_22px_52px_rgba(26,49,74,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0e8f84]">Event registration</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-[#1a2a3d]">{eventData.title}</h1>
            <p className="mt-2 text-sm text-[#5f748a]">{when.longLabel}</p>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
              <FormField label="Full name" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" />
              <FormField label="Email" name="email" value={formData.email} onChange={handleChange} placeholder="you@university.edu" />
              <FormField label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+911234567890" />
              <FormField label="Year / Section" name="year" value={formData.year} onChange={handleChange} placeholder="Your year or section" />
              <TextAreaField label="Notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Any special requirements or comments" />

              <p className={cx("min-h-[1.25rem] text-sm", status.type === "error" ? "text-[#d64a5e]" : status.type === "success" ? "text-[#16a084]" : "text-[#5f748a]")}>{status.text}</p>

              <button type="submit" disabled={submitting || alreadyRegistered} className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">
                {alreadyRegistered ? "Already registered" : submitting ? "Submitting..." : "Confirm registration"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AdminPage() {
  const [health, setHealth] = useState({ status: "unknown", database: "oracle" });
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("cc_admin_token") || "");
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/health")
      .then((response) => { if (mounted) setHealth(response.data || health); })
      .catch(() => { if (mounted) setMessage("Admin health check unavailable."); });
    return () => { mounted = false; };
  }, []);

  async function loadAdminData(token = adminToken) {
    if (!token) return;
    setBusy(true);
    setMessage("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [usersRes, eventsRes, registrationsRes] = await Promise.all([
        api.get("/admin/users", config),
        api.get("/admin/events", { ...config, params: { status: "All" } }),
        api.get("/admin/registrations", config)
      ]);
      setUsers(Array.isArray(usersRes.data.users) ? usersRes.data.users : []);
      setEvents(Array.isArray(eventsRes.data.events) ? eventsRes.data.events : []);
      setRegistrations(Array.isArray(registrationsRes.data.registrations) ? registrationsRes.data.registrations : []);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Could not load admin data.");
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem("cc_admin_token");
        setAdminToken("");
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (adminToken) loadAdminData(adminToken);
  }, [adminToken]);

  function handleCredentialChange(event) {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await api.post("/admin/login", credentials);
      localStorage.setItem("cc_admin_token", response.data.token);
      setAdminToken(response.data.token);
      setCredentials({ email: "", password: "" });
      setMessage("Admin signed in.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function updateEventStatus(eventId, action) {
    setBusy(true);
    setMessage("");
    try {
      await api.patch(`/admin/events/${eventId}/${action}`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
      await loadAdminData(adminToken);
      setMessage(`Event ${action === "approve" ? "approved" : "rejected"}.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Could not update event.");
    } finally {
      setBusy(false);
    }
  }

  function handleLogoutAdmin() {
    localStorage.removeItem("cc_admin_token");
    setAdminToken("");
    setUsers([]);
    setEvents([]);
    setRegistrations([]);
    setMessage("Admin signed out.");
  }

  return (
    <AppShell>
      <main className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1280px] pb-16 pt-8 text-gray-900 transition-colors duration-300 dark:text-gray-100 md:w-[calc(100%-2rem)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Admin</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-gray-900 dark:text-white">Campus Connect Admin Panel</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Backend health: {health.ok || health.status === "ok" ? "online" : "unknown"} {health.service ? `(${health.service})` : ""}</p>
            </div>
            {adminToken ? (
              <button type="button" onClick={handleLogoutAdmin} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 transition-all duration-200 hover:scale-105 dark:bg-slate-700 dark:text-gray-200">Sign out</button>
            ) : null}
          </div>

          {!adminToken ? (
            <form onSubmit={handleAdminLogin} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <FormField label="Admin email" type="email" name="email" value={credentials.email} onChange={handleCredentialChange} placeholder="admin@campusconnect.local" />
              <FormField label="Password" type="password" name="password" value={credentials.password} onChange={handleCredentialChange} placeholder="Admin password" />
              <button type="submit" disabled={busy} className="self-end rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:scale-100">Login</button>
            </form>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatCard label="Users" value={users.length} />
              <StatCard label="Events" value={events.length} />
              <StatCard label="Registrations" value={registrations.length} />
            </div>
          )}

          {message ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p> : null}
        </section>

        {adminToken ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
              <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Events</h2>
              <div className="mt-4 space-y-3">
                {events.length ? events.map((event) => (
                  <article key={event.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{event.department} • {event.eventType} • {event.approvalStatus || "Pending"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateEventStatus(event.id, "approve")} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-600">Approve</button>
                        <button type="button" onClick={() => updateEventStatus(event.id, "reject")} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-red-600">Reject</button>
                      </div>
                    </div>
                  </article>
                )) : <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">No events found.</p>}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <div className="mt-4 space-y-3">
                  {users.length ? users.slice(0, 8).map((item) => (
                    <article key={item.id} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                      <p className="font-semibold text-gray-900 dark:text-white">{item.firstName} {item.lastName}</p>
                      <p>{item.email} • {item.accountType}</p>
                    </article>
                  )) : <p className="text-sm text-gray-500 dark:text-gray-400">No users found.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-lg">
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Registrations</h2>
                <div className="mt-4 space-y-3">
                  {registrations.length ? registrations.slice(0, 8).map((item) => (
                    <article key={item.id} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                      <p className="font-semibold text-gray-900 dark:text-white">{item.fullName || item.email}</p>
                      <p>{item.eventTitle} • {item.department}</p>
                    </article>
                  )) : <p className="text-sm text-gray-500 dark:text-gray-400">No registrations found.</p>}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/signin" element={<PublicOnly><SigninPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/dashboard" element={<ProtectedRoute role="student"><DashboardPage /></ProtectedRoute>} />
        <Route path="/organizer" element={<ProtectedRoute role="organizer"><OrganizerPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/register-event" element={<ProtectedRoute role="student"><EventRegistrationPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
