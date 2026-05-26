"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { updateTraveler, deleteTraveler, type TravelerFormState } from "@/app/actions/travelers";
import ImageUploader from "@/app/lib/image-uploader";

const INTEREST_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"] as const;

type Initial = {
  name: string;
  country: string;
  interests: string[];
  bio: string;
  image_paths: string[];
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

export default function EditTravelerForm({ userEmail, initial }: { userEmail: string; initial: Initial }) {
  const [state, action, pending] = useActionState<TravelerFormState, FormData>(updateTraveler, undefined);
  const [interests, setInterests] = useState<string[]>(initial.interests);
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
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>旅行者編集</div>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: "20px 20px 100px" }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 20 }}>
            ログイン中：{userEmail}
          </div>

          <form action={action}>
            {/* Photos */}
            <div style={{ marginBottom: 18 }}>
              <label style={label}>写真（複数可、最大8枚）</label>
              <ImageUploader initial={initial.image_paths} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="name">名前</label>
              <input id="name" name="name" required defaultValue={initial.name} style={input} />
              {state?.errors?.name && <div style={err}>{state.errors.name}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="country">出身国</label>
              <input id="country" name="country" required defaultValue={initial.country} style={input} />
              {state?.errors?.country && <div style={err}>{state.errors.country}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="bio">自己紹介 (任意)</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={2000}
                defaultValue={initial.bio}
                style={{ ...input, resize: "vertical", minHeight: 90 }}
              />
              {state?.errors?.bio && <div style={err}>{state.errors.bio}</div>}
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
              {pending ? "更新中…" : "更新する"}
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
