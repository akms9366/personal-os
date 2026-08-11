import type { ReactNode } from "react";
import type { Space } from "@/lib/navigation/spaces";

// 各 Space ページ共通の骨格。見出し（title）＋役割（purpose）＋本文領域。
// Issue #4 の目的は「今後の機能を載せられる UI の骨格」。機能自体は後続 Issue が実装する。
//   - stub（Insights/Knowledge/Finance/Settings）: 「準備中」を明示。
//   - active（Home）: children に最小のプレースホルダ領域を渡す。

export function SpaceScaffold({
  space,
  children,
}: {
  space: Space;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {space.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {space.purpose}
        </p>
      </header>

      {space.status === "stub" ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          準備中 — この空間は後続 Issue で実装します。
        </div>
      ) : (
        children
      )}
    </section>
  );
}
