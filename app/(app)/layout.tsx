import type { ReactNode } from "react";
import Link from "next/link";
import { SpaceNav } from "@/components/navigation/SpaceNav";
import {
  QuickCapture,
  QuickCaptureTrigger,
} from "@/components/capture/QuickCapture";

// アプリ骨格（5 Space 共通シェル）。設計参照: 05 §9.2/§9.3。
//   - PC（md 以上）: 上部固定バー（64px・背景ぼかし）に 5 Space の横ナビ＋Quick Capture。
//   - モバイル: 上部はロゴのみ、5 Space は下部固定バー（本文は下部バー分の余白を確保）。
// 主タブは 5 Space のみ（05 §9.1）。Quick Capture / Search は横断能力のため
// 主タブに含めない。外部サービス名も主ナビに出さない（05 §9.4）。

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-dove/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-8 px-4 sm:px-6 md:h-16 lg:px-8">
          <Link
            href="/home"
            className="flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-ink"
          >
            <span aria-hidden className="h-4 w-2 rounded-full bg-ink" />
            Personal OS
          </Link>
          <nav aria-label="主ナビゲーション" className="hidden md:block">
            <SpaceNav variant="top" />
          </nav>
          <div className="ml-auto hidden md:block">
            <QuickCaptureTrigger />
          </div>
        </div>
      </header>

      {/* 本文（モバイルは下部バー分の余白） */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      {/* モバイル: 下部固定ナビ */}
      <nav
        aria-label="主ナビゲーション"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-dove/60 bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <SpaceNav variant="bottom" />
      </nav>

      {/* Quick Capture（横断能力）: 5 Space どこからでも到達可能 */}
      <QuickCapture />
    </div>
  );
}
