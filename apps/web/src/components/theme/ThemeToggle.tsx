"use client";

import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
      <circle
        cx="10"
        cy="10"
        r="3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 2.75v2.1M10 15.15v2.1M2.75 10h2.1M15.15 10h2.1M4.86 4.86l1.49 1.49M13.65 13.65l1.49 1.49M15.14 4.86l-1.49 1.49M6.35 13.65l-1.49 1.49"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        fill="currentColor"
        d="M12.64 2.26a.75.75 0 0 1 .64.96A6.75 6.75 0 1 0 16.78 10a.75.75 0 0 1 1.45-.2A8.25 8.25 0 1 1 10.2 1.77a.75.75 0 0 1 .2 1.45c-.06.01-.13.02-.2.03a6.75 6.75 0 0 0 2.44-1 .75.75 0 0 1 .96.01Z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { mounted, theme, toggleTheme } = useTheme();
  const activeThemeLabel = mounted ? (theme === "dark" ? "Escuro" : "Claro") : "Tema";
  const desktopToggleLabel = mounted ? (theme === "dark" ? "Modo claro" : "Modo escuro") : "Tema";
  const mobileIcon = mounted ? (theme === "dark" ? <MoonIcon /> : <SunIcon />) : <SunIcon />;
  const desktopIcon = mounted ? (theme === "dark" ? <SunIcon /> : <MoonIcon />) : <SunIcon />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
    >
      <span className="inline-flex items-center gap-1 sm:hidden">
        {mobileIcon}
        {activeThemeLabel}
      </span>
      <span className="hidden items-center gap-1 sm:inline-flex">
        {desktopIcon}
        {desktopToggleLabel}
      </span>
    </button>
  );
}
