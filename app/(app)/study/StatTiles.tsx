import { eyebrowClass } from "@/components/ui/styles";

export interface StatTile {
  label: string;
  value: string;
  sub?: string;
}

/// 数値の見出し（解答数・正答率など）を横に並べる。
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-1.5">
          <dt className={eyebrowClass}>{tile.label}</dt>
          <dd className="text-3xl leading-none font-normal tracking-[-0.025em] text-ink tabular-nums">
            {tile.value}
            {tile.sub ? (
              <span className="ml-1 text-sm tracking-normal text-fog">
                {tile.sub}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
