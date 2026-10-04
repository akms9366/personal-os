// CSV 出力（各データのエクスポート）。Excel（日本語環境）で文字化けしないよう UTF-8 BOM を付ける。

export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
