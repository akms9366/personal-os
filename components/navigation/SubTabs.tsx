"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SubTab {
  href: string;
  label: string;
}

/// Space 内のサブタブ（主ナビの 5 Space は増やさず、Space の中で機能を切り替える。05 §9.1）。
export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  const pathname = usePathname();
  // 最も長く一致する href を現在地とする（/knowledge と /knowledge/memos を区別するため）。
  const activeHref = tabs
    .filter(
      (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="サブナビゲーション" className="-mx-1 mb-5 overflow-x-auto">
      <ul className="flex gap-1 px-1">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
