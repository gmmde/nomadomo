"use client";

import { useEffect, useState } from "react";

export type Lang = "ja" | "en";

type Dict = Record<string, { ja: string; en: string }>;

export const dict: Dict = {
  // nav
  nav_home: { ja: "ホーム", en: "Home" },
  nav_messages: { ja: "メッセージ", en: "Messages" },
  nav_saved: { ja: "保存", en: "Saved" },
  nav_profile: { ja: "プロフィール", en: "Profile" },
  // home topbar
  become_guide: { ja: "+ ガイドになる", en: "+ Become guide" },
  login: { ja: "ログイン", en: "Login" },
  // home hero
  hero_chip: { ja: "📍 京都, 日本", en: "📍 Kyoto, Japan" },
  hero_h1: { ja: "本物のローカルと出会う、観光ツアーじゃなく", en: "Meet a real local, not a tour guide" },
  // section
  available_now: { ja: "今すぐ予約可 ✨", en: "Available now ✨" },
  see_all: { ja: "全部見る →", en: "See all →" },
  loading: { ja: "読み込み中…", en: "Loading…" },
  no_guides: { ja: "ガイドが見つからない", en: "No guides found" },
  // settings page
  settings_title: { ja: "設定", en: "Settings" },
  settings_language: { ja: "言語", en: "Language" },
  settings_notifications: { ja: "通知", en: "Notifications" },
  settings_privacy: { ja: "プライバシー", en: "Privacy" },
  settings_account: { ja: "アカウント", en: "Account" },
  settings_about: { ja: "アプリについて", en: "About" },
  settings_email_new_msg: { ja: "新着メッセージのメール通知", en: "Email on new message" },
  settings_email_booking: { ja: "予約イベントのメール通知", en: "Email on booking updates" },
  settings_show_to_anon: { ja: "未ログインユーザーにも自分のプロフを見せる", en: "Show my profile to logged-out visitors" },
  settings_logout: { ja: "ログアウト", en: "Logout" },
  settings_delete_account: { ja: "アカウント削除 (危険)", en: "Delete account (danger)" },
  settings_save: { ja: "保存する", en: "Save" },
  settings_saved: { ja: "✅ 保存したわよ", en: "✅ Saved" },
  settings_about_text: {
    ja: "NomaDomo は京都の大学生ガイドと旅行者をマッチングするアプリよ。MVP 段階だから不具合あったら通報してね。",
    en: "NomaDomo matches Kyoto student guides with travelers. Still MVP — please report bugs.",
  },
  back_to_home: { ja: "ホームに戻る", en: "Back to home" },
};

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("ja");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("noma_lang")) as Lang | null;
    if (saved === "ja" || saved === "en") setLang(saved);
    // listen for cross-tab changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === "noma_lang" && (e.newValue === "ja" || e.newValue === "en")) setLang(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return [lang, (l) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("noma_lang", l);
      document.documentElement.lang = l;
    }
    setLang(l);
    // 同タブ内の他のリスナーにも通知
    window.dispatchEvent(new StorageEvent("storage", { key: "noma_lang", newValue: l }));
  }];
}

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key]?.[lang] ?? key;
}
