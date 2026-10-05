"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveQuickCapture,
  type QuickCaptureState,
} from "@/lib/capture/actions";
import {
  errorTextClass,
  ghostButtonClass,
  primaryButtonClass,
  successTextClass,
} from "@/components/ui/styles";

const initialState: QuickCaptureState = {};

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

/// PC の上部バーに置く Quick Capture ボタン（画面で唯一の塗りの黒ピル）。
export function QuickCaptureTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      aria-label="Quick Capture を開く（ショートカット: c）"
      className={primaryButtonClass}
    >
      Capture
      <kbd className="rounded-full bg-paper/15 px-1.5 font-mono text-[11px] text-paper/80">
        c
      </kbd>
    </button>
  );
}

// Quick Capture（横断能力）。設計参照: 11 §5「入力先の分類を強制せず、原情報と時点を保つ」。
// 5 Space の主タブには含めず、どの画面からも同じ入口（PC: 上部バー／モバイル: 右下の丸ボタン／
// ショートカット "c"）で開く。
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveQuickCapture,
    initialState,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  // 保存成功後: 分類を求めず、入力欄を空にして次の記録をすぐ続けられるようにする。
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick Capture を開く（ショートカット: c）"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-2xl font-light text-paper shadow-header transition hover:bg-slate md:hidden"
      >
        +
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Capture"
          className="fixed inset-0 z-30 flex items-start justify-center bg-ink/20 p-4 pt-20 backdrop-blur-[2px] sm:items-center sm:pt-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-paper shadow-float">
            <div className="flex items-center justify-between border-b border-dove/60 px-5 py-3">
              <span className="font-mono text-xs text-fog">quick capture</span>
              <span className="font-mono text-[11px] text-pewter">
                ⌘/Ctrl + Enter で保存 · Esc で閉じる
              </span>
            </div>
            <form
              ref={formRef}
              action={formAction}
              className="flex flex-col gap-4 p-5"
            >
              <textarea
                ref={textareaRef}
                name="body"
                rows={5}
                required
                placeholder="思いついたことをそのまま記録..."
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter"
                  ) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="w-full resize-none bg-transparent text-base leading-relaxed text-ink outline-none placeholder:text-pewter"
              />

              {state.error ? (
                <p className={errorTextClass}>{state.error}</p>
              ) : null}
              {state.success ? (
                <p className={successTextClass}>
                  保存しました。続けて記録できます。
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={ghostButtonClass}
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={primaryButtonClass}
                >
                  {pending ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
