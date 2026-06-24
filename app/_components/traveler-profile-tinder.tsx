"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignedUrls } from "../lib/use-signed-urls";
import { useLang, t } from "../lib/i18n";
import { useTranslate } from "../lib/use-translate";
import ReviewsSection from "./reviews-section";
import ProfileActionsMenu from "./profile-actions-menu";
import SuperLikeModal from "./superlike-modal";

export type TravelerProfileData = {
  user_id: string;
  name: string;
  emoji: string;
  avatar_path: string | null;
  country: string;
  bio: string;
  nationality: string | null;
  occupation: string | null;
  trip_period: string | null;
  birth_year: number | null;
  interests: string[];
  hobbies: string[];
  languages: string[];
  available_slots: string[];
  image_paths: string[];
};

type Props = {
  traveler: TravelerProfileData;
  currentUserId: string | null;
  isOwn: boolean;
  /** 閲覧者が local モードか。local→traveler は1日20件まで無料、超過は課金。 */
  viewerIsLocal: boolean;
  /** local の本日残り無料メッセージ枠。 */
  freeRemaining: number;
};

function ageFromBirthYear(y: number | null): number | null {
  if (!y) return null;
  return new Date().getFullYear() - y;
}

function formatSlotShort(s: string): string {
  const [day, time] = s.split(":");
  if (!day || !time) return s;
  const map: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const [start, end] = time.split("-");
  const fmt = (t: string) => (t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t);
  return `${map[day] ?? day} ${fmt(start ?? "")}-${fmt(end ?? "")}`;
}

