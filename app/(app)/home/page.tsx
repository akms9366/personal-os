import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";

// Home 空間（05 §4「今日行動するための画面」）。
// Issue #4 では骨格のみ。現在地/今日/振り返りの機能は後続 Issue（#15〜#18）が実装するため、
// ここでは空のプレースホルダ領域のみを置く（先行実装しない）。
const space = getSpace("home")!;

export default function HomePage() {
  return (
    <SpaceScaffold space={space}>
      <div className="rounded-lg border border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        現在地・今日・振り返りを、今後この領域に構成します（後続 Issue）。
      </div>
    </SpaceScaffold>
  );
}
