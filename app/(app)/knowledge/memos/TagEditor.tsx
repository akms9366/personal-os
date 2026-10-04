"use client";

import { useState, type KeyboardEvent } from "react";
import { inputClass } from "@/components/ui/styles";

/// タグ入力。Enter / カンマで追加、× で外す。既存タグはタップで付け外しできる。
/// 値は hidden input "tags"（改行区切り）としてフォームに載る。
export function TagEditor({
  defaultTags,
  suggestions,
}: {
  defaultTags: string[];
  suggestions: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim().replace(/^#+/, "").trim();
    if (name.length > 0 && !tags.includes(name)) {
      setTags([...tags, name]);
    }
    setDraft("");
  }

  function toggle(name: string) {
    setTags(
      tags.includes(name)
        ? tags.filter((tag) => tag !== name)
        : [...tags, name],
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // IME 変換確定の Enter ではタグを確定しない。
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  const unusedSuggestions = suggestions.filter((name) => !tags.includes(name));

  return (
    <div className="flex flex-col gap-2">
      {/* 入力途中（未確定）の文字もタグとして送る */}
      <input type="hidden" name="tags" value={[...tags, draft].join("\n")} />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-zinc-200 py-0.5 pr-1 pl-2.5 text-xs text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
          >
            #{tag}
            <button
              type="button"
              onClick={() => toggle(tag)}
              aria-label={`${tag} を外す`}
              className="rounded-full px-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder="タグを入力して Enter"
        aria-label="タグ"
        className={inputClass}
      />
      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              +#{name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
