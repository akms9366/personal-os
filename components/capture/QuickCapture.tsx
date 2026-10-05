"use client";

import { useEffect, useState } from "react";
import { MemoComposer } from "@/components/memo/MemoComposer";
import { primaryButtonClass } from "@/components/ui/styles";

/// ヘッダーのボタンなど、ダイアログの外から開くためのイベント名。
const OPEN_EVENT = "quick-capture:open";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/// PC の上部バーに置くメモ投稿ボタン（画面で唯一の塗りの黒ピル）。
export function QuickCaptureTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      aria-label="メモを書く（ショートカット: c）"
      className={primaryButtonClass}
    >
      メモ
      <kbd className="rounded-full bg-paper/15 px-1.5 font-mono text-[11px] text-paper/80">
        c
      </kbd>
    </button>
  );
}

// どの画面からでもメモを書けるダイアログ（旧 Quick Capture。メモ機能に統合した）。
// 5 Space の主タブには含めず、どの画面からも同じ入口（PC: 上部バー／モバイル: 右下の丸ボタン／
// ショートカット "c"）で開く。分類は求めず、本文に #タグ を書けば後から絞り込める。
export function QuickCapture({ tagSuggestions }: { tagSuggestions: string[] }) {
  const [open, setOpen] = useState(false);

  // グローバルショートカット: "c" で開く（入力中・修飾キー押下時は無視）。開いている間は Escape で閉じる。
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (open) {
        if (event.key === "Escape") {
          setOpen(false);
        }
        return;
      }
      if (
        event.key === "c" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_EVENT, handleOpen);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="メモを書く（ショートカット: c）"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-2xl font-light text-paper shadow-header transition hover:bg-slate md:hidden"
      >
        +
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="メモを書く"
          className="fixed inset-0 z-30 flex items-start justify-center bg-ink/20 p-4 pt-20 backdrop-blur-[2px] sm:items-center sm:pt-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-paper shadow-float">
            <div className="flex items-center justify-between border-b border-dove/60 px-5 py-3">
              <span className="font-mono text-xs text-fog">new memo</span>
              <span className="font-mono text-[11px] text-pewter">
                ⌘/Ctrl + Enter で投稿 · Esc で閉じる
              </span>
            </div>
            <div className="p-5">
              <MemoComposer
                autoFocus
                tagSuggestions={tagSuggestions}
                onPosted={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
