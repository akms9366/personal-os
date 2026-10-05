"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { extractFinanceAction, saveFinanceDraftsAction } from "./actions";
import { DraftFields, emptyDraft } from "./DraftFields";
import type { FinanceDraft } from "@/lib/domain/finance";
import {
  aiBadgeClass,
  dangerButtonClass,
  errorTextClass,
  noticeClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
  textareaClass,
} from "@/components/ui/styles";

const MAX_IMAGE_EDGE = 1568;

/// 画像をブラウザ側で縮小し JPEG の base64 にする（送信量と API の画像上限への対策）。
async function resizeImage(
  file: File,
): Promise<{ mediaType: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    mediaType: "image/jpeg",
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
  };
}

/// AI 入力 → 下書き確認 → 保存。AI の結果はそのまま保存せず、必ずここで確認・修正してから保存する。
export function FinanceCapture({ today }: { today: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<FinanceDraft[] | null>(null);
  const [source, setSource] = useState<"ai" | "manual">("ai");
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [extracting, startExtract] = useTransition();
  const [saving, startSave] = useTransition();

  function reset() {
    setDrafts(null);
    setNote("");
    setError("");
    setText("");
    setFile(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function handleExtract() {
    setError("");
    setMessage("");
    startExtract(async () => {
      let image: { mediaType: string; base64: string } | undefined;
      if (file) {
        try {
          image = await resizeImage(file);
        } catch {
          setError("画像を読み込めませんでした。");
          return;
        }
      }
      const result = await extractFinanceAction({ text, image });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSource("ai");
      setSourceText(text.trim() || (file ? `（画像: ${file.name}）` : null));
      setNote(result.note ?? "");
      setDrafts(
        result.drafts && result.drafts.length > 0
          ? result.drafts
          : [emptyDraft(today)],
      );
    });
  }

  function startManual() {
    setError("");
    setMessage("");
    setSource("manual");
    setSourceText(null);
    setNote("");
    setDrafts([emptyDraft(today)]);
  }

  function handleSave() {
    if (!drafts) {
      return;
    }
    setError("");
    startSave(async () => {
      const result = await saveFinanceDraftsAction({
        drafts,
        source,
        sourceText,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(`${drafts.length}件を保存しました。`);
      reset();
      router.refresh();
    });
  }

  if (drafts) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-xs text-fog">
          {source === "ai" ? (
            <>
              <span className={aiBadgeClass}>AI 下書き</span>
              内容を確認・修正してから保存してください（未保存）。
            </>
          ) : (
            "記録を入力して保存してください。"
          )}
        </p>
        {note ? <p className={noticeClass}>{note}</p> : null}
        <ul className="flex flex-col gap-3">
          {drafts.map((draft, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-dove"
            >
              <DraftFields
                draft={draft}
                onChange={(next) =>
                  setDrafts(drafts.map((d, i) => (i === index ? next : d)))
                }
              />
              {drafts.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setDrafts(drafts.filter((_, i) => i !== index))
                  }
                  className={`${dangerButtonClass} self-end`}
                >
                  この行を外す
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error ? (
            <p className={`mr-auto ${errorTextClass}`}>{error}</p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setDrafts([
                ...drafts,
                emptyDraft(drafts[drafts.length - 1]?.date ?? today),
              ])
            }
            className={secondaryButtonClass}
          >
            行を追加
          </button>
          <button
            type="button"
            onClick={reset}
            className={secondaryButtonClass}
          >
            やめる
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={primaryButtonClass}
          >
            {saving ? "保存中..." : `${drafts.length}件を保存`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={
          "例: 昨日スーパーで3,240円 カード払い\n今日ランチ 980円、電車 420円\n10/25 給料 285,000円"
        }
        aria-label="記録したい内容"
        className={textareaClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${secondaryButtonClass} cursor-pointer`}>
          {file ? "写真を変更" : "レシートの写真"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        {file ? (
          <span className="flex items-center gap-1 font-mono text-xs text-fog">
            {file.name}
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) {
                  fileRef.current.value = "";
                }
              }}
              className="px-1 hover:text-ink"
              aria-label="写真を外す"
            >
              ×
            </button>
          </span>
        ) : null}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={startManual}
            className={secondaryButtonClass}
          >
            手入力
          </button>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || (!text.trim() && !file)}
            className={primaryButtonClass}
          >
            {extracting ? "AI が読み取り中..." : "AI で下書き"}
          </button>
        </div>
      </div>
      {error ? <p className={errorTextClass}>{error}</p> : null}
      {message ? <p className={successTextClass}>{message}</p> : null}
    </div>
  );
}
