import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("prefixes a BOM and joins rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    expect(toCsv(["v"], [['say "hi", ok'], ["line1\nline2"]])).toBe(
      '﻿v\r\n"say ""hi"", ok"\r\n"line1\nline2"\r\n',
    );
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("﻿a,b\r\n,\r\n");
  });
});
