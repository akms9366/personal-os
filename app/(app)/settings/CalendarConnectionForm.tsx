"use client";

import { useActionState } from "react";
import {
  connectCalendarAction,
  disconnectCalendarAction,
  type CalendarConnectionState,
} from "./actions";
import {
  dangerButtonClass,
  errorTextClass,
  inputClass,
  labelClass,
  metaClass,
  primaryButtonClass,
} from "@/components/ui/styles";

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
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm text-ink">
          <span aria-hidden className="size-2 rounded-full bg-sprout" />
          Google Calendar に接続済み
        </p>
        {lastSyncAt ? (
          <p className={metaClass}>最終同期: {formatTimestamp(lastSyncAt)}</p>
        ) : null}
        {lastSyncError ? (
          <p className={errorTextClass}>直近の同期エラー: {lastSyncError}</p>
        ) : null}
        {disconnectState.error ? (
          <p className={errorTextClass}>{disconnectState.error}</p>
        ) : null}
        <form action={disconnectAction}>
          <button
            type="submit"
            disabled={disconnectPending}
            className={`${dangerButtonClass} -ml-3`}
          >
            {disconnectPending ? "切断中..." : "切断"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={connectAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          Google Calendar の ICS 秘密URL
          <input
            id="icsUrl"
            name="icsUrl"
            type="url"
            placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
            className={`${inputClass} font-mono`}
          />
        </label>
        <p className="text-xs leading-relaxed text-fog">
          Google カレンダーの設定
          →「カレンダーの統合」→「非公開URL」から取得できます。読み取り専用です。
        </p>
      </div>

      {connectState.error ? (
        <p className={errorTextClass}>{connectState.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={connectPending}
        className={`${primaryButtonClass} self-start`}
      >
        {connectPending ? "確認中..." : "接続"}
      </button>
    </form>
  );
}
