"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createTraveler, type TravelerFormState } from "@/app/actions/travelers";
import ImageUploader from "@/app/lib/image-uploader";
import AvatarPicker from "@/app/lib/avatar-picker";
import HobbiesTags from "@/app/lib/hobbies-tags";
import AvailableSlots from "@/app/lib/available-slots";

const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "non-binary", label: "ノンバイナリー" },
  { value: "other", label: "その他" },
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
const headerStyle: React.CSSProperties = { background: "#2e8b57", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const errStyle: React.CSSProperties = { fontSize: 11, color: "#ad001c", fontWeight: 800, marginTop: 4 };
const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#2e8b57" : "#fff9f0",
  border: `2px solid ${active ? "#2e8b57" : "#e8c99a"}`,
  color: active ? "#fff" : "#8a7560",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const btnPrimary: React.CSSProperties = { width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function TravelerForm({ userEmail }: { userEmail: string }) {
  const [state, action, pending] = useActionState<TravelerFormState, FormData>(createTraveler, undefined);
  const [interests, setInterests] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [genderOther, setGenderOther] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [nationality, setNationality] = useState("");
  const [occupation, setOccupation] = useState("");
  const [tripPeriod, setTripPeriod] = useState("");
  function toggle(value: string) {
    setInterests((s) => s.includes(value) ? s.filter((v) => v !== value) : [...s, value]);
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle} className="screen-enter">
        <div style={headerStyle}>
          <Link href="/" style={{ color: "#fff", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>旅行者登録</div>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 20 }}>
            ログイン中：{userEmail}
          </div>

          <form action={action}>
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>写真（複数可、最大8枚）</label>
              <ImageUploader />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="name">名前</label>
              <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="例: John Smith" />
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
              <label style={labelStyle}>アバター (写真または絵文字)</label>
              <AvatarPicker />
            </div>

            {/* Gender */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="gender">性別 (任意)</label>
              <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
                <option value="">指定しない</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {gender === "other" && (
                <input name="gender_other" type="text" maxLength={40} value={genderOther} onChange={(e) => setGenderOther(e.target.value)} placeholder="自由入力" style={{ ...inputStyle, marginTop: 6 }} />
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
              <label style={labelStyle} htmlFor="occupation">職業 (任意)</label>
              <input id="occupation" name="occupation" type="text" maxLength={80} value={occupation} onChange={(e) => setOccupation(e.target.value)} style={inputStyle} placeholder="例: ソフトウェアエンジニア" />
            </div>

            {/* Trip period */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="trip_period">滞在期間 (任意)</label>
              <input id="trip_period" name="trip_period" type="text" maxLength={100} value={tripPeriod} onChange={(e) => setTripPeriod(e.target.value)} style={inputStyle} placeholder="例: 2026/06/01-2026/06/10" />
            </div>

            {/* Hobbies */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>趣味 (任意)</label>
              <HobbiesTags />
            </div>

            {/* Available slots */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>会える時間 (任意)</label>
              <AvailableSlots />
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
