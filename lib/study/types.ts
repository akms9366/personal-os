// Study（資格試験ドリル）の型。問題集はコードで持ち、解答記録だけを DB に残す。

/// 選択肢のラベル（情報処理技術者試験の表記）。
export const CHOICE_LABELS = ["ア", "イ", "ウ", "エ"] as const;

export interface StudyCategory {
  id: string;
  label: string;
  /// 分野の範囲（画面の補足に使う短い説明）。
  scope: string;
  /// この分野が弱いときに何を学ぶか（分析の提案文に使う）。
  studyHint: string;
}

export interface StudyQuestion {
  /// 問題集内で一意かつ不変の ID（解答記録が参照する。採番し直さないこと）。
  id: string;
  category: string;
  /// 細かい論点（苦手トピックの集計単位）。
  topic: string;
  stem: string;
  /// 選択肢（ア〜エの4つ）。
  choices: readonly [string, string, string, string];
  /// 正答の番号（0 始まり）。
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  /// 選択肢の並びに意味がある（数値の昇順など）ため、出題時に並べ替えない。
  keepOrder?: boolean;
}

export interface StudyExam {
  id: string;
  name: string;
  shortName: string;
  /// 試験の概要（画面に出す一言）。
  summary: string;
  categories: readonly StudyCategory[];
  questions: readonly StudyQuestion[];
}
