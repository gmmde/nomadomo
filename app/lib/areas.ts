// 共通エリア定数: 都道府県番号付き、言語に応じた sort 順
// value (English) を DB に保存し、display は lang に応じて切り替え

import type { Lang } from "./i18n";

export type AreaItem = {
  value: string;   // DB 保存値 (English)
  ja: string;      // 日本語表示
  code: number;    // 都道府県番号 (sort 用、Other は最後)
};

export const AREAS: AreaItem[] = [
  { value: "Sapporo",   ja: "札幌",   code: 1 },
  { value: "Sendai",    ja: "仙台",   code: 4 },
  { value: "Tokyo",     ja: "東京",   code: 13 },
  { value: "Kanagawa",  ja: "神奈川", code: 14 },
  { value: "Aichi",     ja: "愛知",   code: 23 },
  { value: "Kyoto",     ja: "京都",   code: 26 },
  { value: "Osaka",     ja: "大阪",   code: 27 },
  { value: "Kobe",      ja: "神戸",   code: 28 },
  { value: "Hiroshima", ja: "広島",   code: 34 },
  { value: "Fukuoka",   ja: "福岡",   code: 40 },
  { value: "Okinawa",   ja: "沖縄",   code: 47 },
  { value: "Other",     ja: "その他", code: 999 },
];

/** 言語に応じた sort 済みリスト + 表示ラベル */
export function getSortedAreas(lang: Lang): Array<{ value: string; label: string }> {
  const items = [...AREAS];
  if (lang === "ja") {
    items.sort((a, b) => a.code - b.code);
  } else {
    items.sort((a, b) => {
      // Other は最後
      if (a.value === "Other") return 1;
      if (b.value === "Other") return -1;
      return a.value.localeCompare(b.value);
    });
  }
  return items.map((it) => ({
    value: it.value,
    label: lang === "ja" ? it.ja : it.value,
  }));
}

export function areaLabel(value: string, lang: Lang): string {
  const item = AREAS.find((a) => a.value === value);
  if (!item) return value;
  return lang === "ja" ? item.ja : item.value;
}
