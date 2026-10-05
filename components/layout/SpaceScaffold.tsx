import type { ReactNode } from "react";
import { SPACES, type Space } from "@/lib/navigation/spaces";

// 各 Space ページ共通の骨格。見出し（title）＋役割（purpose）＋本文領域。
//   - 見出しは大きく・細く・詰めて（DESIGN.md の Display 書体）。上に等幅の通し番号。
//   - width="wide" は2カラムを持つ画面（Home）用。既定は読みやすい1カラム幅。
//   - title / description を渡すと見出し・説明を差し替える（Home は今日の日付）。
//   - stub の空間は「準備中」を明示する。

export function SpaceScaffold({
  space,
  width = "default",
  title,
  description,
  children,
}: {
  space: Space;
  width?: "default" | "wide";
  title?: ReactNode;
  description?: string;
  children?: ReactNode;
}) {
  const index = SPACES.findIndex((s) => s.slug === space.slug) + 1;

  return (
    <section
      className={`mx-auto w-full px-4 pt-10 pb-16 sm:px-6 md:pt-16 lg:px-8 ${
        width === "wide" ? "max-w-[1200px]" : "max-w-3xl"
      }`}
    >
      <header className="mb-10 md:mb-14">
        <p className="mb-4 font-mono text-xs tracking-[-0.01em] text-pewter">
          {String(index).padStart(2, "0")} / {space.label.toLowerCase()}
        </p>
        <h1 className="text-[44px] leading-none font-normal tracking-[-0.025em] text-ink md:text-6xl">
          {title ?? space.title}
        </h1>
        <p className="mt-4 text-base text-fog">
          {description ?? space.purpose}
        </p>
      </header>

      {space.status === "stub" ? (
        <div className="rounded-2xl bg-cream px-6 py-16 text-center">
          <p className="font-mono text-xs text-pewter">coming soon</p>
          <p className="mt-2 text-sm text-fog">
            この空間は後続 Issue で実装します。
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
