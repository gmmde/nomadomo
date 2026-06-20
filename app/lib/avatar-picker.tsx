"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createClient } from "@/app/lib/supabase/client";
import { useSignedUrls } from "@/app/lib/use-signed-urls";

const EMOJI_OPTIONS = ["🧑", "🍜", "⛩", "🎨", "🌙", "🚲", "🏯", "☕", "📷", "🍶"] as const;
const BUCKET = "guide-images";

type Props = {
  initialEmoji?: string;
  initialAvatarPath?: string | null;
};

export default function AvatarPicker({ initialEmoji = "🧑", initialAvatarPath = null }: Props) {
  const [emoji, setEmoji] = useState(initialEmoji);
  const [avatarPath, setAvatarPath] = useState<string | null>(initialAvatarPath);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null); // data URL for crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signed = useSignedUrls(avatarPath ? [avatarPath] : [], BUCKET);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setCroppedPixels(areaPx);
  }, []);

  function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルだけアップロードできるわよ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("1枚あたり 5MB までよ");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFileUrl(typeof reader.result === "string" ? reader.result : null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  async function getCroppedBlob(): Promise<Blob | null> {
    if (!pendingFileUrl || !croppedPixels) return null;
    const img = new Image();
    img.src = pendingFileUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    const size = 512; // 出力 512x512
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, croppedPixels.x, croppedPixels.y, croppedPixels.width, croppedPixels.height, 0, 0, size, size);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
  }

  async function commitCrop() {
    if (!pendingFileUrl) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) throw new Error("クロップに失敗");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要");
      const filename = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filename, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      // 古い avatar があれば削除
      if (avatarPath && avatarPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from(BUCKET).remove([avatarPath]);
      }
      setAvatarPath(filename);
      setPendingFileUrl(null);
      setEmoji(""); // emoji を空にして画像優先
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!avatarPath) return;
    const supabase = createClient();
    if (avatarPath.startsWith(`${avatarPath.split("/")[0]}/`)) {
      await supabase.storage.from(BUCKET).remove([avatarPath]);
    }
    setAvatarPath(null);
    if (!emoji) setEmoji(EMOJI_OPTIONS[0]);
  }

  const avatarUrl = avatarPath ? signed[avatarPath] : null;

  return (
    <div>
      {/* hidden inputs that form will read */}
      <input type="hidden" name="emoji" value={emoji} />
      <input type="hidden" name="avatar_path" value={avatarPath ?? ""} />

      {/* Crop modal */}
      {pendingFileUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", padding: 20 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>
            画像をトリミング
          </div>
          <div style={{ position: "relative", flex: 1, minHeight: 280, borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <Cropper
              image={pendingFileUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginBottom: 4 }}>ズーム</div>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setPendingFileUrl(null)} disabled={uploading} style={{ flex: 1, background: "#fff", color: "#1a1008", border: "none", borderRadius: 14, padding: 12, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
              キャンセル
            </button>
            <button type="button" onClick={commitCrop} disabled={uploading} style={{ flex: 2, background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 12, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "アップロード中…" : "OK・保存"}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#ffefd5", border: "1px solid #ecdcc4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, overflow: "hidden", flexShrink: 0 }}>
          {avatarUrl ? (
            <img loading="lazy" decoding="async" src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : avatarPath ? (
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #f3e8d6", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite" }} />
          ) : (
            <span>{emoji || "🧑"}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "inline-block", background: "#ad001c", color: "#fff", padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
            📷 写真を選ぶ
            <input type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </label>
          {avatarPath && (
            <button type="button" onClick={removeAvatar} style={{ marginLeft: 8, background: "#fff", color: "#ad001c", border: "1.5px solid #ad001c", borderRadius: 12, padding: "8px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
              写真を削除
            </button>
          )}
          {error && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 800, marginTop: 6 }}>{error}</div>}
        </div>
      </div>

      {/* Emoji fallback */}
      {!avatarPath && (
        <div>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 800, marginBottom: 6 }}>または絵文字を選ぶ</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 42,
                  height: 42,
                  fontSize: 20,
                  cursor: "pointer",
                  borderRadius: "50%",
                  background: emoji === e ? "#ffefd5" : "#fff",
                  border: `2px solid ${emoji === e ? "#ad001c" : "#f3e8d6"}`,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