export default function TravelerProfileTinder({ traveler, currentUserId, isOwn, viewerIsLocal, freeRemaining }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const [showSuperLike, setShowSuperLike] = useState(false);
  const [lang] = useLang();
  const tr = useTranslate();

  const allPaths = [
    ...(traveler.avatar_path ? [traveler.avatar_path] : []),
    ...traveler.image_paths,
  ];
  const signed = useSignedUrls(allPaths);

  const carouselImages: Array<{ src: string | null; path: string }> = [];
  if (traveler.avatar_path) carouselImages.push({ src: signed[traveler.avatar_path] ?? null, path: traveler.avatar_path });
  for (const p of traveler.image_paths) carouselImages.push({ src: signed[p] ?? null, path: p });
  const cur = carouselImages[imgIdx] ?? null;
  const total = carouselImages.length;
  const age = ageFromBirthYear(traveler.birth_year);
  const interestTags = [...new Set([...(traveler.hobbies ?? []), ...(traveler.interests ?? [])])];
  const isDemo = !traveler.user_id;

  // Translation target = SAME as current UI lang (EN user → translate INTO English)
  const translateTarget: "en" | "ja" = lang;

  // Use translated versions when toggle is on
  const showTranslated = tr.showing === "translated";
  const dispBio = showTranslated ? (tr.translations.bio ?? traveler.bio) : traveler.bio;
  const dispOccupation = showTranslated ? (tr.translations.occupation ?? traveler.occupation ?? "") : (traveler.occupation ?? "");
  const dispNationality = showTranslated ? (tr.translations.nationality ?? traveler.nationality ?? "") : (traveler.nationality ?? "");
  const dispCountry = showTranslated ? (tr.translations.country ?? traveler.country) : traveler.country;
  const dispTripPeriod = showTranslated ? (tr.translations.trip_period ?? traveler.trip_period ?? "") : (traveler.trip_period ?? "");

  const hasTranslatable = (traveler.bio || traveler.occupation || traveler.nationality || traveler.trip_period || traveler.country).trim().length > 0;

  async function onTranslateClick() {
    if (tr.showing === "translated") {
      tr.toggle();
      return;
    }
    if (Object.keys(tr.translations).length > 0) {
      tr.toggle();
      return;
    }
    await tr.translate(
      {
        bio: traveler.bio,
        occupation: traveler.occupation ?? "",
        nationality: traveler.nationality ?? "",
        country: traveler.country,
        trip_period: traveler.trip_period ?? "",
      },
      translateTarget,
    );
  }

  const translateBtnLabel = tr.loading
    ? t("translating", lang)
    : showTranslated
      ? t("translate_show_original", lang)
      : (translateTarget === "en" ? t("translate_btn_en", lang) : t("translate_btn_ja", lang));

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff8ec" }}>
      <div style={{ width: "100%", maxWidth: 390, minHeight: "100vh", margin: "0 auto", background: "#fff8ec", position: "relative", display: "flex", flexDirection: "column" }}>

        {/* HERO 写真 (340px → 下端をクリームへフェード, ガイド詳細と統一) */}
        <div style={{ position: "relative", height: 340, background: "#1a1008", overflow: "hidden", flex: "none" }}>
          {carouselImages.slice(1).map((im) => im.src && (
            <img key={`pf-${im.path}`} src={im.src} alt="" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} loading="eager" decoding="async" />
          ))}
          {cur?.src ? (
            <img src={cur.src} alt="" loading="eager" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110, background: "#ffefd5" }}>{traveler.emoji}</div>
          )}

          {total > 1 && (
            <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", gap: 4, zIndex: 3 }}>
              {carouselImages.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
                  <div style={{ height: "100%", background: "#fff", width: i <= imgIdx ? "100%" : "0%", borderRadius: 2 }} />
                </div>
              ))}
            </div>
          )}
          {total > 1 && (
            <>
              <div onClick={() => setImgIdx((i) => Math.max(0, i - 1))} style={{ position: "absolute", top: 40, left: 0, width: "40%", height: 220, zIndex: 2, cursor: "pointer" }} />
              <div onClick={() => setImgIdx((i) => Math.min(total - 1, i + 1))} style={{ position: "absolute", top: 40, right: 0, width: "40%", height: 220, zIndex: 2, cursor: "pointer" }} />
            </>
          )}

          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,8,5,.4) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 58%, #fff8ec 100%)", pointerEvents: "none", zIndex: 1 }} />

          <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", zIndex: 4 }}>
            <Link href="/" aria-label={lang === "ja" ? "戻る" : "Back"} style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#2b1d1a", textDecoration: "none", fontSize: 20 }}>←</Link>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isDemo && currentUserId && traveler.user_id !== currentUserId && (
                <ProfileActionsMenu targetUserId={traveler.user_id} targetName={traveler.name} />
              )}
              {isOwn && <Link href="/settings" aria-label={t("settings_aria", lang)} style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#2b1d1a", fontSize: 18, textDecoration: "none" }}>⚙</Link>}
            </div>
          </div>
        </div>

        {/* INFO (クリーム地) — position:relative + zIndex で写真レイヤーより前面に描画（ピル等が写真に隠れる paint-order バグ回避） */}
        <div style={{ padding: "0 22px", flex: 1, position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: -6 }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="font-display" style={{ margin: 0, fontWeight: 900, fontSize: 26, color: "#2b1d1a" }}>{traveler.name} <span style={{ fontSize: 19 }}>✈️</span></h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8a7a6c" }}>✈ From {dispCountry}{age != null ? ` · ${age}${lang === "ja" ? "歳" : ` ${t("yo", lang)}`}` : ""}</p>
            </div>
            <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "#fff", padding: "5px 12px", borderRadius: 20, background: "#2e8b57" }}>TRAVELER</span>
          </div>

          {(dispNationality || dispOccupation) && (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#8a7a6c" }}>
              {dispNationality && <span>🌐 {dispNationality}</span>}
              {dispNationality && dispOccupation && <span> · </span>}
              {dispOccupation && <span>💼 {dispOccupation}</span>}
            </p>
          )}
          {dispTripPeriod && (
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#8a7a6c" }}>📅 {dispTripPeriod}</p>
          )}

          {(interestTags.length > 0 || traveler.languages.length > 0) && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
              {[...interestTags, ...traveler.languages].slice(0, 8).map((tg) => (
                <span key={tg} style={{ background: "#fff", border: "1px solid #f0e3cf", borderRadius: 10, padding: "5px 11px", fontSize: 11.5, color: "#7a6a5c", fontWeight: 700 }}>{tg}</span>
              ))}
            </div>
          )}

          {dispBio && (
            <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.75, color: "#4f4239", whiteSpace: "pre-wrap" }}>{dispBio}</p>
          )}

          {!isOwn && hasTranslatable && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onTranslateClick} disabled={tr.loading} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: showTranslated ? "#2e8b57" : "#fff", border: showTranslated ? "1.5px solid #2e8b57" : "1px solid #f0e3cf", borderRadius: 16, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, color: showTranslated ? "#fff" : "#2b1d1a", cursor: tr.loading ? "wait" : "pointer", fontFamily: "inherit", opacity: tr.loading ? 0.7 : 1 }}>
                {translateBtnLabel}
              </button>
            </div>
          )}
          {tr.err && <div style={{ marginTop: 4, fontSize: 10, color: "#ad001c", textAlign: "right", fontWeight: 700 }}>{tr.err}</div>}

          {interestTags.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>{t("hobbies_section", lang)}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {interestTags.map((h) => (<span key={h} style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 14, padding: "8px 13px", fontSize: 12.5, color: "#5a4d43", fontWeight: 700 }}>{h}</span>))}
              </div>
            </div>
          )}

          {traveler.available_slots.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>{t("available_section", lang)}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {traveler.available_slots.slice(0, 12).map((sl) => (<span key={sl} style={{ background: "#e8f4ec", border: "1px solid #cdebd9", borderRadius: 14, padding: "6px 12px", fontSize: 11.5, color: "#2e8b57", fontWeight: 700 }}>{formatSlotShort(sl)}</span>))}
              </div>
            </div>
          )}

          {traveler.user_id && (
            <div style={{ marginTop: 22, marginBottom: isOwn ? 0 : 16 }}>
              <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>⭐ {t("reviews_tab", lang)}</h2>
              <ReviewsSection reviewedUserId={traveler.user_id} lang={lang} />
            </div>
          )}

          {isOwn && (
            <div style={{ margin: "22px 0 80px", display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/travelers/edit" style={{ display: "block", width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                {t("edit_traveler_profile", lang)}
              </Link>
              <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>{t("this_is_your_profile", lang)}</div>
            </div>
          )}
        </div>

        {!isOwn && (
          <>
            <div style={{ position: "sticky", bottom: 0, background: "rgba(255,248,236,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #f0d9b5", padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", marginTop: "auto" }}>
              {isDemo ? (
                <button disabled style={{ flex: 1, background: "#bbb", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, cursor: "not-allowed", fontFamily: "inherit" }}>
                  {t("demo_guide_no_msg", lang)}
                </button>
              ) : !currentUserId ? (
                <Link href={`/login?next=/travelers/${traveler.user_id}`} style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  {t("login_to_message", lang)}
                </Link>
              ) : viewerIsLocal && freeRemaining <= 0 ? (
                <div style={{ flex: 1 }}>
                  <button onClick={() => setShowSuperLike(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", cursor: "pointer", boxSizing: "border-box", fontFamily: "inherit", boxShadow: "0 10px 22px -8px rgba(173,0,28,.6)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.1}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {lang === "ja" ? "¥300で今すぐ送る（リクエスト免除）" : "Pay ¥300 — message now"}
                  </button>
                  <div style={{ fontSize: 10.5, color: "#9a8a7c", fontWeight: 700, textAlign: "center", marginTop: 5 }}>{lang === "ja" ? "本日の無料メッセージ枠（20件）を使い切りました" : "Daily free quota (20) used up"}</div>
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  <Link href={`/chat-request/u/${traveler.user_id}/new?kind=simple`} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box", boxShadow: "0 10px 22px -8px rgba(173,0,28,.6)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.1}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {lang === "ja" ? `${traveler.name}さんにメッセージを送る` : `Message ${traveler.name}`}
                  </Link>
                  {viewerIsLocal && <div style={{ fontSize: 10.5, color: "#9a8a7c", fontWeight: 700, textAlign: "center", marginTop: 5 }}>{lang === "ja" ? `本日の無料メッセージ 残り ${freeRemaining}/20` : `Free messages left today: ${freeRemaining}/20`}</div>}
                </div>
              )}
            </div>
            {viewerIsLocal && showSuperLike && (
              <SuperLikeModal
                travelerUserId={traveler.user_id}
                travelerName={traveler.name}
                travelerEmoji={traveler.emoji}
                onClose={() => setShowSuperLike(false)}
                onUnlocked={() => { window.location.href = `/?chat=${traveler.user_id}`; }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
