"use client";

import { useState } from "react";
import { useLang } from "@/app/lib/i18n";

type Props = {
  initial?: string[];
};

export default function HobbiesTags({ initial = [] }: Props) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [lang] = useLang();

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (v.length > 30) return;
    if (tags.length >= 20) return;
    setTags((cur) => Array.from(new Set([...cur, v])));
    setDraft("");
  }

  function remove(t: string) {
    setTags((cur) => cur.filter((x) => x !== t));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div>
      {tags.map((t) => (
        <input key={t} type="hidden" name="hobbies" value={t} />
      ))}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {tags.map((t) => (
            <div key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #ad001c", color: "#ad001c", borderRadius: 16, padding: "4px 8px 4px 12px", fontSize: 12, fontWeight: 800 }}>
              {t}
              <button type="button" onClick={() => remove(t)} aria-label={lang === "ja" ? "削除" : "Remove"} style={{ background: "#ad001c", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={lang === "ja" ? "例: ラーメン, バスケ, K-POP" : "e.g. ramen, basketball, K-POP"}
          maxLength={30}
          style={{ flex: 1, background: "#fff", border: "1px solid #ecdcc4", borderRadius: 10, padding: "8px 10px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none" }}
        />
        <button type="button" onClick={add} style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>{lang === "ja" ? "+ 追加" : "+ Add"}</button>
      </div>
      <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginTop: 4 }}>
        Enter or , で追加。最大 20 個
      </div>
    </div>
  );
}
