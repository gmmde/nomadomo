// 位置情報 → 最寄り AREAS 値の解決。
//
// navigator.geolocation の coords を貰って、12 エリアの代表座標と
// haversine 距離計算で最寄りを返す。距離 200km 超なら "Other" 扱い
// (日本国外などを想定)。
//
// 都道府県境界の正確な逆ジオは不要。エリアは 12 個固定で「ざっくり」
// 当たれば十分。代表座標は各都道府県庁所在地の中心。

export type AreaCoord = { value: string; lat: number; lng: number };

export const AREA_COORDS: AreaCoord[] = [
  { value: "Sapporo",   lat: 43.0642, lng: 141.3469 },
  { value: "Sendai",    lat: 38.2682, lng: 140.8694 },
  { value: "Tokyo",     lat: 35.6762, lng: 139.6503 },
  { value: "Kanagawa",  lat: 35.4478, lng: 139.6425 },
  { value: "Aichi",     lat: 35.1815, lng: 136.9066 },
  { value: "Kyoto",     lat: 35.0116, lng: 135.7681 },
  { value: "Osaka",     lat: 34.6937, lng: 135.5023 },
  { value: "Kobe",      lat: 34.6901, lng: 135.1955 },
  { value: "Hiroshima", lat: 34.3853, lng: 132.4553 },
  { value: "Fukuoka",   lat: 33.5904, lng: 130.4017 },
  { value: "Okinawa",   lat: 26.2124, lng: 127.6809 },
];

/** Haversine 距離 (km) */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 最寄りエリアを返す。200km 超なら "Other"。 */
export function nearestArea(lat: number, lng: number): string {
  let best: AreaCoord = AREA_COORDS[0];
  let bestKm = Infinity;
  for (const a of AREA_COORDS) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    if (d < bestKm) {
      bestKm = d;
      best = a;
    }
  }
  return bestKm > 200 ? "Other" : best.value;
}

/** ブラウザ位置情報を取得して最寄りエリアを返す。
 *  - 非対応 / 拒否 / タイムアウト → null
 *  - 成功 → "Tokyo" のような AREAS value
 */
export async function detectArea(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          resolve(nearestArea(pos.coords.latitude, pos.coords.longitude));
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 30, timeout: 8000 }
    );
  });
}
