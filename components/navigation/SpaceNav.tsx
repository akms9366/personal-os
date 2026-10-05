"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, spaceHref } from "@/lib/navigation/spaces";

// 5 Space の主ナビゲーション。設計参照: 05 §9（同一順序・同一意味を PC/モバイルで保つ）。
// variant で見た目だけを切り替え、順序・現在地判定・リンク先は共通化する。
//   - "top":    PC（md 以上）上部バーの横並び（文字リンク。現在地は Ink、他は Fog）。
//   - "bottom": モバイルの下部固定バーの横並び（現在地は上辺の短いバーで示す）。

type SpaceNavVariant = "top" | "bottom";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SpaceNav({ variant }: { variant: SpaceNavVariant }) {
  const pathname = usePathname();
  const isTop = variant === "top";

  return (
    <ul className={isTop ? "flex items-center gap-6" : "flex items-stretch"}>
      {SPACES.map((space) => {
        const href = spaceHref(space.slug);
        const active = isActive(pathname, href);
        const tone = active ? "text-ink" : "text-fog hover:text-ink";

        return (
          <li key={space.slug} className={isTop ? "" : "flex-1"}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                isTop
                  ? `text-sm font-medium transition-colors focus-visible:underline ${tone}`
                  : `relative flex h-14 items-center justify-center text-[11px] font-medium transition-colors ${tone}`
              }
            >
              {!isTop && active ? (
                <span
                  aria-hidden
                  className="absolute top-0 h-0.5 w-6 rounded-full bg-ink"
                />
              ) : null}
              {space.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
