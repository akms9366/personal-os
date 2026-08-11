import type { ReactNode } from "react";
import Link from "next/link";
import { SpaceNav } from "@/components/navigation/SpaceNav";

// アプリ骨格（5 Space 共通シェル）。設計参照: 05 §9.2/§9.3。
//   - PC（md 以上）: 左サイドバーに 5 Space の縦ナビ。
//   - モバイル: 下部固定バーに 5 Space の横ナビ（本文は下部バー分の余白を確保）。
// 主タブは 5 Space のみ（05 §9.1）。Quick Capture / Search は横断能力のため
// 主タブに含めない（後続 Issue）。外部サービス名も主ナビに出さない（05 §9.4）。

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* PC: 左サイドバー */}
      <aside className="hidden border-r border-zinc-200 md:flex md:w-56 md:flex-col dark:border-zinc-800">
        <div className="px-4 py-5">
          <Link
            href="/home"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Personal OS
          </Link>
        </div>
        <nav aria-label="主ナビゲーション" className="px-2">
          <SpaceNav variant="sidebar" />
        </nav>
      </aside>

      {/* 本文（モバイルは下部バー分の余白 pb-16） */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* モバイル: 下部固定ナビ */}
      <nav
        aria-label="主ナビゲーション"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-[var(--background)] md:hidden dark:border-zinc-800"
      >
        <SpaceNav variant="bottom" />
      </nav>
    </div>
  );
}
