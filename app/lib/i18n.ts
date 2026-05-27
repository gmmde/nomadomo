"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "ja";

type Dict = Record<string, { en: string; ja: string }>;

export const dict: Dict = {
  // nav
  nav_home: { en: "Home", ja: "ホーム" },
  nav_messages: { en: "Messages", ja: "メッセージ" },
  nav_saved: { en: "Saved", ja: "保存" },
  nav_profile: { en: "Profile", ja: "プロフィール" },
  nav_requests: { en: "Requests", ja: "リクエスト" },

  // home / topbar
  login: { en: "Login", ja: "ログイン" },
  available_now: { en: "Available now", ja: "今すぐ予約可" },
  see_all: { en: "See all →", ja: "すべて見る →" },
  loading: { en: "Loading…", ja: "読み込み中…" },
  no_guides: { en: "No guides found", ja: "ガイドが見つからない" },
  travelers_in_kyoto: { en: "Travelers in Kyoto", ja: "京都の旅行者" },
  search_placeholder: { en: "Temples, ramen, nightlife…", ja: "Temples, ramen, nightlife…" },
  search_button: { en: "Search", ja: "検索" },

  // mode picker
  mode_picker_title: { en: "How are you using NomaDomo?", ja: "どのモードで使う？" },
  traveler_mode: { en: "Traveler", ja: "Traveler モード" },
  traveler_mode_desc: { en: "Meet local Kyoto guides and mates as a traveler.", ja: "旅行者として地元のガイドや mate と出会う。" },
  local_mode: { en: "Local", ja: "Local モード" },
  local_mode_desc: { en: "Meet travelers as a guide or mate.", ja: "ガイド / mate として旅行者と出会う。" },
  mode_picker_hint: { en: "You can switch later from settings ⚙️", ja: "⚙️ 設定からあとで切り替えられるわよ" },

  // profile / message
  message_request: { en: "Send message request", ja: "メッセージリクエスト" },
  message_label: { en: "Message", ja: "メッセージ" },
  follow: { en: "+ Follow", ja: "+ Follow" },
  following: { en: "✓ Following", ja: "✓ Following" },
  followers: { en: "followers", ja: "followers" },
  tours: { en: "Tours", ja: "Tours" },
  rating: { en: "Rating", ja: "Rating" },
  languages: { en: "Languages", ja: "Languages" },
  starting_from: { en: "Starting from", ja: "Starting from" },
  hobbies_label: { en: "Hobbies", ja: "趣味" },
  available_label: { en: "Available", ja: "会える時間" },
  free_mate: { en: "Free mate — no charge", ja: "無料で会える mate よ" },

  // chat request form
  chat_req_form_title: { en: "Message Request", ja: "メッセージリクエスト" },
  chat_req_explainer_full: {
    en: "DMs aren't open by default. Tell them when, where, and why you'd like to meet — once the local accepts, you can chat.",
    ja: "いきなり DM は送れない仕組みよ。「いつ・どこで・なぜ会いたいか」をリクエストすると、ガイドが承認したらチャットが開けるわ。",
  },
  chat_req_explainer_simple: {
    en: "DMs aren't open by default. Send a short intro message — once they accept, you can chat.",
    ja: "いきなり DM は送れない仕組みよ。最初の挨拶メッセージを書いて、相手が承認したらチャットが開けるわ。",
  },
  preferred_date: { en: "Preferred date & time", ja: "希望日時" },
  preferred_place: { en: "Where would you like to go?", ja: "行きたい場所" },
  send_request: { en: "Send request", ja: "リクエストを送る" },

  // settings page
  settings_title: { en: "Settings", ja: "設定" },
  settings_language: { en: "Language", ja: "言語" },
  settings_app_mode: { en: "App mode", ja: "利用モード" },
  settings_notifications: { en: "Notifications", ja: "通知" },
  settings_privacy: { en: "Privacy", ja: "プライバシー" },
  settings_account: { en: "Account", ja: "アカウント" },
  settings_about: { en: "About", ja: "アプリについて" },
  settings_email_new_msg: { en: "Email me on new messages", ja: "新着メッセージのメール通知" },
  settings_email_booking: { en: "Email me on booking updates", ja: "予約イベントのメール通知" },
  settings_show_to_anon: { en: "Show my profile to logged-out visitors", ja: "未ログインユーザーにも自分のプロフを見せる" },
  settings_logout: { en: "Logout", ja: "ログアウト" },
  settings_save: { en: "Save", ja: "保存する" },
  settings_saved: { en: "✅ Saved", ja: "✅ 保存したわよ" },
  settings_about_text: {
    en: "NomaDomo matches Kyoto student guides with travelers. Still in MVP — please send bugs and feedback.",
    ja: "NomaDomo は京都の大学生ガイドと旅行者をマッチングするアプリよ。MVP 段階だから不具合あったら通報してね。",
  },
  reset_app_mode: { en: "🔄 Re-show mode picker", ja: "🔄 モード選択画面を再表示する" },
  reset_app_mode_confirm: { en: "Reset mode choice — pick again next time?", ja: "モード選択を初期化して、次回ログイン時にもう一度選び直す？" },
  back_to_home: { en: "Back to home", ja: "ホームに戻る" },
};

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("noma_lang")) as Lang | null;
    if (saved === "en" || saved === "ja") setLang(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "noma_lang" && (e.newValue === "en" || e.newValue === "ja")) setLang(e.newValue);
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
    window.dispatchEvent(new StorageEvent("storage", { key: "noma_lang", newValue: l }));
  }];
}

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key]?.[lang] ?? key;
}
