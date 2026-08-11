"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, spaceHref } from "@/lib/navigation/spaces";

// 5 Space の主ナビゲーション。設計参照: 05 §9（同一順序・同一意味を PC/モバイルで保つ）。
// variant で見た目だけを切り替え、順序・現在地判定・リンク先は共通化する。
//   - "sidebar": PC（md 以上）左サイドの縦並び。
//   - "bottom":  モバイルの下部固定バーの横並び。

type SpaceNavVariant = "sidebar" | "bottom";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SpaceNav({ variant }: { variant: SpaceNavVariant }) {
  const pathname = usePathname();

  const isSidebar = variant === "sidebar";
  const listClass = isSidebar
    ? "flex flex-col gap-1"
    : "flex flex-row items-stretch";

  return (
    <ul className={listClass}>
      {SPACES.map((space) => {
        const href = spaceHref(space.slug);
        const active = isActive(pathname, href);

        const base = isSidebar
          ? "block rounded-md px-3 py-2 text-sm font-medium transition-colors"
          : "flex flex-1 items-center justify-center px-2 py-3 text-xs font-medium transition-colors";

        const state = active
          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";

        return (
          <li key={space.slug} className={isSidebar ? "" : "flex-1"}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${base} ${state}`}
            >
              {space.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
