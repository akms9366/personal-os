import { describe, expect, it } from "vitest";
import {
  composeMemoText,
  extractHashtags,
  parseMemoText,
  tokenizeMemoText,
} from "./memo";

describe("parseMemoText", () => {
  it("splits the first line into title and the rest into body", () => {
    expect(
      parseMemoText("  気になる本 #本\n\n来月読む https://example.com/a  "),
    ).toEqual({
      title: "気になる本 #本",
      body: "来月読む https://example.com/a",
      url: "https://example.com/a",
      hashtags: ["本"],
    });
  });

  it("returns null for blank text and a null body for one line", () => {
    expect(parseMemoText(" \n ")).toBeNull();
    expect(parseMemoText("一行だけ")?.body).toBeNull();
  });
});

describe("extractHashtags", () => {
  it("picks tags after whitespace, stops at punctuation, and dedupes", () => {
    expect(extractHashtags("#本 と #映画。#本\n#旅行、楽しみ")).toEqual([
      "本",
      "映画",
      "旅行",
    ]);
  });

  it("ignores # inside words and URL anchors", () => {
    expect(extractHashtags("C#言語 https://x.com/p#top")).toEqual([]);
  });
});

describe("composeMemoText", () => {
  it("round-trips with parseMemoText", () => {
    const text = "タイトル\n本文1\n本文2";
    const parsed = parseMemoText(text)!;
    expect(composeMemoText(parsed)).toBe(text);
  });

  it("appends a legacy URL that is not in the text", () => {
    expect(
      composeMemoText({ title: "店", body: null, url: "https://a.example" }),
    ).toBe("店\nhttps://a.example");
  });
});

describe("tokenizeMemoText", () => {
  it("separates text, urls and tags", () => {
    expect(tokenizeMemoText("見る #映画 https://a.example/x#y です")).toEqual([
      { type: "text", value: "見る " },
      { type: "tag", value: "映画" },
      { type: "text", value: " " },
      { type: "url", value: "https://a.example/x#y" },
      { type: "text", value: " です" },
    ]);
  });
});
