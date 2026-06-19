// Web Push クライアント側ユーティリティ。
// 全 helper を no-op or false 返しにフォールバックして、未対応ブラウザ / SSR
// で例外を投げないようにする。
//
// 使い方:
//   const status = await registerAndSubscribe();
//   if (status === "granted") setEnabled(true);

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  return (await reg.pushManager.getSubscription()) ?? null;
}

export async function subscribePush(): Promise<{
  status: "granted" | "denied" | "default" | "unsupported";
  subscription?: PushSubscription;
}> {
  if (!isPushSupported()) return { status: "unsupported" };
  if (!VAPID_PUBLIC) {
    console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY missing");
    return { status: "unsupported" };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { status: perm };
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!reg) return { status: "unsupported" };
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }
  return { status: "granted", subscription: sub };
}

export async function unsubscribePush(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (!sub) return true;
  try {
    return await sub.unsubscribe();
  } catch (e) {
    console.error("unsubscribe failed", e);
    return false;
  }
}

export function serializeSubscription(sub: PushSubscription): {
  endpoint: string;
  p256dh: string;
  auth: string;
} | null {
  const json = sub.toJSON();
  const keys = (json as { keys?: { p256dh?: string; auth?: string } }).keys;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: keys.p256dh, auth: keys.auth };
}
