"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createGuide, type GuideFormState } from "@/app/actions/guides";
import ModeAndRate from "@/app/lib/mode-and-rate";
import AvatarPicker from "@/app/lib/avatar-picker";
import AvailableSlots from "@/app/lib/available-slots";
import HobbiesTags from "@/app/lib/hobbies-tags";
import ImageUploader from "@/app/lib/image-uploader";
import { useLang, t } from "@/app/lib/i18n";

const AREA_OPTIONS = ["Kyoto"] as const;
const TAG_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"] as const;
const LANGUAGE_OPTIONS = ["EN", "JP", "ZH", "KR", "ES", "FR", "DE", "PT", "IT", "RU", "AR", "HI", "ID", "TH", "VI", "TR", "NL", "PL"] as const;
const GENDER_OPTIONS: Array<{ value: string; labelKey: "form_gender_male" | "form_gender_female" | "form_gender_nonbinary" | "form_gender_other" }> = [
  { value: "male", labelKey: "form_gender_male" as const },
  { value: "female", labelKey: "form_gender_female" as const },
  { value: "non-binary", labelKey: "form_gender_nonbinary" as const },
  { value: "other", labelKey: "form_gender_other" as const },
];


const wrapStyle: React.CSSProperties = {
  background: "#f5ead0",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
};
const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 390,
  minHeight: "100vh",
  background: "#f5ead0",
};
const headerStyle: React.CSSProperties = {
  background: "#ad001c",
  padding: "18px 20px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff9f0",
  border: "2px solid #e8c99a",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1a1008",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#8a7560",
  marginBottom: 6,
  textTransform: "uppercase",
};
const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#ad001c",
  fontWeight: 800,
  marginTop: 4,
};
const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#ad001c" : "#fff9f0",
  border: `2px solid ${active ? "#ad001c" : "#e8c99a"}`,
  color: active ? "#fff" : "#8a7560",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const btnPrimary: React.CSSProperties = {
  width: "100%",
  background: "#ad001c",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function GuideForm({ userEmail }: { userEmail: string }) {
  const [state, action, pending] = useActionState<GuideFormState, FormData>(
    createGuide,
    undefined,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [bio, setBio] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [areas, setAreas] = useState<string[]>(["Kyoto"]);
  const [genderOther, setGenderOther] = useState("");
  const [nationality, setNationality] = useState("");
  const [occupation, setOccupation] = useState("");
  const [lang] = useLang();

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Link href="/" style={{ color: "#fff", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>
            {t("form_register_guide_title", lang)}
          </div>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 20 }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>

          <form action={action}>
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_photos", lang)}</label>
              <ImageUploader />
            </div>

            {/* Avatar */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_avatar", lang)}</label>
              <AvatarPicker />
            </div>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="name">{t("form_name", lang)}</label>
              <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder={lang === "ja" ? "例: Yuki Tanaka" : "e.g. Yuki Tanaka"} />
              {state?.errors?.name && <div style={errStyle}>{state.errors.name}</div>}
            </div>

            {/* University */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="university">{t("form_university", lang)}</label>
              <input id="university" name="university" value={university} onChange={(e) => setUniversity(e.target.value)} style={inputStyle} placeholder={t("form_university_placeholder", lang)} />
              {state?.errors?.university && <div style={errStyle}>{state.errors.university}</div>}
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="bio">{t("form_bio", lang)}</label>
              <textarea
                id="bio"
                name="bio"
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                placeholder={t("form_bio_placeholder", lang)}
              />
              {state?.errors?.bio && <div style={errStyle}>{state.errors.bio}</div>}
            </div>

            {/* Mode selector */}
            <ModeAndRate state={state} initialMode="both" initialRate={3000} />
            {state?.errors?.mode && <div style={errStyle}>{state.errors.mode}</div>}
            {state?.errors?.rate_per_day && <div style={errStyle}>{state.errors.rate_per_day}</div>}

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
                <input
                  name="gender_other"
                  type="text"
                  maxLength={40}
                  value={genderOther}
                  onChange={(e) => setGenderOther(e.target.value)}
                  placeholder={t("form_gender_other_placeholder", lang)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}
            </div>

            {/* Nationality */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="nationality">{t("form_nationality", lang)}</label>
              <input
                id="nationality"
                name="nationality"
                type="text"
                maxLength={80}
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                style={inputStyle}
                placeholder={t("form_nationality_placeholder", lang)}
              />
            </div>

            {/* Occupation */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="occupation">{t("form_occupation", lang)}</label>
              <input
                id="occupation"
                name="occupation"
                type="text"
                maxLength={80}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                style={inputStyle}
                placeholder={t("form_occupation_placeholder", lang)}
              />
            </div>

            {/* Birth year */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="birth_year">{t("form_birth_year", lang)}</label>
              <input
                id="birth_year"
                name="birth_year"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                step={1}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                style={inputStyle}
                placeholder={t("form_birth_year_placeholder", lang)}
              />
              {state?.errors?.birth_year && <div style={errStyle}>{state.errors.birth_year}</div>}
            </div>

            {/* Hobbies */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_hobbies", lang)}</label>
              <HobbiesTags />
            </div>

            {/* Available slots */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_available_slots", lang)}</label>
              <AvailableSlots />
            </div>

            {/* Areas */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_areas", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {AREA_OPTIONS.map((a) => (
                  <button key={a} type="button" onClick={() => setAreas((s) => s.includes(a) ? s.filter((x) => x !== a) : [...s, a])} style={chipStyle(areas.includes(a))}>{a}</button>
                ))}
              </div>
              {areas.map((a) => <input key={a} type="hidden" name="areas" value={a} />)}
              {state?.errors?.areas && <div style={errStyle}>{state.errors.areas}</div>}
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("form_tags", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAG_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags((s) => toggle(s, t))}
                    style={chipStyle(tags.includes(t))}
                    aria-pressed={tags.includes(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tags.map((t) => (
                <input key={t} type="hidden" name="tags" value={t} />
              ))}
              {state?.errors?.tags && <div style={errStyle}>{state.errors.tags}</div>}
            </div>

            {/* Languages */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>{t("form_languages", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguages((s) => toggle(s, l))}
                    style={chipStyle(languages.includes(l))}
                    aria-pressed={languages.includes(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {languages.map((l) => (
                <input key={l} type="hidden" name="languages" value={l} />
              ))}
              {state?.errors?.languages && <div style={errStyle}>{state.errors.languages}</div>}
            </div>

            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }}>
              {pending ? t("form_registering", lang) : t("form_register_guide_btn", lang)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
