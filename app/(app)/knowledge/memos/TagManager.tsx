"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  deleteTagAction,
  renameTagAction,
  type MemoActionState,
} from "./actions";
import {
  dangerButtonClass,
  errorTextClass,
  ghostButtonClass,
  inputClass,
  metaClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface TagView {
  id: string;
  name: string;
  count: number;
}

const initialState: MemoActionState = {};

function TagRow({ tag }: { tag: TagView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prevState: MemoActionState, formData: FormData) => {
      const result = await renameTagAction(prevState, formData);
      if (result.success) {
        setEditing(false);
      }
      return result;
    },
    initialState,
  );
  const [deleting, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `タグ「${tag.name}」を削除しますか？（メモは残り、タグだけ外れます）`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteTagAction(tag.id);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-1 py-2.5">
      {editing ? (
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="tagId" value={tag.id} />
          <input
            name="name"
            defaultValue={tag.name}
            required
            aria-label="タグ名"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className={secondaryButtonClass}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={secondaryButtonClass}
          >
            戻る
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink">
            #{tag.name}
            <span className={`ml-2 ${metaClass}`}>{tag.count}件</span>
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={ghostButtonClass}
            >
              名前変更
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={dangerButtonClass}
            >
              削除
            </button>
          </div>
        </div>
      )}
      {state.error ? <p className={errorTextClass}>{state.error}</p> : null}
    </li>
  );
}

/// タグの一覧・名前変更・削除。同名のタグへ名前変更すると統合される。
export function TagManager({ tags }: { tags: TagView[] }) {
  if (tags.length === 0) {
    return <p className="text-sm text-fog">タグはまだありません。</p>;
  }
  return (
    <ul className="divide-y divide-dove/60">
      {tags.map((tag) => (
        <TagRow key={tag.id} tag={tag} />
      ))}
    </ul>
  );
}
