"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { updateTraveler, deleteTraveler, type TravelerFormState } from "@/app/actions/travelers";
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

type Initial = {
  name: string;
  country: string;
  interests: string[];
  bio: string;
  image_paths: string[];
  avatar_path: string | null;
  emoji: string | null;
  gender: string | null;
  gender_other: string | null;
  birth_year: number | null;
  nationality: string | null;
  occupation: string | null;
  hobbies: string[];
  available_slots: string[];
  trip_period: string | null;
};

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh" };
const header: React.CSSProperties = { background: "#2e8b57", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const err: React.CSSProperties = { fontSize: 11, color: "#ad001c", fontWeight: 800, marginTop: 4 };
const chip = (a: boolean): React.CSSProperties => ({
  background: a ? "#2e8b57" : "#fff9f0",
  border: `2px solid ${a ? "#2e8b57" : "#e8c99a"}`,
  color: a ? "#fff" : "#8a7560",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const primary: React.CSSProperties = { width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
const danger: React.CSSProperties = { width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function EditTravelerForm({ userEmail, initial, lockedDisplayName }: { userEmail: string; initial: Initial; lockedDisplayName?: string | null }) {
  const [state, action, pending] = useActionState<TravelerFormState, FormData>(updateTraveler, undefined);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country);
  const [bio, setBio] = useState(initial.bio);
  const [gender, setGender] = useState<string>(initial.gender ?? "");
  const [genderOther, setGenderOther] = useState(initial.gender_other ?? "");
  const [birthYear, setBirthYear] = useState<string>(initial.birth_year != null ? String(initial.birth_year) : "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [occupation, setOccupation] = useState(initial.occupation ?? "");
  const [tripPeriod, setTripPeriod] = useState(initial.trip_period ?? "");
  const [lang] = useLang();
  function toggle(v: string) {
    setInterests((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v]);
  }
  function onDelete(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("本当に削除する？取り消せないわよ。")) e.preventDefault();
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={header}>
          <Link href="/" style={{ color: "#fff", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>{t("form_edit_traveler_title", lang)}</div>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 20 }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>

          <form action={action}>
          <EnglishNotice />
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_photos", lang)}</label>
              <ImageUploader initial={initial.image_paths} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="name">{t("form_name", lang)}</label>
              <input id="name" name="name" required value={lockedDisplayName ?? name} onChange={(e) => { if (!lockedDisplayName) setName(e.target.value); }} disabled={!!lockedDisplayName} style={{ ...input, opacity: lockedDisplayName ? 0.7 : 1, cursor: lockedDisplayName ? "not-allowed" : "text" }} />
              {lockedDisplayName && (
                <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginTop: 4 }}>
                  🔒 {lang === "ja" ? "アカウント登録名 (変更不可)" : "Your account name (cannot be changed)"}
                </div>
              )}
              {state?.errors?.name && <div style={err}>{state.errors.name}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="country">出身国</label>
              <input id="country" name="country" required value={country} onChange={(e) => setCountry(e.target.value)} style={input} />
              {state?.errors?.country && <div style={err}>{state.errors.country}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="bio">自己紹介 (任意)</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={2000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...input, resize: "vertical", minHeight: 90 }}
              />
              {state?.errors?.bio && <div style={err}>{state.errors.bio}</div>}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_avatar", lang)}</label>
              <AvatarPicker initialEmoji={initial.emoji ?? "🧑"} initialAvatarPath={initial.avatar_path} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="gender">{t("form_gender", lang)}</label>
              <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)} style={input}>
                <option value="">{t("form_gender_unspecified", lang)}</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{t(g.labelKey, lang)}</option>
                ))}
              </select>
              {gender === "other" && (
                <input name="gender_other" type="text" maxLength={40} value={genderOther} onChange={(e) => setGenderOther(e.target.value)} placeholder={t("form_gender_other_placeholder", lang)} style={{ ...input, marginTop: 6 }} />
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="birth_year">{t("form_birth_year", lang)}</label>
              <input id="birth_year" name="birth_year" type="number" min={1900} max={new Date().getFullYear()} step={1} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} style={input} placeholder="例: 1995" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="nationality">{t("form_nationality", lang)}</label>
              <input id="nationality" name="nationality" type="text" maxLength={80} value={nationality} onChange={(e) => setNationality(e.target.value)} style={input} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="occupation">{t("form_occupation", lang)}</label>
              <input id="occupation" name="occupation" type="text" maxLength={80} value={occupation} onChange={(e) => setOccupation(e.target.value)} style={input} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="trip_period">滞在期間 (任意)</label>
              <input id="trip_period" name="trip_period" type="text" maxLength={100} value={tripPeriod} onChange={(e) => setTripPeriod(e.target.value)} style={input} placeholder="例: 2026/06/01-2026/06/10" />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_hobbies", lang)}</label>
              <HobbiesTags initial={initial.hobbies} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_available_slots", lang)}</label>
              <AvailableSlots initial={initial.available_slots} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>興味（複数選択可）</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {INTEREST_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => toggle(t)} style={chip(interests.includes(t))}>
                    {t}
                  </button>
                ))}
              </div>
              {interests.map((t) => <input key={t} type="hidden" name="interests" value={t} />)}
              {state?.errors?.interests && <div style={err}>{state.errors.interests}</div>}
            </div>

            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1, marginBottom: 12 }}>
              {pending ? t("form_saving", lang) : t("form_save_btn", lang)}
            </button>
          </form>

          <form action={deleteTraveler} onSubmit={onDelete}>
            <button type="submit" style={danger}>
              旅行者プロファイルを削除
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
