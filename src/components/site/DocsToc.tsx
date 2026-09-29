"use client";

import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  label: string;
}

/** Scroll-spy table of contents — highlights the section currently in view. */
export function DocsToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" }
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="space-y-1 border-l border-slate-200 dark:border-slate-800">
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          onClick={() => setActive(it.id)}
          className={[
            "-ml-px block border-l-2 py-1 pl-4 text-sm transition",
            active === it.id
              ? "border-indigo-500 font-medium text-indigo-600 dark:text-indigo-300"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
          ].join(" ")}
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
