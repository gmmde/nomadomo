"use client";

import BackButton from "@/app/lib/back-button";
import { useActionState, useState } from "react";
import {
  updateGuide, setGuidePaused,
  deleteGuide,
  type GuideFormState,
} from "@/app/actions/guides";
import ModeAndRate from "@/app/lib/mode-and-rate";
import AvatarPicker from "@/app/lib/avatar-picker";
import AvailableSlots from "@/app/lib/available-slots";
import HobbiesTags from "@/app/lib/hobbies-tags";
import ImageUploader from "@/app/lib/image-uploader";
import { useLang, t } from "@/app/lib/i18n";
import { getSortedAreas } from "@/app/lib/areas";
import EnglishNotice from "@/app/_components/english-notice";

const TAG_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"] as const;
const LANGUAGE_OPTIONS = ["EN", "JP", "ZH", "KR", "ES", "FR", "DE", "PT", "IT", "RU", "AR", "HI", "ID", "TH", "VI", "TR", "NL", "PL"] as const;
const GENDER_OPTIONS: Array<{ value: string; labelKey: "form_gender_male" | "form_gender_female" | "form_gender_nonbinary" | "form_gender_other" }> = [
  { value: "male", labelKey: "form_gender_male" as const },
  { value: "female", labelKey: "form_gender_female" as const },
  { value: "non-binary", labelKey: "form_gender_nonbinary" as const },
  { value: "other", labelKey: "form_gender_other" as const },
];


type Initial = {
  gender: string | null;
  birth_year: number | null;
  avatar_path: string | null;
  areas: string[];
  nationality: string | null;
  occupation: string | null;
  gender_other: string | null;
  hobbies: string[];
  available_slots: string[];
  id: number;
  name: string;
  university: string;
  bio: string;
  emoji: string;
  rate_per_day: number | null;
  mode: "free" | "paid";
  paused: boolean;
  tags: string[];
  languages: string[];
  image_paths: string[];
};

