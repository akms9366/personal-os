// CSV 出力リンク。/export/<kind> はログイン保護下の Route Handler（proxy.ts）。
// 拡張子付きパスは proxy の保護対象外になるため、URL に ".csv" を付けないこと。
export function CsvLink({
  kind,
  label = "CSV出力",
}: {
  kind: string;
  label?: string;
}) {
  return (
    <a
      href={`/export/${kind}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] text-fog ring-1 ring-dove transition hover:text-ink hover:ring-pewter"
    >
      <span aria-hidden>↓</span>
      {label}
    </a>
  );
}
