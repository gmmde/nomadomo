"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useSignedUrls } from "@/app/lib/use-signed-urls";
import { useLang } from "@/app/lib/i18n";

type Props = {
  initial?: string[];
  name?: string;
  bucket?: string;
  maxImages?: number;
};

export default function ImageUploader({
  initial = [],
  name = "image_paths",
  bucket = "guide-images",
  maxImages = 8,
}: Props) {
  const supabase = createClient();
  const [paths, setPaths] = useState<string[]>(initial);
  const [lang] = useLang();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signed = useSignedUrls(paths, bucket);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(lang === "ja" ? "ログインが必要よ" : "Login required");
      return;
    }
    setUploading(true);
    setError(null);
    const newPaths: string[] = [];
    for (const file of Array.from(files)) {
      if (paths.length + newPaths.length >= maxImages) {
        setError(`画像は最大 ${maxImages} 枚までよ`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        setError(lang === "ja" ? "画像ファイルだけアップロードできるわよ" : "Images only");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(lang === "ja" ? "1枚あたり 5MB までよ" : "Max 5MB per image");
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(filename, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        setError(`アップロード失敗: ${upErr.message}`);
        continue;
      }
      newPaths.push(filename);
    }
    setPaths((prev) => [...prev, ...newPaths]);
    setUploading(false);
  }

  async function removePath(p: string) {
    setPaths((prev) => prev.filter((x) => x !== p));
    await supabase.storage.from(bucket).remove([p]);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {paths.map((p) => (
          <div key={p} style={{ position: "relative" }}>
            {signed[p] ? (
              <img
                src={signed[p]}
                alt=""
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, border: "1px solid #ecdcc4", display: "block" }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 12, border: "1px solid #ecdcc4", background: "#f0d9b5", animation: "pulse 1.4s ease-in-out infinite" }} />
            )}
            <button
              type="button"
              onClick={() => removePath(p)}
              style={{ position: "absolute", top: -6, right: -6, background: "#ad001c", color: "#fff", border: "2px solid #fff", borderRadius: "50%", width: 22, height: 22, fontSize: 12, cursor: "pointer", fontWeight: 900, padding: 0, lineHeight: 1 }}
              aria-label={lang === "ja" ? "削除" : "Remove"}
            >
              ×
            </button>
            <input type="hidden" name={name} value={p} />
          </div>
        ))}
        {paths.length < maxImages && (
          <label
            style={{ width: 80, height: 80, border: "2px dashed #f3e8d6", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#8a7560", cursor: uploading ? "wait" : "pointer", background: "#fff", flexShrink: 0 }}
          >
            {uploading ? "…" : "+"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 800, marginBottom: 4 }}>{error}</div>}
      <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700 }}>
        {paths.length}/{maxImages} 枚 (最大5MB/枚)
      </div>
    </div>
  );
}
