"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client-side providers. next-themes drives the `.dark` class on <html>,
 * matching Tailwind's `darkMode: "class"` strategy. Defaults to light; the
 * toggle still lets the user switch to dark (or follow the system setting).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
