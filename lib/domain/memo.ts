// メモ（タイムライン形式）の本文の扱い。DB の Memo は title / body / url を持つが、
// 画面では1つの投稿テキストとして入力・表示する（スキーマは変えない）。
//   - 1行目 = title、2行目以降 = body（往復しても文字は失われない）
//   - 本文中の最初の URL = url（CSV 出力などで使う）
//   - 本文中の #ハッシュタグ = タグ

export const MEMO_TAG_MAX_LENGTH = 30;

// タグに使える文字（空白・# と、日本語/英語の区切り記号以外）。
const TAG_CHARS = "[^\\s#、。，,．.！!？?「」『』（）()\\[\\]【】]+";
const URL_PATTERN = 'https?:\\/\\/[^\\s<>"]+';

// 行頭か空白の直後の # だけをタグとみなす（URL の #anchor を拾わないため）。
const HASHTAG_RE = new RegExp(`(?<![^\\s])#(${TAG_CHARS})`, "g");
const URL_RE = new RegExp(URL_PATTERN);
const TOKEN_RE = new RegExp(`(${URL_PATTERN})|(?<![^\\s])#(${TAG_CHARS})`, "g");

export interface ParsedMemoText {
  title: string;
  body: string | null;
  url: string | null;
  hashtags: string[];
}

export function extractHashtags(text: string): string[] {
  const names = Array.from(text.matchAll(HASHTAG_RE), (match) =>
    match[1].slice(0, MEMO_TAG_MAX_LENGTH),
  );
  return Array.from(new Set(names));
}

/// 投稿テキスト → 保存用の値。空なら null。
export function parseMemoText(raw: string): ParsedMemoText | null {
  const text = raw.trim();
  if (text.length === 0) {
    return null;
  }
  const [first, ...rest] = text.split(/\r?\n/);
  const body = rest.join("\n").trim();
  return {
    title: first.trim(),
    body: body.length > 0 ? body : null,
    url: text.match(URL_RE)?.[0] ?? null,
    hashtags: extractHashtags(text),
  };
}

/// 保存済みの値 → 投稿テキスト（編集の初期値・表示に使う）。
/// 旧来の「URL 欄だけに入っている URL」は末尾に足して失わないようにする。
export function composeMemoText(memo: {
  title: string;
  body: string | null;
  url: string | null;
}): string {
  const text = [memo.title, memo.body].filter(Boolean).join("\n");
  return memo.url && !text.includes(memo.url) ? `${text}\n${memo.url}` : text;
}

export type MemoToken =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "tag"; value: string };

/// 表示用に本文を「通常テキスト / URL / #タグ」に分ける。
export function tokenizeMemoText(text: string): MemoToken[] {
  const tokens: MemoToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ type: "text", value: text.slice(last, index) });
    }
    tokens.push(
      match[1]
        ? { type: "url", value: match[1] }
        : { type: "tag", value: match[2] },
    );
    last = index + match[0].length;
  }
  if (last < text.length) {
    tokens.push({ type: "text", value: text.slice(last) });
  }
  return tokens;
}
