"use client";

import { useActionState } from "react";
import {
  connectCalendarAction,
  disconnectCalendarAction,
  type CalendarConnectionState,
} from "./actions";

const initialState: CalendarConnectionState = {};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function CalendarConnectionForm({
  connected,
  lastSyncAt,
  lastSyncError,
}: {
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}) {
  const [connectState, connectAction, connectPending] = useActionState(
    connectCalendarAction,
    initialState,
  );
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectCalendarAction,
    initialState,
  );

  if (connected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          状態: <span className="font-medium text-emerald-600 dark:text-emerald-400">接続済み</span>
        </p>
        {lastSyncAt ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            最終同期: {formatTimestamp(lastSyncAt)}
          </p>
        ) : null}
        {lastSyncError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            直近の同期エラー: {lastSyncError}
          </p>
        ) : null}
        {disconnectState.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {disconnectState.error}
          </p>
        ) : null}
        <form action={disconnectAction}>
          <button
            type="submit"
            disabled={disconnectPending}
            className="self-start rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {disconnectPending ? "切断中..." : "切断"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={connectAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="icsUrl"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Google Calendar の ICS 秘密URL
        </label>
        <input
          id="icsUrl"
          name="icsUrl"
          type="url"
          placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Google カレンダーの設定 →「カレンダーの統合」→「非公開URL」から取得できます。読み取り専用です。
        </p>
      </div>

      {connectState.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {connectState.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={connectPending}
        className="self-start rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {connectPending ? "確認中..." : "接続"}
      </button>
    </form>
  );
}
