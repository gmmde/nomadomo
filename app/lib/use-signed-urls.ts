"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

/**
 * 画像パスの配列を渡すと、それぞれの signed URL を返す。
 * signed URL は TTL（デフォ 1 時間）で失効するので、長時間開きっぱなしの画面では
 * 再生成のロジックを入れる必要がある（現状は MVP なので一回生成のみ）。
 */
export function useSignedUrls(
  paths: string[],
  bucket = "guide-images",
  ttlSec = 3600,
): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  // パス配列を安定 key にする（順番無視）
  const key = [...paths].sort().join("|");

  useEffect(() => {
    let cancelled = false;
    if (paths.length === 0) {
      setUrls({});
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, ttlSec);
      if (cancelled || error || !data) return;
      const map: Record<string, string> = {};
      for (const row of data) {
        if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
      }
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bucket, ttlSec]);

  return urls;
}
