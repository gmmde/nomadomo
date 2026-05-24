"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function publicUrl(path: string) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要よ");
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
        setError("画像ファイルだけアップロードできるわよ");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("1枚あたり 5MB までよ");
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
            <img
              src={publicUrl(p)}
              alt=""
              style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, border: "2px solid #e8c99a", display: "block" }}
            />
            <button
              type="button"
              onClick={() => removePath(p)}
              style={{ position: "absolute", top: -6, right: -6, background: "#ad001c", color: "#fff", border: "2px solid #fff9f0", borderRadius: "50%", width: 22, height: 22, fontSize: 12, cursor: "pointer", fontWeight: 900, padding: 0, lineHeight: 1 }}
              aria-label="削除"
            >
              ×
            </button>
            <input type="hidden" name={name} value={p} />
          </div>
        ))}
        {paths.length < maxImages && (
          <label
            style={{ width: 80, height: 80, border: "2px dashed #e8c99a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#8a7560", cursor: uploading ? "wait" : "pointer", background: "#fff9f0", flexShrink: 0 }}
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