const wrap: React.CSSProperties = {
  background: "#fff8ec",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 390,
  minHeight: "100vh",
  background: "#fff8ec",
};
const header: React.CSSProperties = { background: "transparent", padding: "16px 18px 6px", display: "flex", alignItems: "center", gap: 12 };
const input: React.CSSProperties = { width: "100%", background: "#fff8ec", border: "1px solid #ecdcc4", borderRadius: 13, padding: "13px 15px", fontSize: 14.5, fontWeight: 600, color: "#2b1d1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const err: React.CSSProperties = {
  fontSize: 11,
  color: "#ad001c",
  fontWeight: 800,
  marginTop: 4,
};
const chip = (a: boolean): React.CSSProperties => ({
  background: a ? "#ad001c" : "#fff",
  border: `2px solid ${a ? "#ad001c" : "#f3e8d6"}`,
  color: a ? "#fff" : "#8a7560",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 15, fontSize: 15.5, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 22px -12px rgba(173,0,28,.7)" };
const danger: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  color: "#ad001c",
  border: "2px solid #ad001c",
  borderRadius: 16,
  padding: 14,
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function EditGuideForm({
  userEmail,
  initial,
  lockedDisplayName,
}: {
  userEmail: string;
  initial: Initial;
  lockedDisplayName?: string | null;
}) {
  const [state, action, pending] = useActionState<GuideFormState, FormData>(
    updateGuide,
    undefined,
  );
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [languages, setLanguages] = useState<string[]>(initial.languages);
  const [name, setName] = useState(initial.name);
  const [university, setUniversity] = useState(initial.university);
  const [bio, setBio] = useState(initial.bio);
  const [birthYear, setBirthYear] = useState<string>(initial.birth_year != null ? String(initial.birth_year) : "");
  const [gender, setGender] = useState<string>(initial.gender ?? "");
  const [areas, setAreas] = useState<string[]>(initial.areas);
  const [genderOther, setGenderOther] = useState(initial.gender_other ?? "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [occupation, setOccupation] = useState(initial.occupation ?? "");
  const [paused, setPaused] = useState<boolean>(initial.paused);
  const [pausedSaving, setPausedSaving] = useState(false);
  const [lang] = useLang();
  const sortedAreas = getSortedAreas(lang);

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  async function togglePaused() {
    const next = !paused;
    setPausedSaving(true);
    const fd = new FormData();
    fd.set("guide_id", String(initial.id));
    fd.set("paused", String(next));
    const r = await setGuidePaused(fd);
    setPausedSaving(false);
    if (r?.success) {
      setPaused(next);
    } else if (r?.error) {
      alert(r.error);
    }
  }

  function onDelete(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(t("form_delete_confirm", lang))) {
      e.preventDefault();
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={header}>
          <BackButton />
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>{lang === "ja" ? "ガイド編集" : "Edit guide"}{lang === "ja" && <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}> Edit guide</span>}</div>
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 20 }}>
            {t("logged_in_as", lang)}：{userEmail}
          </div>

          <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: paused ? "#fff3cd" : "#fff", border: `2px solid ${paused ? "#f5c649" : "#f3e8d6"}`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26 }}>{paused ? "🛌" : "✨"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1008" }}>
                {paused ? (lang === "ja" ? "現在お休み中" : "Currently on break") : (lang === "ja" ? "受付中" : "Available")}
              </div>
              <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, lineHeight: 1.5 }}>
                {paused
                  ? (lang === "ja" ? "ホーム検索一覧から非表示。既存チャットは続けられるわよ" : "Hidden from home/search. Existing chats keep working.")
                  : (lang === "ja" ? "休業モードにすると一覧から消えるわよ" : "Switching to break will hide you from listings.")}
              </div>
            </div>
            <button
              type="button"
              onClick={togglePaused}
              disabled={pausedSaving}
              style={{ background: paused ? "#2e8b57" : "#ad001c", color: "#fff", border: "none", borderRadius: 18, padding: "8px 14px", fontSize: 12, fontWeight: 900, cursor: pausedSaving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pausedSaving ? 0.6 : 1 }}
            >
              {pausedSaving ? "..." : paused ? (lang === "ja" ? "復帰" : "Reopen") : (lang === "ja" ? "休む" : "Pause")}
            </button>
          </div>
        </div>
        <form action={action}>
            <input type="hidden" name="lang" value={lang} />
          <EnglishNotice />
          {(state?.error || (state?.errors && Object.keys(state.errors).length > 0)) && (
            <div style={{ background: "#ad001c20", border: "2px solid #ad001c", borderRadius: 12, padding: 14, marginBottom: 16, color: "#ad001c", fontWeight: 700 }}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>⚠️ {t("form_has_errors_title", lang)}</div>
              <div style={{ fontSize: 12, color: "#5a4a18", fontWeight: 600, lineHeight: 1.5 }}>
                {state?.error ? state.error : t("form_has_errors_body", lang)}
              </div>
            </div>
          )}
            <input type="hidden" name="id" value={initial.id} />

            <Section title={lang === "ja" ? "基本情報" : "Basics"}>
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_photos", lang)}</label>
              <ImageUploader initial={initial.image_paths} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_avatar", lang)}</label>
              <AvatarPicker initialEmoji={initial.emoji} initialAvatarPath={initial.avatar_path} />
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
              <label style={label} htmlFor="university">{t("form_university", lang)}</label>
              <input id="university" name="university" value={university} onChange={(e) => setUniversity(e.target.value)} style={input} placeholder={t("form_university_placeholder", lang)} />
              {state?.errors?.university && <div style={err}>{state.errors.university}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="bio">{t("form_bio", lang)}</label>
              <textarea
                id="bio"
                name="bio"
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ ...input, resize: "vertical", minHeight: 96 }}
              />
              {state?.errors?.bio && <div style={err}>{state.errors.bio}</div>}
            </div>

            </Section>
            <Section title={lang === "ja" ? "提供スタイル" : "Your offer"}>
            <ModeAndRate state={state} initialMode={initial.mode} initialRate={initial.rate_per_day ?? 3000} />
            {state?.errors?.mode && <div style={err}>{state.errors.mode}</div>}
            {state?.errors?.rate_per_day && <div style={err}>{state.errors.rate_per_day}</div>}

            </Section>
            <Section title={lang === "ja" ? "あなたについて" : "About you"}>
            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="gender">{t("form_gender", lang)}</label>
              <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)} style={input}>
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
                  style={{ ...input, marginTop: 6 }}
                />
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="nationality">{t("form_nationality", lang)}</label>
              <input id="nationality" name="nationality" type="text" maxLength={80} value={nationality} onChange={(e) => setNationality(e.target.value)} style={input} placeholder={t("form_nationality_placeholder", lang)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="occupation">{t("form_occupation", lang)}</label>
              <input id="occupation" name="occupation" type="text" maxLength={80} value={occupation} onChange={(e) => setOccupation(e.target.value)} style={input} placeholder={t("form_occupation_placeholder", lang)} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label} htmlFor="birth_year">{t("form_birth_year", lang)}</label>
              <input
                id="birth_year"
                name="birth_year"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                step={1}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                style={input}
                placeholder={t("form_birth_year_placeholder", lang)}
              />
            </div>

            </Section>
            <Section title={lang === "ja" ? "活動内容" : "What you offer"}>
            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_hobbies", lang)}</label>
              <HobbiesTags initial={initial.hobbies} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_available_slots", lang)}</label>
              <AvailableSlots initial={initial.available_slots} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_areas", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sortedAreas.map((a) => (
                  <button key={a.value} type="button" onClick={() => setAreas((s) => s.includes(a.value) ? s.filter((x) => x !== a.value) : [...s, a.value])} style={chip(areas.includes(a.value))}>{a.label}</button>
                ))}
              </div>
              {areas.map((a) => <input key={a} type="hidden" name="areas" value={a} />)}
              {state?.errors?.areas && <div style={err}>{state.errors.areas}</div>}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>{t("form_tags", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAG_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => setTags((s) => toggle(s, t))} style={chip(tags.includes(t))}>
                    {t}
                  </button>
                ))}
              </div>
              {tags.map((t) => <input key={t} type="hidden" name="tags" value={t} />)}
              {state?.errors?.tags && <div style={err}>{state.errors.tags}</div>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>{t("form_languages", lang)}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <button key={l} type="button" onClick={() => setLanguages((s) => toggle(s, l))} style={chip(languages.includes(l))}>
                    {l}
                  </button>
                ))}
              </div>
              {languages.map((l) => <input key={l} type="hidden" name="languages" value={l} />)}
              {state?.errors?.languages && <div style={err}>{state.errors.languages}</div>}
            </div>

            </Section>
            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1, marginBottom: 12 }}>
              {pending ? t("form_saving", lang) : t("form_save_btn", lang)}
            </button>
          </form>

          <form action={deleteGuide} onSubmit={onDelete}>
            <input type="hidden" name="id" value={initial.id} />
            <button type="submit" style={danger}>
              {t("form_delete_guide", lang)}
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
