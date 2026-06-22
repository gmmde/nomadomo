"use client";

import BackButton from "@/app/lib/back-button";
import { useActionState, useState } from "react";
import { createTraveler, type TravelerFormState } from "@/app/actions/travelers";
import ImageUploader from "@/app/lib/image-uploader";
import { useLang, t } from "@/app/lib/i18n";
import EnglishNotice from "@/app/_components/english-notice";
import AvatarPicker from "@/app/lib/avatar-picker";
import HobbiesTags from "@/app/lib/hobbies-tags";
import AvailableSlots from "@/app/lib/available-slots";

const GENDER_OPTIONS: Array<{ value: string; labelKey: "form_gender_male" | "form_gender_female" | "form_gender_nonbinary" | "form_gender_other" }> = [
  { value: "male", labelKey: "form_gender_male" as const },
  { value: "female", labelKey: "form_gender_female" as const },
  { value: "non-binary", labelKey: "form_gender_nonbinary" as const },
  { value: "other", labelKey: "form_gender_other" as const },
];

const INTEREST_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"] as const;

const COUNTRY_SUGGESTIONS = [
  "Japan", "United States", "United Kingdom", "China", "South Korea",
  "Taiwan", "Singapore", "Australia", "Canada", "France", "Germany",
  "Italy", "Spain", "Netherlands", "Sweden", "Brazil", "Mexico",
  "India", "Thailand", "Indonesia", "Vietnam", "Philippines",
] as const;

const wrapStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh" };
const headerStyle: React.CSSProperties = { background: "transparent", padding: "16px 18px 6px", display: "flex", alignItems: "center", gap: 12 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#fff8ec", border: "1px solid #ecdcc4", borderRadius: 13, padding: "13px 15px", fontSize: 14.5, fontWeight: 600, color: "#2b1d1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const errStyle: React.CSSProperties = { fontSize: 11, color: "#ad001c", fontWeight: 800, marginTop: 4 };
const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#2e8b57" : "#fff",
  border: `2px solid ${active ? "#2e8b57" : "#f3e8d6"}`,
  color: active ? "#fff" : "#8a7560",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const btnPrimary: React.CSSProperties = { width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 14, padding: 15, fontSize: 15.5, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 22px -12px rgba(46,139,87,.7)" };

type Prefill = {
  name: string;
  bio: string;
  emoji: string | null;
  avatar_path: string | null;
  gender: string | null;
  gender_other: string | null;
  birth_year: number | null;
  nationality: string | null;
  occupation: string | null;
  hobbies: string[];
  available_slots: string[];
  languages: string[];
  image_paths: string[];
};

export default function TravelerForm({ userEmail, prefill, lockedDisplayName }: { userEmail: string; prefill?: Prefill | null; lockedDisplayName?: string | null }) {
  const [state, action, pending] = useActionState<TravelerFormState, FormData>(createTraveler, undefined);
  const [interests, setInterests] = useState<string[]>([]);
  const [name, setName] = useState(prefill?.name ?? "");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState(prefill?.bio ?? "");
  const [gender, setGender] = useState(prefill?.gender ?? "");
  const [genderOther, setGenderOther] = useState(prefill?.gender_other ?? "");
  const [birthYear, setBirthYear] = useState(prefill?.birth_year != null ? String(prefill.birth_year) : "");
  const [nationality, setNationality] = useState(prefill?.nationality ?? "");
  const [occupation, setOccupation] = useState(prefill?.occupation ?? "");
  const [tripPeriod, setTripPeriod] = useState("");
  const [lang] = useLang();
  function toggle(value: string) {
    setInterests((s) => s.includes(value) ? s.filter((v) => v !== value) : [...s, value]);
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle} className="screen-enter">
        <div style={headerStyle}>
          <BackButton />
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>旅行者登録 <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}>Traveler profile</span></div>
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 11, color: "#b6a48f", fontWeight: 600, marginBottom: 18 }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>

          <form action={action}>
          <EnglishNotice />
          {(state?.error || (state?.errors && Object.keys(state.errors).length > 0)) && (
            <div style={{ background: "#ad001c20", border: "2px solid #ad001c", borderRadius: 12, padding: 14, marginBottom: 16, color: "#ad001c", fontWeight: 700 }}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>⚠️ {t("form_has_errors_title", lang)}</div>
              <div style={{ fontSize: 12, color: "#5a4a18", fontWeight: 600, lineHeight: 1.5 }}>
                {state?.error ? state.error : t("form_has_errors_body", lang)}
              </div>
            </div>
          )}
            <Section title={lang === "ja" ? "基本情報" : "Basics"}>
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_photos", lang)}</label>
              <ImageUploader initial={prefill?.image_paths ?? []} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="name">{t("form_name", lang)}</label>
              <input id="name" name="name" required value={lockedDisplayName ?? name} onChange={(e) => { if (!lockedDisplayName) setName(e.target.value); }} placeholder="例: John Smith"  disabled={!!lockedDisplayName} style={{ ...inputStyle, opacity: lockedDisplayName ? 0.7 : 1, cursor: lockedDisplayName ? "not-allowed" : "text" }} />
              {lockedDisplayName && (
                <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginTop: 4 }}>
                  🔒 {lang === "ja" ? "アカウント登録名 (変更不可)" : "Your account name (cannot be changed)"}
                </div>
              )}
              {state?.errors?.name && <div style={errStyle}>{state.errors.name}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="country">出身国</label>
              <input id="country" name="country" required list="country-list" value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle} placeholder="例: Japan" />
              <datalist id="country-list">
                {COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
              {state?.errors?.country && <div style={errStyle}>{state.errors.country}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="bio">自己紹介 (任意)</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={2000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                placeholder="どこから来た？何が好き？ガイドに知っておいてほしいこと"
              />
              {state?.errors?.bio && <div style={errStyle}>{state.errors.bio}</div>}
            </div>

            {/* Avatar */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_avatar", lang)}</label>
              <AvatarPicker initialEmoji={prefill?.emoji ?? undefined} initialAvatarPath={prefill?.avatar_path ?? null} />
            </div>

            </Section>
            <Section title={lang === "ja" ? "あなたについて" : "About you"}>
            {/* Gender */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="gender">{t("form_gender", lang)}</label>
              <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
                <option value="">{t("form_gender_unspecified", lang)}</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{t(g.labelKey, lang)}</option>
                ))}
              </select>
              {gender === "other" && (
                <input name="gender_other" type="text" maxLength={40} value={genderOther} onChange={(e) => setGenderOther(e.target.value)} placeholder={t("form_gender_other_placeholder", lang)} style={{ ...inputStyle, marginTop: 6 }} />
              )}
            </div>

            {/* Birth year */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="birth_year">生まれ年 (任意)</label>
              <input id="birth_year" name="birth_year" type="number" min={1900} max={new Date().getFullYear()} step={1} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} style={inputStyle} placeholder="例: 1995" />
            </div>

            {/* Nationality (already covered by country, but keep extra) */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="nationality">国籍 (任意・country と別管理)</label>
              <input id="nationality" name="nationality" type="text" maxLength={80} value={nationality} onChange={(e) => setNationality(e.target.value)} style={inputStyle} placeholder="例: アメリカ" />
            </div>

            {/* Occupation */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="occupation">{t("form_occupation", lang)}</label>
              <input id="occupation" name="occupation" type="text" maxLength={80} value={occupation} onChange={(e) => setOccupation(e.target.value)} style={inputStyle} placeholder="例: ソフトウェアエンジニア" />
            </div>

            {/* Trip period */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="trip_period">滞在期間 (任意)</label>
              <input id="trip_period" name="trip_period" type="text" maxLength={100} value={tripPeriod} onChange={(e) => setTripPeriod(e.target.value)} style={inputStyle} placeholder="例: 2026/06/01-2026/06/10" />
            </div>

            </Section>
            <Section title={lang === "ja" ? "興味・予定" : "Interests & availability"}>
            {/* Hobbies */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_hobbies", lang)}</label>
              <HobbiesTags initial={prefill?.hobbies ?? []} />
            </div>

            {/* Available slots */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_available_slots", lang)}</label>
              <AvailableSlots initial={prefill?.available_slots ?? []} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>興味（複数選択可）</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {INTEREST_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => toggle(t)} style={chipStyle(interests.includes(t))} aria-pressed={interests.includes(t)}>
                    {t}
                  </button>
                ))}
              </div>
              {interests.map((t) => <input key={t} type="hidden" name="interests" value={t} />)}
              {state?.errors?.interests && <div style={errStyle}>{state.errors.interests}</div>}
            </div>

            </Section>
            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }}>
              {pending ? "登録中…" : "旅行者として登録する ✈"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: "0 0 9px 2px", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#ad001c", textTransform: "uppercase" }}>{title}</p>
      <div style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 18, padding: 16, boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}>
        {children}
      </div>
    </div>
  );
}
