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
  onContactSupport: () => void;
  supportPending: boolean;
  metCount: number;
  savedCount: number;
  reviewCount: number;
  recentLocals: Array<{ peerId: string; name: string; emoji: string; guideId?: string }>;
  guides: Array<{ id: string; avatarPath: string | null }>;
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
  onContactSupport,
  supportPending,
  metCount,
  savedCount,
  reviewCount,
  recentLocals,
  guides,
}: Props) {
  // 未ログイン: サインイン/ログイン CTA だけ表示する別画面
  if (!userEmail) {
    return (
      <div className="screen-enter" style={{ minHeight: "100vh", background: "#fff8ec" }}>
        <div style={{ background: "#fffaf0f2", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 9, borderBottom: "1px solid #f0e2cc" }}>
          <div style={{ width: 36 }} />
          <div className="font-display" style={{ fontSize: 16, fontWeight: 900, color: "#1a1008", flex: 1, textAlign: "center" }}>{t("my_profile", lang)}</div>
          <div style={{ width: 36 }} />
        </div>
        <div style={{ padding: "48px 24px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 56 }}>👋</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1008" }}>
            {lang === "ja" ? "サインインしてはじめよう" : "Sign in to get started"}
          </div>
          <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600, lineHeight: 1.7, maxWidth: 320 }}>
            {lang === "ja"
              ? "NomaDomo を使うにはアカウントが必要よ。ログインまたは新規登録してね。"
              : "Sign in to chat with locals, send message requests, and save profiles."}
          </div>
          <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <Link href="/login" style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {lang === "ja" ? "ログイン" : "Log in"}
            </Link>
            <Link href="/signup" style={{ display: "block", width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {lang === "ja" ? "新規登録" : "Sign up"}
            </Link>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px 30px", opacity: 0.6 }}>
          <img src="/logo-camel.png" alt="" style={{ height: 60, width: "auto", display: "block" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", background: "#fff8ec" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 22px 0" }}>
        <Link href="/settings" aria-label={lang === "ja" ? "設定" : "Settings"} style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "1px solid #f0e3cf", textDecoration: "none", boxShadow: "0 2px 8px rgba(120,60,20,.06)" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2b1d1a" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
        </Link>
      </div>
      <div style={{ padding: "8px 20px 16px", textAlign: "center" }}>
        <div
          onClick={() => ownGuide && openGuideProfile(ownGuide.id)}
          style={{ width: 96, height: 96, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, margin: "0 auto 12px", border: "3px solid #fff", boxShadow: "0 10px 24px -10px rgba(120,50,20,.4)", cursor: ownGuide ? "pointer" : "default", overflow: "hidden" }}
          title={ownGuide ? t("open_own_guide_profile", lang) : undefined}
        >
          {ownGuide?.avatarPath && avatarUrls[ownGuide.avatarPath]
            ? <img loading="lazy" decoding="async" src={avatarUrls[ownGuide.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (ownGuide?.emoji ?? "😊")}
        </div>
        {travelerProfile ? (
          <>
            <div className="font-display" style={{ fontSize: 23, fontWeight: 900, marginBottom: 4, color: "#2b1d1a" }}>{travelerProfile.name}</div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>
              {t("traveler_from", lang)} {travelerProfile.country}
              {ownGuide && <span style={{ marginLeft: 6, color: "#ad001c" }}>+ {ownGuide.name}</span>}
            </div>
          </>
        ) : ownGuide ? (
          <>
            <div className="font-display" style={{ fontSize: 23, fontWeight: 900, marginBottom: 4, color: "#2b1d1a" }}>{ownGuide.name}</div>
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

      {/* stats (mock): met / saved / reviews */}
      <div style={{ display: "flex", margin: "18px 22px 0", background: "#fff", border: "1px solid #f3e8d6", borderRadius: 20, padding: "16px 0", boxShadow: "0 8px 20px -14px rgba(120,50,20,.3)" }}>
        {[{ num: metCount, label: lang === "ja" ? "出会った人" : "Met" }, { num: savedCount, label: lang === "ja" ? "保存" : "Saved" }, { num: reviewCount, label: lang === "ja" ? "レビュー" : "Reviews" }].map((st, i) => (
          <div key={st.label} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #f3e8d6" : "none" }}>
            <p className="font-display" style={{ margin: 0, fontWeight: 900, fontSize: 21, color: "#ad001c" }}>{st.num}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9a8a7c", fontWeight: 600 }}>{st.label}</p>
          </div>
        ))}
      </div>

      {recentLocals.length > 0 && (
        <div style={{ padding: "20px 22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>{lang === "ja" ? "最近のローカル " : "Recent locals"}{lang === "ja" && <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>Recent locals</span>}</h2>
            <Link href="/history" style={{ fontSize: 12.5, fontWeight: 700, color: "#ad001c", textDecoration: "none" }}>{lang === "ja" ? "すべて見る →" : "See all →"}</Link>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
            {recentLocals.slice(0, 8).map((r) => {
              const pg = r.guideId ? guides.find((x) => x.id === r.guideId) : null;
              const av = pg?.avatarPath ? avatarUrls[pg.avatarPath] : null;
              return (
                <div key={r.peerId} onClick={() => r.guideId && openGuideProfile(r.guideId)} style={{ flex: "none", width: 86, textAlign: "center", cursor: r.guideId ? "pointer" : "default" }}>
                  <div style={{ width: 86, height: 86, borderRadius: 18, display: "grid", placeItems: "center", fontSize: 38, overflow: "hidden", ...(av ? { backgroundImage: `url("${av}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#ffefd5" }) }}>{!av && (r.emoji ?? "🧑")}</div>
                  <p className="font-display" style={{ margin: "7px 0 0", fontWeight: 700, fontSize: 12.5, color: "#2b1d1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {userEmail && (
        <div style={{ margin: "20px 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>
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
          {/* 開発者問い合わせは一番下 */}
          <button
            type="button"
            onClick={onContactSupport}
            disabled={supportPending}
            style={{ width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, cursor: supportPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: supportPending ? 0.6 : 1, marginTop: 8 }}
          >
            {supportPending ? "..." : t("settings_contact_support", lang)}
          </button>
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
