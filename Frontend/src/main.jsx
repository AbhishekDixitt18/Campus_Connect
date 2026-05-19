import React from "react";
import { createRoot } from "react-dom/client";
import App from "../app.jsx";
import "./styles.css";

const THEME_ORG_KEY = "cc_org_theme";
const THEME_STUDENT_KEY = "cc_student_theme";

function applyThemeFromStorage() {
  const org = localStorage.getItem(THEME_ORG_KEY);
  const stud = localStorage.getItem(THEME_STUDENT_KEY);
  const mode = org || stud;
  if (mode === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

// apply on load
applyThemeFromStorage();

// listen for programmatic theme change events dispatched by the app
window.addEventListener("cc-theme-change", (e) => {
  const mode = e?.detail?.mode;
  if (mode === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
});

// listen for storage changes (other tabs)
window.addEventListener("storage", (e) => {
  if (e.key === THEME_ORG_KEY || e.key === THEME_STUDENT_KEY) applyThemeFromStorage();
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);