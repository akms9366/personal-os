"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveQuickCapture, type QuickCaptureState } from "@/lib/capture/actions";

const initialState: QuickCaptureState = {};

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

// Quick Capture（横断能力）。設計参照: 11 §5「入力先の分類を強制せず、原情報と時点を保つ」。
// 5 Space の主タブには含めず、どの画面からも同じフローティングボタン／ショートカット（"c"）で開く。
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        className="fixed right-4 bottom-20 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg md:right-6 md:bottom-6 dark:bg-zinc-100 dark:text-zinc-900"
      >
        +
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Capture"
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 p-4 pt-24 sm:items-center sm:pt-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-[var(--background)] p-4 shadow-xl">
            <form ref={formRef} action={formAction} className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                name="body"
                rows={4}
                required
                placeholder="思いついたことをそのまま記録..."
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
              />

              {state.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </p>
              ) : null}
              {state.success ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  保存しました。続けて記録できます。
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
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
