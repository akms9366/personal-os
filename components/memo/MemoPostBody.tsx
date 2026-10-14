import Link from "next/link";
import { extractHashtags, tokenizeMemoText } from "@/lib/domain/memo";
import { tagClass } from "@/components/ui/styles";
import { MemoAnalysisPanel } from "./MemoAnalysisPanel";
import type { MemoPostView } from "./memoView";

// 投稿の中身（原文・確定タグ・AI 解析）の表示専用部分。hooks を持たない。
// 原文はいつも先頭にそのまま出し、AI 解析の状態（解析中・失敗など）に左右されない。

export function tagHref(tag: string): string {
  return `/knowledge/memos?tag=${encodeURIComponent(tag)}`;
}

function displayUrl(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return stripped.length > 40 ? `${stripped.slice(0, 39)}…` : stripped;
}

function MemoText({ text }: { text: string }) {
  return (
    <p
      className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink"
      data-memo-text
    >
      {tokenizeMemoText(text).map((token, index) => {
        if (token.type === "tag") {
          return (
            <Link
              key={index}
              href={tagHref(token.value)}
              className="font-medium text-ink underline decoration-dove underline-offset-2 hover:decoration-ink"
            >
              #{token.value}
            </Link>
          );
        }
        if (token.type === "url") {
          return (
            <a
              key={index}
              href={token.value}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] text-steel underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {displayUrl(token.value)}
            </a>
          );
        }
        return token.value;
      })}
    </p>
  );
}

export function MemoPostBody({
  memo,
  analyzing,
  onAnalyze,
}: {
  memo: MemoPostView;
  analyzing: boolean;
  onAnalyze?: () => void;
}) {
  // 本文に #タグ として現れないタグ（旧データ等）は、本文の下にチップで示す。
  const inText = extractHashtags(memo.text);
  const extraTags = memo.tags.filter((tag) => !inText.includes(tag));

  return (
    <>
      <MemoText text={memo.text} />
      {extraTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {extraTags.map((tag) => (
            <Link key={tag} href={tagHref(tag)} className={tagClass}>
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}
      <MemoAnalysisPanel
        view={memo.analysis}
        analyzing={analyzing}
        onAnalyze={onAnalyze}
      />
    </>
  );
}
