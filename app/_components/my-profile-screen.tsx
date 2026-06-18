"use client";

import Link from "next/link";
import { signout } from "../actions/auth";
import { t, type Lang } from "../lib/i18n";
import StripeOnboardButton from "./stripe-onboard-button";

type OwnGuide = {
  id: string;
  name: string;
  emoji: string;
  avatarPath: string | null;
  uni: string;
  mode?: "free" | "paid";
  stripeOnboarded?: boolean;
} | null;

type TravelerProfile = {
  name: string;
  country: string;
  interests: string[];
  bio: string;
  image_paths: string[];
} | null;

type Props = {
  ownGuide: OwnGuide;
  openGuideProfile: (guideId: string | undefined) => void;
  avatarUrls: Record<string, string>;
  travelerProfile: TravelerProfile;
  travelerImageUrls: Record<string, string>;
  setLightboxUrl: (url: string | null) => void;
  userEmail: string | null;
  adminEmails: string[];
  appMode: "local" | "traveler" | null;
  lang: Lang;
};

export default function MyProfileScreen({
  ownGuide,
  openGuideProfile,
  avatarUrls,
  travelerProfile,
  travelerImageUrls,
  setLightboxUrl,
  userEmail,
  adminEmails,
  appMode,
  lang,
}: Props) {
  return (
    <div className="screen-enter" style={{ minHeight: "100vh" }}>
      <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 9 }}>
        <div style={{ width: 36 }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>{t("my_profile", lang)}</div>
        <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
      </div>
      <div style={{ padding: "28px 20px 16px", textAlign: "center" }}>
        <div
          onClick={() => ownGuide && openGuideProfile(ownGuide.id)}
          style={{ width: 90, height: 90, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 14px", border: "3px solid #ad001c", cursor: ownGuide ? "pointer" : "default", overflow: "hidden" }}
          title={ownGuide ? t("open_own_guide_profile", lang) : undefined}
        >
          {ownGuide?.avatarPath && avatarUrls[ownGuide.avatarPath]
            ? <img src={avatarUrls[ownGuide.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (ownGuide?.emoji ?? "😊")}
        </div>
        {travelerProfile ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{travelerProfile.name}</div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>
              {t("traveler_from", lang)} {travelerProfile.country}
              {ownGuide && <span style={{ marginLeft: 6, color: "#ad001c" }}>+ {ownGuide.name}</span>}
            </div>
          </>
        ) : ownGuide ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{ownGuide.name}</div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>Guide · {ownGuide.uni}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: "#8a7560" }}>{t("profile_unregistered", lang)}</div>
            <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600 }}>{t("profile_unregistered_hint", lang)}</div>
          </>
        )}
      </div>

      {travelerProfile && travelerProfile.image_paths.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -20px", padding: "0 20px" }}>
            {travelerProfile.image_paths.map((p) => (
              travelerImageUrls[p] ? (
                <img
                  key={p}
                  src={travelerImageUrls[p]}
                  alt=""
                  onClick={() => travelerImageUrls[p] && setLightboxUrl(travelerImageUrls[p])}
                  style={{ width: 320, height: 320, borderRadius: 16, border: "2px solid #e8c99a", flexShrink: 0, objectFit: "cover", scrollSnapAlign: "center", cursor: "pointer" }}
                />
              ) : (
                <div key={p} style={{ width: 320, height: 320, borderRadius: 16, border: "2px solid #e8c99a", flexShrink: 0, background: "#f0d9b5", animation: "pulse 1.4s ease-in-out infinite", scrollSnapAlign: "center" }} />
              )
            ))}
          </div>
        </div>
      )}

      {travelerProfile?.bio && (
        <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 16, margin: "0 20px 16px", fontSize: 13, color: "#555", lineHeight: 1.7, fontWeight: 600 }}>
          &ldquo;{travelerProfile.bio}&rdquo;
        </div>
      )}

      {travelerProfile && travelerProfile.interests.length > 0 && (
        <div style={{ padding: "0 20px", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, justifyContent: "center" }}>
          {travelerProfile.interests.map((t) => (
            <span key={t} style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#2e8b57", fontWeight: 700 }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {userEmail && (
        <div style={{ margin: "0 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>
          <Link href="/history" style={{ display: "block", width: "100%", background: "#fff", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
            {lang === "ja" ? "マッチ履歴" : "Match history"}
          </Link>
          <Link href="/bookings" style={{ display: "block", width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
            {t("my_bookings", lang)}
          </Link>
          {adminEmails.includes(userEmail.toLowerCase()) && (
            <Link href="/admin/analytics" style={{ display: "block", width: "100%", background: "#1a1008", color: "#fff", border: "none", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t("admin_analytics", lang)}
            </Link>
          )}
          {appMode === "local" && (ownGuide ? (
            <>
            <Link href={`/guides/${ownGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t("edit_guide_profile", lang)}
            </Link>
            {ownGuide.mode === "paid" && !ownGuide.stripeOnboarded && (
              <>
                <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, textAlign: "center", padding: "4px 0" }}>{t("stripe_setup_pending", lang)}</div>
                <StripeOnboardButton label={t("stripe_setup_btn", lang)} />
              </>
            )}
            {ownGuide.mode === "paid" && ownGuide.stripeOnboarded && (
              <div style={{ fontSize: 11, color: "#2e8b57", fontWeight: 800, textAlign: "center", padding: "4px 0" }}>{t("stripe_setup_done", lang)}</div>
            )}
            </>
          ) : (
            <Link href="/guides/new" style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t("register_as_guide", lang)}
            </Link>
          ))}
          {appMode !== "local" && (
            travelerProfile ? (
              <Link href="/travelers/edit" style={{ display: "block", width: "100%", background: "#fff", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                {t("edit_traveler_profile", lang)}
              </Link>
            ) : (
              <Link href="/travelers/new" style={{ display: "block", width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                {t("register_as_traveler", lang)}
              </Link>
            )
          )}
          <form action={signout}>
            <button type="submit" style={{ width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
              {t("settings_logout", lang)}
            </button>
          </form>
        </div>
      )}
      <div style={{ height: 100 }} />
    {/* NomaDomo フッターロゴ */}
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px 30px", opacity: 0.75 }}>
      <img src="/logo-camel.png" alt="" style={{ height: 70, width: "auto", display: "block" }} />
    </div>
    </div>
  );
}
