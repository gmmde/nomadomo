"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignedUrls } from "../lib/use-signed-urls";
import { useLang, t } from "../lib/i18n";
import { useTranslate } from "../lib/use-translate";

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

export default function TravelerProfileTinder({ traveler, currentUserId, isOwn }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
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
    <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5ead0" }}>
      <div style={{ width: "100%", maxWidth: 390, minHeight: "100vh", margin: "0 auto", background: "#f5ead0", position: "relative" }}>
        <div style={{ position: "relative", height: "70vh", minHeight: 480, background: "#1a1008", overflow: "hidden" }}>
          {cur?.src ? (
            <img src={cur.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, background: "#ffefd5" }}>
              {traveler.emoji}
            </div>
          )}

          {total > 1 && (
            <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4, zIndex: 3 }}>
              {carouselImages.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
                  <div style={{ height: "100%", background: "#fff", width: i <= imgIdx ? "100%" : "0%", borderRadius: 2 }} />
                </div>
              ))}
            </div>
          )}

          {total > 1 && (
            <>
              <div onClick={() => setImgIdx((i) => Math.max(0, i - 1))} style={{ position: "absolute", top: 30, left: 0, width: "40%", height: "calc(100% - 200px)", zIndex: 2, cursor: "pointer" }} />
              <div onClick={() => setImgIdx((i) => Math.min(total - 1, i + 1))} style={{ position: "absolute", top: 30, right: 0, width: "40%", height: "calc(100% - 200px)", zIndex: 2, cursor: "pointer" }} />
            </>
          )}

          <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 14px", zIndex: 4 }}>
            <Link href="/" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", textDecoration: "none", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>←</Link>
            <Link href="/settings" aria-label={t("settings_aria", lang)} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 18px 20px", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))", color: "#fff", zIndex: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{traveler.name}</span>
              <span style={{ fontSize: 18 }}>✈️</span>
              <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 10, background: "rgba(46,139,87,0.85)" }}>TRAVELER</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              ✈ From {dispCountry}
              {age != null && <span style={{ marginLeft: 8 }}>· {age} {t("yo", lang)}</span>}
            </div>
            {(dispNationality || dispOccupation) && (
              <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {dispNationality && <span>🌐 {dispNationality}</span>}
                {dispNationality && dispOccupation && <span> · </span>}
                {dispOccupation && <span>💼 {dispOccupation}</span>}
              </div>
            )}
            {dispTripPeriod && (
              <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                📅 {dispTripPeriod}
              </div>
            )}
            {dispBio && (
              <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {dispBio}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {[...interestTags, ...traveler.languages].slice(0, 6).map((tag) => (
                <span key={tag} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 6, padding: "2px 7px", fontSize: 10, color: "#fff", fontWeight: 700 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {!isOwn && hasTranslatable && (
          <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onTranslateClick}
              disabled={tr.loading}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, background: showTranslated ? "#2e8b57" : "#fff9f0", border: showTranslated ? "1.5px solid #2e8b57" : "1.5px solid #e8c99a", borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: showTranslated ? "#fff" : "#1a1008", cursor: tr.loading ? "wait" : "pointer", fontFamily: "inherit", opacity: tr.loading ? 0.7 : 1 }}
            >
              {translateBtnLabel}
            </button>
          </div>
        )}
        {tr.err && (
          <div style={{ padding: "4px 20px 0", fontSize: 10, color: "#ad001c", textAlign: "right", fontWeight: 700 }}>{tr.err}</div>
        )}

        <div style={{ padding: "10px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#1a1008", fontWeight: 800 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#2e8b57" }}>✈️</span>
            <span style={{ marginLeft: 6, color: "#8a7560" }}>Visiting Kyoto</span>
          </div>
          {traveler.languages.length > 0 && (
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>
              🗣 {traveler.languages.join(" / ")}
            </div>
          )}
        </div>

        {(interestTags.length > 0 || traveler.available_slots.length > 0) && (
          <div style={{ margin: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {interestTags.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>{t("hobbies_section", lang)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {interestTags.map((h) => (
                    <span key={h} style={{ background: "#ffefd5", border: "1.5px solid #ad001c", borderRadius: 14, padding: "4px 10px", fontSize: 11, color: "#ad001c", fontWeight: 700 }}>{h}</span>
                  ))}
                </div>
              </div>
            )}
            {traveler.available_slots.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>{t("available_section", lang)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {traveler.available_slots.slice(0, 12).map((s) => (
                    <span key={s} style={{ background: "#e6f5ee", border: "1.5px solid #2e8b57", borderRadius: 14, padding: "4px 10px", fontSize: 11, color: "#2e8b57", fontWeight: 700 }}>{formatSlotShort(s)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isOwn ? (
          <div style={{ margin: "0 20px 80px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/travelers/edit" style={{ display: "block", width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t("edit_traveler_profile", lang)}
            </Link>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>{t("this_is_your_profile", lang)}</div>
          </div>
        ) : (
          <>
            <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "2px solid #f0d9b5", padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", marginTop: "auto" }}>
              {isDemo ? (
                <button disabled style={{ flex: 1, background: "#bbb", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, cursor: "not-allowed", fontFamily: "inherit" }}>
                  {t("demo_guide_no_msg", lang)}
                </button>
              ) : !currentUserId ? (
                <Link href={`/login?next=/travelers/${traveler.user_id}`} style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  {t("login_to_message", lang)}
                </Link>
              ) : (
                <Link href={`/chat-request/u/${traveler.user_id}/new?kind=simple`} style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  {t("send_btn", lang)}
                </Link>
              )}
            </div>
            {currentUserId && !isDemo && (
              <div style={{ textAlign: "center", fontSize: 10, color: "#8a7560", fontWeight: 700, padding: "8px 20px 16px" }}>
                <Link href={`/report/${traveler.user_id}`} style={{ color: "#8a7560", textDecoration: "underline" }}>{t("report_link", lang)}</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
