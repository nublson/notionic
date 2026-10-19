"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

// Both icons stay mounted and the `dark` class picks one, so the button renders
// the same on the server and needs no mounted check.
const ICON =
  "absolute size-4 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";

/**
 * Runs a theme change with every transition off except the toggle's icons, so
 * the page's colors snap instead of each link and button fading on its own.
 */
function withoutTransitions(change: () => void) {
  const style = document.createElement("style");
  style.textContent = "*:not([data-theme-icon]),*::before,*::after{transition:none!important}";
  document.head.append(style);
  change();
  // next-themes swaps the class in an effect; once it has, apply the new colors
  // with a reflow, then restore transitions.
  setTimeout(() => {
    getComputedStyle(document.body).opacity;
    style.remove();
  }, 1);
}

/** Switches between light and dark; the OS setting applies until it's used. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() =>
        withoutTransitions(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
      }
      aria-label="Toggle dark mode"
      className="relative -m-1 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <SunIcon
        data-theme-icon
        aria-hidden="true"
        className={`${ICON} dark:scale-25 dark:opacity-0 dark:blur-xs`}
      />
      <MoonIcon
        data-theme-icon
        aria-hidden="true"
        className={`${ICON} scale-25 opacity-0 blur-xs dark:scale-100 dark:opacity-100 dark:blur-none`}
      />
    </button>
  );
}
