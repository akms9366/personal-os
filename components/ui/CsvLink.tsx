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
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
    >
      {label}
    </a>
  );
}
