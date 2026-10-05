"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabPillClass } from "@/components/ui/styles";

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
    <nav
      aria-label="サブナビゲーション"
      className="-mx-4 mb-10 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex gap-1">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={tabPillClass(active)}
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
