"use client";
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "./lib/supabase/client";
import { useSignedUrls } from "./lib/use-signed-urls";
import Splash from "./_components/splash";
import Lightbox from "./_components/lightbox";
import ModePicker from "./_components/mode-picker";
import ChatScreen from "./_components/chat-screen";
import TutorialOverlay from "./_components/tutorial-overlay";
import ConsentModal from "./_components/consent-modal";
import ProfileActionsMenu from "./_components/profile-actions-menu";
import AccountDeletionPrompt from "./_components/account-deletion-prompt";
import { startSupportChat } from "./actions/support";
import { notifyMessageSent } from "./actions/notify";
import { detectArea } from "./lib/geo";
import NameInputScreen from "./_components/name-input-screen";
import BrandLogo from "./_components/brand-logo";
import { getSortedAreas } from "./lib/areas";
import MyProfileScreen from "./_components/my-profile-screen";
import SavedScreen from "./_components/saved-screen";
import InboxScreen from "./_components/inbox-screen";
import ReviewsSection from "./_components/reviews-section";
import { useLang, t } from "./lib/i18n";
import { useTranslate } from "./lib/use-translate";

type Guide = {
  id: string;
  name: string;
  emoji: string;
  avatarPath: string | null;
  areas: string[];
  nationality: string | null;
  occupation: string | null;
  hobbies: string[];
  availableSlots: string[];
  birthYear: number | null;
  uni: string;
  tags: string[];
  languages: string[];
  rate: string;       // 表示用フォーマット (free なら "Free")
  ratePerDay: number | null;
  mode: "free" | "paid";
  stripeOnboarded: boolean;
  stars: string;
  bio: string;
  tour_count: number;
  user_id: string | null;
  image_paths: string[];
  paused: boolean;
};

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  attachment_path: string | null;
  created_at: string;
};

type TravelerRow = {
  id: number;
  user_id: string;
  name: string;
  country: string;
  bio: string;
  avatar_path: string | null;
  emoji: string | null;
  nationality: string | null;
  occupation: string | null;
  trip_period: string | null;
};

type TravelerProfile = {
  name: string;
  country: string;
  interests: string[];
  bio: string;
  image_paths: string[];
};

type ChatPeer = {
  id: string; // peer の auth.users.id
  name: string;
  emoji: string;
  guideId?: string; // ガイドプロファイル持ちなら id
};

type ChatOrigin = "profile" | "inbox";

// 双方向で同じチャンネル名になるよう、UUID をソートして結合
function pairChannel(prefix: string, a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `${prefix}-${x}-${y}`;
}

function ratingDisplay(g: { stars: string; tour_count: number }, lang: "en" | "ja" = "en") {
  if (g.tour_count === 0 || Number(g.stars) <= 0) return lang === "ja" ? "✨ 新規" : "✨ New";
  return `★ ${g.stars}`;
}

function tourCountDisplay(n: number): string {
  if (n < 10) return "~10";
  return String(n);
}

function isTrustedLocal(stars: string, tour_count: number): boolean {
  return tour_count >= 3 && Number(stars) >= 4.0;
}

// Admin email list (Vercel env var ADMIN_EMAILS でも上書き可)
const ADMIN_EMAILS = ["tonoikenta@icloud.com", "nomadomojp@gmail.com"];

const filters = [
  "All",
  "🍜 Food",
  "⛩ Temples",
  "🌙 Nightlife",
  "🚲 Hidden spots",
  "🎨 Art",
  "🎌 Anime",
  "🚗 Drive",
  "🌿 Nature",
  "🎭 Culture",
  "🏛 History",
  "🕳 Deep",
  "🎵 Music",
];

const filterKeyword: Record<string, string> = {
  "🍜 Food": "Food",
  "⛩ Temples": "Temples",
  "🌙 Nightlife": "Nightlife",
  "🚲 Hidden spots": "Hidden",
  "🎨 Art": "Art",
  "🎌 Anime": "Anime",
  "🚗 Drive": "Drive",
  "🌿 Nature": "Nature",
  "🎭 Culture": "Culture",
  "🏛 History": "History",
  "🕳 Deep": "Deep",
  "🎵 Music": "Music",
};


// mode に応じたカード背景色 + 枠色

function formatSlotShort(s: string): string {
  // "mon:1800-2200" -> "Mon 18:00-22:00"
  const [day, time] = s.split(":");
  if (!day || !time) return s;
  const map: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const [start, end] = time.split("-");
  const fmt = (t: string) => t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
  return `${map[day] ?? day} ${fmt(start ?? "")}-${fmt(end ?? "")}`;
}
function ageFromBirthYear(y: number | null): number | null {
  if (!y) return null;
  return new Date().getFullYear() - y;
}

function modeCardStyle(mode: "free" | "paid") {
  if (mode === "free") return { bg: "#e6f5ee", border: "#9fc9b6" };
  return { bg: "#fceaec", border: "#e8b5bc" };
}

function HomeInner() {
  const [screen, _setScreen] = useState("home");
  const [navHistory, setNavHistory] = useState<string[]>(["home"]);

  // 画面遷移: push to history (back で戻れる)
  function navigateTo(next: string) {
    _setScreen(next);
    setNavHistory((h) => [...h, next]);
  }
  // 履歴 1 個前に戻る (現在画面 pop)
  function goBack() {
    setNavHistory((h) => {
      if (h.length <= 1) {
        _setScreen("home");
        return ["home"];
      }
      const popped = h.slice(0, -1);
      _setScreen(popped[popped.length - 1]);
      return popped;
    });
  }
  // bottom nav: タブ切替で履歴 reset
  function navTab(tab: string) {
    _setScreen(tab);
    setNavHistory([tab]);
  }
  // 旧 setScreen() を navigateTo に alias (徐々に置換)
  const setScreen = navigateTo;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [homeModeFilter, setHomeModeFilter] = useState<"all" | "free" | "paid">("all");
  const [homeAreaFilter, setHomeAreaFilter] = useState<string | null>(null);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  // 「📍 現在地で自動選択」: ボタン押下で navigator.geolocation を起動
  async function autoDetectArea() {
    setGeoBusy(true);
    try {
      const a = await detectArea();
      if (a) setHomeAreaFilter(a);
    } finally {
      setGeoBusy(false);
      setAreaPickerOpen(false);
    }
  }
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Realtime 再接続トリガ: タブ復帰 / online 復帰時に bump → 既存 channel 全部 re-subscribe
  const [realtimeTick, setRealtimeTick] = useState(0);
  useEffect(() => {
    function onVis() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setRealtimeTick((t) => t + 1);
      }
    }
    function onOnline() { setRealtimeTick((t) => t + 1); }
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
    if (typeof window !== "undefined") window.addEventListener("online", onOnline);
    return () => {
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
      if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
    };
  }, []);
  const [travelerProfile, setTravelerProfile] = useState<TravelerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [inboxPeers, setInboxPeers] = useState<
    Array<{ peerId: string; lastBody: string; lastAt: string; name: string; emoji: string; guideId?: string }>
  >([]);
  const [unreadByPeer, setUnreadByPeer] = useState<Record<string, number>>({});
  const [chatPeer, setChatPeer] = useState<ChatPeer | null>(null);
  const [chatOrigin, setChatOrigin] = useState<ChatOrigin>("profile");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedGuideFollowers, setSelectedGuideFollowers] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [profileImgIdx, setProfileImgIdx] = useState(0);
  const [chatUnlocked, setChatUnlocked] = useState(false);
  const [appMode, setAppMode] = useState<"local" | "traveler" | null>(null);
  const [appModeLoaded, setAppModeLoaded] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: number; senderId: string; senderName: string; senderEmoji: string; message: string; createdAt: string }>>([]);
  const [chatMeeting, setChatMeeting] = useState<
    | { kind: "none" }
    | { kind: "pending_proposed_by_me"; id: number }
    | { kind: "pending_awaiting_my_accept"; id: number }
    | { kind: "active"; id: number; startedAt: string | null; iReviewed: boolean }
    | { kind: "completed"; id: number }
  >({ kind: "none" });
  const [meetingRefreshTick, setMeetingRefreshTick] = useState(0);
  // 4日以上経過した未レビュー active meeting 数 (bottom-nav badge 用)
  const [staleUnreviewedMeetings, setStaleUnreviewedMeetings] = useState(0);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [pendingDeletion, setPendingDeletion] = useState<{ scheduledAt: string } | null>(null);
  const [displayNameSet, setDisplayNameSet] = useState<boolean | null>(null);
  const [supportPending, setSupportPending] = useState(false);

  async function handleContactSupport() {
    if (supportPending) return;
    setSupportPending(true);
    const r = await startSupportChat();
    setSupportPending(false);
    if (r?.error) { alert(r.error); return; }
    if (r?.adminUserId) {
      setChatPeer({
        id: r.adminUserId,
        name: lang === "ja" ? "NomaDomo サポート" : "NomaDomo Support",
        emoji: "🛟",
      });
      setChatOrigin("inbox");
      setScreen("chat");
    }
  }

  // chatPeer に対する自分のロール (traveler/guide) と相手のガイドモード
  const [chatMyRole, setChatMyRole] = useState<"traveler" | "guide" | "unknown">("unknown");
  const [chatPeerGuideMode, setChatPeerGuideMode] = useState<"free" | "paid" | null>(null);
  // 初回ログイン時のチュートリアル表示制御 (user_settings.tutorial_completed)
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [travelersList, setTravelersList] = useState<TravelerRow[]>([]);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);
  const [lang] = useLang();
  const guideTr = useTranslate();

  const supabase = useMemo(() => createClient(), []);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // 選択中ガイドの画像を signed URL に変換（private bucket 対応）
  const galleryUrls = useSignedUrls(selectedGuide?.image_paths ?? []);
  // 全ガイドのアバター画像 (1 リクエストでバッチ取得)
  const avatarUrls = useSignedUrls(guides.map((g) => g.avatarPath).filter((p): p is string => Boolean(p)));
  // 自分の旅行者画像も signed URL に
  const travelerImageUrls = useSignedUrls(travelerProfile?.image_paths ?? []);

  // チャット新着で自動スクロール
  useEffect(() => {
    if (screen === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, screen]);

  // 背景地図パララックス用: body の data-screen 属性を更新
  useEffect(() => {
    document.body.dataset.screen = screen;
    return () => { delete document.body.dataset.screen; };
  }, [screen]);

  // ?support=<uuid> で来たら サポート (開発者) とのチャットを開く
  useEffect(() => {
    const sid = searchParams.get("support");
    if (!sid || !currentUserId) return;
    setChatPeer({
      id: sid,
      name: lang === "ja" ? "NomaDomo サポート" : "NomaDomo Support",
      emoji: "🛟",
    });
    setChatOrigin("inbox");
    setScreen("chat");
    router.replace("/", { scroll: false });
  }, [searchParams, currentUserId, lang, router]);

  // ?guide=ID で来たら該当ガイドのプロフィール画面に飛ぶ (例: /guides/all 経由)
  useEffect(() => {
    const gid = searchParams.get("guide");
    if (!gid || guides.length === 0) return;
    const g = guides.find((x) => String(x.id) === gid);
    if (g) {
      setSelectedGuide(g);
      setScreen("profile");
      router.replace("/", { scroll: false });
    }
  }, [searchParams, guides, router]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setCurrentUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ログイン中なら自分の旅行者プロファイル取得（明示的に user_id で絞る）
  useEffect(() => {
    if (!currentUserId) {
      setTravelerProfile(null);
      return;
    }
    supabase
      .from("travelers")
      .select("name, country, interests, bio, image_paths")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        setTravelerProfile(
          data
            ? {
                name: data.name as string,
                country: data.country as string,
                interests: (data.interests as string[]) ?? [],
                bio: (data.bio as string) ?? "",
                image_paths: (data.image_paths as string[]) ?? [],
              }
            : null,
        );
      });
  }, [supabase, currentUserId]);

  // 自分のお気に入りガイドID一覧を取得
  useEffect(() => {
    if (!currentUserId) {
      setSavedIds(new Set());
      return;
    }
    supabase
      .from("saved_guides")
      .select("guide_id")
      .then(({ data }) => {
        setSavedIds(new Set((data ?? []).map((r) => r.guide_id as number)));
      });
  }, [supabase, currentUserId]);

  // app_mode (Local/Traveler) を user_settings から取得
  useEffect(() => {
    if (!currentUserId) {
      setAppMode(null);
      setAppModeLoaded(false);
      return;
    }
    supabase
      .from("user_settings")
      .select("app_mode, tutorial_completed, language, display_name")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        const m = data?.app_mode as "local" | "traveler" | null | undefined;
        setAppMode(m === "local" || m === "traveler" ? m : null);
        setAppModeLoaded(true);
        const completed = data?.tutorial_completed === true;
        setTutorialOpen(!completed);
        setTutorialChecked(true);
        const dn = data?.display_name as string | undefined;
        setDisplayNameSet(Boolean(dn && dn.length > 0));
        // DB の language と localStorage を同期 (新デバイスでログインしたとき EN フラッシュ防止)
        const dbLang = data?.language as string | undefined;
        if ((dbLang === "ja" || dbLang === "en") && typeof window !== "undefined") {
          const current = localStorage.getItem("noma_lang");
          if (current !== dbLang) {
            localStorage.setItem("noma_lang", dbLang);
            window.dispatchEvent(new StorageEvent("storage", { key: "noma_lang", newValue: dbLang }));
          }
        }
      });
  }, [supabase, currentUserId]);

  async function saveAppMode(next: "local" | "traveler") {
    if (!currentUserId) return;
    setAppMode(next);
    await supabase
      .from("user_settings")
      .upsert({ user_id: currentUserId, app_mode: next }, { onConflict: "user_id" });
    // ホームに飛ばす
    navTab("home");
  }

  // Local モード時: 受信予約 (pending + accepted) の件数
  useEffect(() => {
    if (appMode !== "local" || !currentUserId) {
      setUpcomingBookingsCount(0);
      return;
    }
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("guide_user_id", currentUserId)
      .in("status", ["pending", "accepted"])
      .then(({ count }) => setUpcomingBookingsCount(count ?? 0));
  }, [supabase, appMode, currentUserId]);

  // Local モード時: traveler 一覧を取得
  useEffect(() => {
    if (appMode !== "local") {
      setTravelersList([]);
      return;
    }
    supabase
      .from("travelers")
      .select("id, user_id, name, country, bio, avatar_path, emoji, nationality, occupation, trip_period")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const rows = (data ?? []).map((t) => ({
          id: t.id as number,
          user_id: t.user_id as string,
          name: (t.name as string) ?? "",
          country: (t.country as string) ?? "",
          bio: (t.bio as string) ?? "",
          avatar_path: (t.avatar_path as string | null) ?? null,
          emoji: (t.emoji as string | null) ?? null,
          nationality: (t.nationality as string | null) ?? null,
          occupation: (t.occupation as string | null) ?? null,
          trip_period: (t.trip_period as string | null) ?? null,
        }));
        setTravelersList(rows);
      });
  }, [supabase, appMode]);

  // travelers 用 signed URL バッチ取得
  const travelerAvatarUrls = useSignedUrls(travelersList.map((t) => t.avatar_path).filter((p): p is string => Boolean(p)));

  // 自分宛 pending リクエスト一覧 + 件数 + Realtime 購読
  useEffect(() => {
    if (!currentUserId) {
      setPendingRequestCount(0);
      setPendingRequests([]);
      return;
    }
    let cancelled = false;
    async function refresh() {
      const { data } = await supabase
        .from("chat_requests")
        .select("id, traveler_id, message, created_at")
        .eq("guide_user_id", currentUserId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as Array<{ id: number; traveler_id: string; message: string | null; created_at: string }>;
      if (cancelled) return;
      setPendingRequestCount(rows.length);
      if (rows.length === 0) {
        setPendingRequests([]);
        return;
      }
      const senderIds = [...new Set(rows.map((r) => r.traveler_id))];
      const [tRes, gRes] = await Promise.all([
        supabase.from("travelers").select("user_id, name, emoji").in("user_id", senderIds),
        supabase.from("guides").select("user_id, name, emoji").in("user_id", senderIds),
      ]);
      const senderMap = new Map<string, { name: string; emoji: string }>();
      for (const t of ((tRes.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
        senderMap.set(t.user_id, { name: t.name, emoji: t.emoji ?? "🧑" });
      }
      for (const g of ((gRes.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
        if (!senderMap.has(g.user_id)) senderMap.set(g.user_id, { name: g.name, emoji: g.emoji ?? "🧑" });
      }
      const enriched = rows.map((r) => ({
        id: r.id,
        senderId: r.traveler_id,
        senderName: senderMap.get(r.traveler_id)?.name ?? `User ${r.traveler_id.slice(0, 8)}`,
        senderEmoji: senderMap.get(r.traveler_id)?.emoji ?? "👤",
        message: r.message ?? "",
        createdAt: r.created_at,
      }));
      if (!cancelled) setPendingRequests(enriched);
    }
    refresh();
    const ch = supabase
      .channel(`chatreq-notify-${currentUserId}-${realtimeTick}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_requests", filter: `guide_user_id=eq.${currentUserId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [supabase, currentUserId, realtimeTick]);

  // 自分のフォロー先一覧を取得（follows RLS で自分の行のみ取れる）
  useEffect(() => {
    if (!currentUserId) {
      setFollowingIds(new Set());
      return;
    }
    supabase
      .from("follows")
      .select("followee_id")
      .then(({ data }) => {
        setFollowingIds(new Set((data ?? []).map((r) => r.followee_id as string)));
      });
  }, [supabase, currentUserId]);

  // 選択中ガイドのフォロワー数（SECURITY DEFINER 関数経由）
  useEffect(() => {
    if (!selectedGuide?.user_id) {
      setSelectedGuideFollowers(0);
      return;
    }
    supabase
      .rpc("get_follower_count", { user_id: selectedGuide.user_id })
      .then(({ data }) => {
        setSelectedGuideFollowers(typeof data === "number" ? data : 0);
      });
  }, [supabase, selectedGuide?.user_id]);

  // チャット解錠状態 (accepted chat_request があれば true)
  useEffect(() => {
    setChatUnlocked(false);
    if (!selectedGuide?.user_id || !currentUserId || selectedGuide.user_id === currentUserId) return;
    supabase
      .rpc("has_accepted_chat_request", { a: currentUserId, b: selectedGuide.user_id })
      .then(({ data }) => setChatUnlocked(data === true));
  }, [supabase, selectedGuide?.user_id, currentUserId]);

  // プロフィール画面の画像カルーセル: 選択ガイドが変わったら index リセット
  useEffect(() => {
    setProfileImgIdx(0);
    guideTr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guideTr は毎レンダー新オブジェクトなので deps に入れると無限ループする
  }, [selectedGuide?.id]);

  // フォロートグル（楽観的更新）
  async function toggleFollow(followeeUserId: string) {
    if (!currentUserId || followeeUserId === currentUserId) return;
    const isFollowing = followingIds.has(followeeUserId);
    if (isFollowing) {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(followeeUserId);
        return next;
      });
      setSelectedGuideFollowers((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("followee_id", followeeUserId);
      if (error) {
        console.error("Unfollow failed:", error.message);
        setFollowingIds((prev) => new Set(prev).add(followeeUserId));
        setSelectedGuideFollowers((c) => c + 1);
      }
    } else {
      setFollowingIds((prev) => new Set(prev).add(followeeUserId));
      setSelectedGuideFollowers((c) => c + 1);
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, followee_id: followeeUserId });
      if (error) {
        console.error("Follow failed:", error.message);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(followeeUserId);
          return next;
        });
        setSelectedGuideFollowers((c) => Math.max(0, c - 1));
      }
    }
  }

  // 未読メッセージカウント (peer別) + realtime で新着増減
  useEffect(() => {
    if (!currentUserId) {
      setUnreadByPeer({});
      return;
    }
    // 初回ロード: 受信済み未読をsender別に集計
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", currentUserId)
        .is("read_at", null);
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ sender_id: string }>) {
        counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1;
      }
      setUnreadByPeer(counts);
    })();

    // realtime: 自分宛の新着で +1
    const ch = supabase
      .channel(`inbox-notify-${currentUserId}-${realtimeTick}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${currentUserId}` },
        (payload) => {
          const m = payload.new as { sender_id: string };
          setUnreadByPeer((prev) => ({
            ...prev,
            [m.sender_id]: (prev[m.sender_id] ?? 0) + 1,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, currentUserId, realtimeTick]);

  // Inbox: 過去メッセージから会話相手一覧 + guides/travelers から名前解決
  // 現 app_mode に合致するチャットのみ表示 (= 役割逆転で過去チャットが混ざるのを防ぐ)
  useEffect(() => {
    if (screen !== "inbox" || !currentUserId) return;
    let cancelled = false;
    (async () => {
      // 現 mode で許可される peer id 集合を chat_requests から作る
      let allowedPeers: Set<string> | null = null;
      if (appMode === "traveler") {
        // 自分が traveler だった accepted リクエスト → 相手は guide_user_id
        const { data: cr } = await supabase
          .from("chat_requests")
          .select("guide_user_id")
          .eq("traveler_id", currentUserId)
          .eq("status", "accepted");
        allowedPeers = new Set((cr ?? []).map((r) => (r as { guide_user_id: string }).guide_user_id));
      } else if (appMode === "local") {
        // 自分が guide だった accepted リクエスト → 相手は traveler_id
        const { data: cr } = await supabase
          .from("chat_requests")
          .select("traveler_id")
          .eq("guide_user_id", currentUserId)
          .eq("status", "accepted");
        allowedPeers = new Set((cr ?? []).map((r) => (r as { traveler_id: string }).traveler_id));
      }
      if (cancelled) return;

      const { data } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, body, created_at")
        .order("created_at", { ascending: false });

      const seen = new Map<string, { peerId: string; lastBody: string; lastAt: string }>();
      for (const m of (data ?? []) as Array<{ sender_id: string; recipient_id: string; body: string; created_at: string }>) {
        const peerId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id;
        // ブロック関係にある相手は除外
        if (blockedUserIds.has(peerId)) continue;
        // 現 mode の role に合致しない peer は除外
        if (allowedPeers && !allowedPeers.has(peerId)) continue;
        if (!seen.has(peerId)) {
          seen.set(peerId, { peerId, lastBody: m.body, lastAt: m.created_at });
        }
      }
      const peerIds = Array.from(seen.keys());
      if (peerIds.length === 0) {
        if (!cancelled) setInboxPeers([]);
        return;
      }

      // ガイドに含まれない peer の travelers 情報も取得
      const guideMap = new Map<string, { name: string; emoji: string; guideId: string }>();
      for (const g of guides) {
        if (g.user_id) guideMap.set(g.user_id, { name: g.name, emoji: g.emoji, guideId: g.id });
      }
      const nonGuidePeers = peerIds.filter((p) => !guideMap.has(p));
      const travelerMap = new Map<string, { name: string }>();
      if (nonGuidePeers.length > 0) {
        const { data: tData } = await supabase
          .from("travelers")
          .select("user_id, name")
          .in("user_id", nonGuidePeers);
        for (const t of (tData ?? []) as Array<{ user_id: string; name: string }>) {
          travelerMap.set(t.user_id, { name: t.name });
        }
      }

      const enriched = peerIds.map((peerId) => {
        const meta = seen.get(peerId)!;
        const g = guideMap.get(peerId);
        if (g) return { ...meta, name: g.name, emoji: g.emoji, guideId: g.guideId };
        const t = travelerMap.get(peerId);
        if (t) return { ...meta, name: t.name, emoji: "🧑" };
        return { ...meta, name: `ユーザー (${peerId.slice(0, 8)})`, emoji: "👤" };
      });
      if (!cancelled) setInboxPeers(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, currentUserId, screen, guides, appMode, blockedUserIds]);

  // お気に入りトグル
  const toggleSave = async (guideId: number) => {
    if (!currentUserId) return;
    if (savedIds.has(guideId)) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(guideId);
        return next;
      });
      const { error } = await supabase
        .from("saved_guides")
        .delete()
        .eq("user_id", currentUserId)
        .eq("guide_id", guideId);
      if (error) {
        console.error("Unsave failed:", error.message);
        setSavedIds((prev) => new Set(prev).add(guideId));
      }
    } else {
      setSavedIds((prev) => new Set(prev).add(guideId));
      const { error } = await supabase
        .from("saved_guides")
        .insert({ user_id: currentUserId, guide_id: guideId });
      if (error) {
        console.error("Save failed:", error.message);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(guideId);
          return next;
        });
      }
    }
  };

  useEffect(() => {
    // Safety net: Splash overlay は click を奪うので、何があっても 8 秒で剥がす
    const safety = setTimeout(() => setLoading(false), 8000);
    async function fetchGuides() {
      try {
        const { data, error } = await supabase
        .from("guides")
        .select("id, name, emoji, university, tags, languages, rate_per_day, mode, rating, bio, tour_count, user_id, image_paths, avatar_path, areas, nationality, occupation, hobbies, available_slots, birth_year, stripe_onboarded, paused")
        .order("rating", { ascending: false });

      if (error) {
        console.error("Supabase error:", error.message);
        setLoading(false);
        return;
      }

      const mapped: Guide[] = (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji ?? "🧑",
        avatarPath: (g.avatar_path as string | null) ?? null,
        areas: (g.areas as string[]) ?? ["Japan"],
        nationality: (g.nationality as string | null) ?? null,
        occupation: (g.occupation as string | null) ?? null,
        hobbies: (g.hobbies as string[]) ?? [],
        availableSlots: (g.available_slots as string[]) ?? [],
        birthYear: (g.birth_year as number | null) ?? null,
        uni: g.university ?? "",
        user_id: (g.user_id as string | null) ?? null,
        tags: g.tags ?? [],
        languages: g.languages ?? [],
        rate: g.mode === "free"
          ? "Free"
          : g.rate_per_day != null
            ? `¥${Number(g.rate_per_day).toLocaleString()}/day`
            : "—",
        ratePerDay: g.rate_per_day != null ? Number(g.rate_per_day) : null,
        mode: (((g.mode as string) === "free" ? "free" : "paid") as "free" | "paid"),
        stripeOnboarded: Boolean((g as { stripe_onboarded?: boolean }).stripe_onboarded),
        paused: Boolean((g as { paused?: boolean }).paused),
        stars: Number(g.rating).toFixed(1),
        bio: g.bio ?? "",
        tour_count: g.tour_count ?? 0,
        image_paths: (g.image_paths as string[]) ?? [],
      }));

      setGuides(mapped);
      if (mapped.length > 0) setSelectedGuide(mapped[0]);
      setLoading(false);
      } catch (e) {
        console.error("fetchGuides threw:", e);
        setLoading(false);
      }
    }

    fetchGuides();
    return () => clearTimeout(safety);
  }, [supabase]);

  // 自分が削除リクエスト出してて、まだ canceled でも scheduled でもないかチェック
  useEffect(() => {
    if (!currentUserId) { setPendingDeletion(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("account_deletions")
        .select("scheduled_at")
        .eq("user_id", currentUserId)
        .is("canceled_at", null)
        .gt("scheduled_at", new Date().toISOString())
        .maybeSingle();
      if (cancelled) return;
      const scheduled = (data as { scheduled_at?: string } | null)?.scheduled_at;
      setPendingDeletion(scheduled ? { scheduledAt: scheduled } : null);
    })();
    return () => { cancelled = true; };
  }, [supabase, currentUserId]);

  // 自分が blocker / blocked のどちらかである相手 user_id を全部集める
  useEffect(() => {
    if (!currentUserId) { setBlockedUserIds(new Set()); return; }
    let cancelled = false;
    async function refresh() {
      const [a, b] = await Promise.all([
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", currentUserId),
        supabase.from("user_blocks").select("blocker_id").eq("blocked_id", currentUserId),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      for (const r of ((a.data ?? []) as Array<{ blocked_id: string }>)) set.add(r.blocked_id);
      for (const r of ((b.data ?? []) as Array<{ blocker_id: string }>)) set.add(r.blocker_id);
      setBlockedUserIds(set);
    }
    refresh();
    return () => { cancelled = true; };
  }, [supabase, currentUserId]);

  // 4日以上経過した自分の未レビュー active meeting 数 (in-app reminder)
  useEffect(() => {
    if (!currentUserId) { setStaleUnreviewedMeetings(0); return; }
    let cancelled = false;
    async function refresh() {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ms } = await supabase
        .from("meetings")
        .select("id, started_at")
        .eq("status", "active")
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
        .lt("started_at", fourDaysAgo);
      if (cancelled || !ms || ms.length === 0) { setStaleUnreviewedMeetings(0); return; }
      const ids = ms.map((r) => (r as { id: number }).id);
      const { data: rev } = await supabase
        .from("reviews")
        .select("meeting_id")
        .in("meeting_id", ids)
        .eq("reviewer_id", currentUserId);
      if (cancelled) return;
      const reviewed = new Set((rev ?? []).map((r) => (r as { meeting_id: number }).meeting_id));
      setStaleUnreviewedMeetings(ms.filter((r) => !reviewed.has((r as { id: number }).id)).length);
    }
    refresh();
    return () => { cancelled = true; };
  }, [supabase, currentUserId, meetingRefreshTick]);

  // chatPeer に対する自分のロール (traveler/guide) と peer guide mode 判定
  useEffect(() => {
    if (!currentUserId || !chatPeer?.id) {
      setChatMyRole("unknown");
      setChatPeerGuideMode(null);
      return;
    }
    const peerId = chatPeer.id;
    let cancelled = false;
    (async () => {
      // 自分が traveler としてリクエスト送った accepted 行があれば自分が traveler
      const { data: cr } = await supabase
        .from("chat_requests")
        .select("id")
        .eq("traveler_id", currentUserId)
        .eq("guide_user_id", peerId)
        .eq("status", "accepted")
        .limit(1);
      if (cancelled) return;
      if (cr && cr.length > 0) {
        setChatMyRole("traveler");
      } else {
        // 逆向きに peer が traveler だった accepted があるか
        const { data: cr2 } = await supabase
          .from("chat_requests")
          .select("id")
          .eq("traveler_id", peerId)
          .eq("guide_user_id", currentUserId)
          .eq("status", "accepted")
          .limit(1);
        if (cancelled) return;
        if (cr2 && cr2.length > 0) setChatMyRole("guide");
        else setChatMyRole("unknown");
      }

      // peer の guide.mode (paid 側だけ Stripe フローに乗せる)
      const { data: g } = await supabase
        .from("guides")
        .select("mode")
        .eq("user_id", peerId)
        .maybeSingle();
      if (cancelled) return;
      const mode = (g?.mode as string | undefined);
      setChatPeerGuideMode(mode === "paid" ? "paid" : mode === "free" ? "free" : null);
    })();
    return () => { cancelled = true; };
  }, [supabase, currentUserId, chatPeer?.id]);

  // chatPeer との meeting 状態を取得 + Realtime 監視
  useEffect(() => {
    if (!currentUserId || !chatPeer?.id) {
      setChatMeeting({ kind: "none" });
      return;
    }
    const peerId = chatPeer.id;
    let cancelled = false;
    async function refresh() {
      const { data } = await supabase
        .from("meetings")
        .select("id, user_a_id, user_b_id, status, started_at")
        .or(`and(user_a_id.eq.${currentUserId},user_b_id.eq.${peerId}),and(user_a_id.eq.${peerId},user_b_id.eq.${currentUserId})`)
        .in("status", ["pending_a", "pending_b", "active", "completed"])
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setChatMeeting({ kind: "none" }); return; }
      const m = data as { id: number; user_a_id: string; user_b_id: string; status: string; started_at: string | null };
      if (m.status === "active") {
        // active のとき、自分のレビュー済みかどうかも取得 (urgency 表示用)
        const { data: myRev } = await supabase
          .from("reviews")
          .select("id")
          .eq("meeting_id", m.id)
          .eq("reviewer_id", currentUserId)
          .limit(1);
        if (cancelled) return;
        setChatMeeting({ kind: "active", id: m.id, startedAt: m.started_at, iReviewed: !!(myRev && myRev.length > 0) });
      }
      else if (m.status === "completed") setChatMeeting({ kind: "completed", id: m.id });
      else if (m.status === "pending_b") {
        if (m.user_a_id === currentUserId) setChatMeeting({ kind: "pending_proposed_by_me", id: m.id });
        else setChatMeeting({ kind: "pending_awaiting_my_accept", id: m.id });
      }
      else setChatMeeting({ kind: "none" });
    }
    refresh();
    const ch = supabase
      .channel(`meeting-${currentUserId}-${peerId}-${realtimeTick}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_a_id?: string; user_b_id?: string } | null;
          if (!row) return;
          const involves = (row.user_a_id === currentUserId && row.user_b_id === peerId)
            || (row.user_a_id === peerId && row.user_b_id === currentUserId);
          if (involves) refresh();
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [supabase, currentUserId, chatPeer?.id, meetingRefreshTick, realtimeTick]);

  // チャット画面が開いたら、chatPeer とのメッセージ履歴をロード + リアルタイム購読
  useEffect(() => {
    if (screen !== "chat" || !currentUserId || !chatPeer?.id) {
      return;
    }
    const peerId = chatPeer.id;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, attachment_path, created_at")
        .or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUserId})`,
        )
        .order("created_at");
      if (!cancelled) setMessages((data ?? []) as Message[]);
      // チャット開いた瞬間に peer からの未読を既読化
      await supabase.rpc("mark_messages_read", { peer: peerId });
      if (!cancelled) {
        setUnreadByPeer((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    })();

    const channel = supabase
      .channel(`${pairChannel("chat", currentUserId, peerId)}-${realtimeTick}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const isPair =
            (m.sender_id === peerId && m.recipient_id === currentUserId) ||
            (m.sender_id === currentUserId && m.recipient_id === peerId);
          if (isPair) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m],
            );
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [screen, currentUserId, chatPeer?.id, supabase, realtimeTick]);

  const visibleGuides = (() => {
    const notBlocked = guides.filter((g) => !g.user_id || !blockedUserIds.has(g.user_id));
    let active = notBlocked.filter((g) => !g.paused || g.user_id === currentUserId);
    // mode filter (Available now の隣の Free/Pro トグル)
    if (homeModeFilter === "free") active = active.filter((g) => g.mode === "free");
    else if (homeModeFilter === "paid") active = active.filter((g) => g.mode === "paid");
    // area filter
    if (homeAreaFilter) active = active.filter((g) => g.areas.includes(homeAreaFilter));
    // tag filter (既存)
    if (activeFilter === "All") return active;
    const kw = filterKeyword[activeFilter] ?? "";
    return active.filter((g) => g.tags.includes(kw));
  })();

  const sendMessage = async () => {
    if (!input.trim() || !currentUserId || !chatPeer?.id) return;
    const body = input.trim();
    const peerId = chatPeer.id;
    setInput("");

    // Optimistic update: 即時 UI 反映（realtime subscribe レース回避）
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUserId,
      recipient_id: peerId,
      body,
      attachment_path: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, recipient_id: peerId, body })
      .select()
      .single();

    if (error) {
      console.error("Send failed:", error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    // Push 通知 (fire-and-forget)
    notifyMessageSent({ recipientId: peerId, preview: body }).catch(() => {});

    // optimistic を本物に置換（realtime callback が先に拾ってたら id 重複を除く）
    if (data) {
      setMessages((prev) => {
        const withoutOpt = prev.filter((m) => m.id !== tempId);
        if (withoutOpt.some((m) => m.id === (data as Message).id)) return withoutOpt;
        return [...withoutOpt, data as Message];
      });
    }
  };

  const totalUnread = Object.values(unreadByPeer).reduce((s, n) => s + n, 0);

  // ガイドアイコン → ガイド詳細画面 (どの画面からでも呼べる)
  function openGuideProfile(guideId: string | undefined) {
    if (!guideId) return;
    const g = guides.find((x) => x.id === guideId);
    if (!g) return;
    setSelectedGuide(g);
    setScreen("profile");
  }

  // 自分自身のガイドプロファイル (あれば)
  // currentUserId が null の時に find が user_id=null のダミー (Yuki Tanaka 等)
  // に当たってしまわないよう明示ガード
  const ownGuide = currentUserId
    ? guides.find((g) => g.user_id === currentUserId) ?? null
    : null;

  type NavKey = "home" | "inbox" | "saved" | "myprofile" | "requests";
  const NAV_ITEMS_TRAVELER: Array<{ icon: string; label: string; key: NavKey }> = [
    { icon: "🏠", label: t("nav_home", lang), key: "home" },
    { icon: "💬", label: t("nav_messages", lang), key: "inbox" },
    { icon: "🤍", label: t("nav_saved", lang), key: "saved" },
    { icon: "😊", label: t("nav_profile", lang), key: "myprofile" },
  ];
  const NAV_ITEMS_LOCAL: Array<{ icon: string; label: string; key: NavKey }> = [
    { icon: "🏠", label: t("nav_home", lang), key: "home" },
    { icon: "💬", label: t("nav_messages", lang), key: "inbox" },
    { icon: "🤍", label: t("nav_saved", lang), key: "saved" },
    { icon: "😊", label: t("nav_profile", lang), key: "myprofile" },
  ];
  const NAV_ITEMS = appMode === "local" ? NAV_ITEMS_LOCAL : NAV_ITEMS_TRAVELER;

  function renderBottomNav(active: NavKey | "profile" | "chat") {
    return (
      <div className="bottom-nav-safe" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "#fffaf0f2", borderTop: "1px solid #f0e2cc", padding: "10px 0 22px", display: "flex", justifyContent: "space-around", zIndex: 10 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const inboxCombined = totalUnread + pendingRequestCount + staleUnreviewedMeetings;
          const showBadge = item.key === "inbox" && inboxCombined > 0;
          const badgeCount = inboxCombined;
          return (
            <div
              key={item.label}
              data-tutorial={item.key === "inbox" ? "nav-messages" : undefined}
              onClick={() => navTab(item.key as Exclude<NavKey, "requests">)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", position: "relative" }}
            >
              <div style={{ fontSize: 20, color: isActive ? "#ad001c" : "#b8a894" }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: isActive ? "#ad001c" : "#b8a894", fontWeight: 700 }}>{item.label}</div>
              {showBadge && (
                <div style={{ position: "absolute", top: -2, right: -8, background: "#ad001c", color: "#fff", borderRadius: 10, minWidth: 18, height: 18, padding: "0 5px", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fffaf0" }}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app-frame" style={{ display: "flex", justifyContent: "center" }}>
      <div className="app-frame-inner" style={{ width: "100%", maxWidth: 390, position: "relative" }}>

        {/* SPLASH (initial mount): user の app_mode 判定が終わるまでも leave して
            「一瞬ホームが見えてから ModePicker が乗る」 flash を防ぐ */}
        {(loading || (currentUserId && !appModeLoaded)) && <Splash />}

        {/* NAME INPUT — まだ display_name 未登録なら最優先で表示 */}
        {currentUserId && appModeLoaded && displayNameSet === false && (
          <NameInputScreen onComplete={() => setDisplayNameSet(true)} />
        )}

        {/* MODE PICKER — display_name 設定済かつモード未選択のとき */}
        {currentUserId && appModeLoaded && displayNameSet && !appMode && (
          <ModePicker onPick={saveAppMode} />
        )}

        {/* HOME */}
        {screen === "home" && (
          <div className="screen-enter">
            {/* TOPBAR — リデザイン: クリーム基調のクリーンヘッダー (ロゴ維持) */}
            <div style={{ background: "#fffaf0f2", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 9, borderBottom: "1px solid #f0e2cc" }}>
              <BrandLogo variant="row" size={22} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {userEmail ? (
                  <div onClick={() => setScreen("myprofile")} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "1.5px solid #f0e2cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", boxShadow: "0 2px 6px rgba(120,80,40,0.08)" }}>😊</div>
                ) : (
                  <Link href="/login" style={{ background: "#ad001c", border: "none", borderRadius: 18, padding: "7px 14px", fontSize: 11, fontWeight: 800, color: "#fff", textDecoration: "none" }}>
                    {t("login", lang)}
                  </Link>
                )}
                <Link href="/settings" aria-label="設定" data-tutorial="settings-gear" style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "1.5px solid #f0e2cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#ad001c", textDecoration: "none", boxShadow: "0 2px 6px rgba(120,80,40,0.08)" }}>⚙</Link>
              </div>
            </div>

            {/* HERO — リデザイン: 写真を廃しクリーム地にテキスト見出し (日英) */}
            <div style={{ padding: "20px 20px 8px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 800, color: "#2e8b57", marginBottom: 12 }}>📍 Japan</div>
              <div className="font-display" style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.25, color: "#1a1008", letterSpacing: "0.01em" }}>
                本物のローカルと、<br/>出会おう。
              </div>
              <div style={{ color: "#ad001c", fontSize: 12.5, fontWeight: 700, marginTop: 7 }}>Meet a real local in Japan — not a tour.</div>
            </div>

            {/* SEARCH */}
            <div style={{ padding: "12px 20px" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const q = String(fd.get("q") ?? "").trim();
                  router.push(`/guides/all${q ? `?q=${encodeURIComponent(q)}` : ""}`);
                }}
                style={{ background: "#ffffffee", border: "2px solid #e8c99a", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span style={{ color: "#ad001c", fontSize: 18 }}>🔍</span>
                <input
                  name="q"
                  placeholder={t("search_placeholder", lang)}
                  style={{ background: "none", border: "none", outline: "none", fontSize: 14, fontWeight: 600, flex: 1, fontFamily: "inherit", color: "#1a1008" }}
                />
                <button
                  type="submit"
                  style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >
                  {t("search_button", lang)}
                </button>
              </form>
            </div>

            {/* FILTERS */}
            <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, overflowX: "auto" }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{ background: activeFilter === f ? "#ad001c" : "#ffffffdd", border: `2px solid ${activeFilter === f ? "#ad001c" : "#f0d9b5"}`, borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: activeFilter === f ? "#fff" : "#8a7560", whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>{f}</button>
              ))}
            </div>

            {/* LOCAL DASHBOARD (Local モード時のみ) */}
            {appMode === "local" && currentUserId && (
              <div style={{ padding: "0 20px 12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Link href="/requests" style={{ display: "block", background: pendingRequestCount > 0 ? "#ad001c" : "#fff9f0", color: pendingRequestCount > 0 ? "#fff" : "#1a1008", border: `2px solid ${pendingRequestCount > 0 ? "#ad001c" : "#e8c99a"}`, borderRadius: 14, padding: 14, textDecoration: "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, marginBottom: 4 }}>{t("local_dashboard_requests", lang)}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{pendingRequestCount}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.7 }}>{t("items_unit", lang)}</span></div>
                  </Link>
                  <Link href="/bookings" style={{ display: "block", background: "#fff9f0", color: "#1a1008", border: "2px solid #e8c99a", borderRadius: 14, padding: 14, textDecoration: "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#8a7560", marginBottom: 4 }}>{t("local_dashboard_bookings", lang)}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: "#2e8b57" }}>{upcomingBookingsCount}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.7 }}>{t("items_unit", lang)}</span></div>
                  </Link>
                </div>
                {ownGuide ? (
                  <Link href={`/?guide=${ownGuide.id}`} style={{ display: "block", marginTop: 10, background: "#e6f5ee", color: "#1e6b40", border: "2px solid #2e8b57", borderRadius: 14, padding: 12, textDecoration: "none", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
                    {t("own_guide_open", lang)} ({ownGuide.name})
                  </Link>
                ) : (
                  <Link href="/guides/new" style={{ display: "block", marginTop: 10, background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 12, textDecoration: "none", fontSize: 13, fontWeight: 900, textAlign: "center" }}>
                    {t("create_guide_profile", lang)}
                  </Link>
                )}
              </div>
            )}

            {/* GUIDES (or Travelers in Local mode) */}
            <div data-tutorial="home-list" style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 900, background: "#ffffffdd", padding: "4px 10px", borderRadius: 10, whiteSpace: "nowrap" }}>{appMode === "local" ? `${t("travelers_nearby", lang)} ✈️` : `${t("available_now", lang)} ✨`}</div>
              <Link href={appMode === "local" ? "/travelers/all" : "/guides/all"} style={{ fontSize: 11, color: "#2e8b57", fontWeight: 800, background: "#ffffffdd", padding: "4px 10px", borderRadius: 10, textDecoration: "none" }}>{t("see_all", lang)}</Link>
            </div>
            {/* Free / Pro / Area selector (Traveler モードのみ) */}
            {appMode !== "local" && (
              <div style={{ padding: "0 20px 12px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {(["all", "free", "paid"] as const).map((v) => {
                  const label = v === "all" ? (lang === "ja" ? "全て" : "All") : v === "free" ? "🤝 Free" : "💼 Pro";
                  const active = homeModeFilter === v;
                  return (
                    <button key={v} type="button" onClick={() => setHomeModeFilter(v)}
                      style={{ background: active ? (v === "paid" ? "#2e8b57" : "#ad001c") : "#ffffffdd", color: active ? "#fff" : "#8a7560", border: `2px solid ${active ? (v === "paid" ? "#2e8b57" : "#ad001c") : "#f0d9b5"}`, borderRadius: 18, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      {label}
                    </button>
                  );
                })}
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => setAreaPickerOpen((x) => !x)}
                    style={{ background: homeAreaFilter ? "#2e8b57" : "#ffffffdd", color: homeAreaFilter ? "#fff" : "#8a7560", border: `2px solid ${homeAreaFilter ? "#2e8b57" : "#f0d9b5"}`, borderRadius: 18, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    📍 {homeAreaFilter ?? (lang === "ja" ? "エリア" : "Area")} ▾
                  </button>
                  {areaPickerOpen && (
                    <>
                      <div onClick={() => setAreaPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 12, padding: 6, zIndex: 51, boxShadow: "0 8px 20px rgba(0,0,0,0.18)", minWidth: 140, maxHeight: 280, overflowY: "auto" }}>
                        <button type="button" disabled={geoBusy} onClick={autoDetectArea}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid #f0d9b5", padding: "8px 10px", fontSize: 12, fontWeight: 800, color: geoBusy ? "#b8a98a" : "#2e8b57", cursor: geoBusy ? "wait" : "pointer", borderRadius: 0, fontFamily: "inherit" }}>
                          📍 {geoBusy ? (lang === "ja" ? "検出中..." : "Detecting...") : (lang === "ja" ? "現在地から自動選択" : "Use my location")}
                        </button>
                        <button type="button" onClick={() => { setHomeAreaFilter(null); setAreaPickerOpen(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", background: homeAreaFilter === null ? "#e6f5ee" : "transparent", border: "none", padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#1a1008", cursor: "pointer", borderRadius: 8, fontFamily: "inherit" }}>
                          {lang === "ja" ? "全エリア" : "All areas"}
                        </button>
                        {getSortedAreas(lang).map((a) => (
                          <button key={a.value} type="button" onClick={() => { setHomeAreaFilter(a.value); setAreaPickerOpen(false); }}
                            style={{ display: "block", width: "100%", textAlign: "left", background: homeAreaFilter === a.value ? "#e6f5ee" : "transparent", border: "none", padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#1a1008", cursor: "pointer", borderRadius: 8, fontFamily: "inherit" }}>
                            📍 {a.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ padding: "0 20px", display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "#ffffffee",
                      border: "2px solid #f0d9b5",
                      borderRadius: 20,
                      padding: 16,
                      minWidth: 152,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0d9b5", marginBottom: 10, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    <div style={{ height: 14, background: "#f0d9b5", borderRadius: 6, marginBottom: 6, width: "70%", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    <div style={{ height: 10, background: "#f0d9b5", borderRadius: 5, marginBottom: 10, width: "50%", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 14, background: "#f0d9b5", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                      <div style={{ width: 26, height: 14, background: "#f0d9b5", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    </div>
                    <div style={{ height: 12, background: "#f0d9b5", borderRadius: 5, width: "60%", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  </div>
                ))}
              </div>
            ) : appMode === "local" ? (
              travelersList.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>{t("no_travelers", lang)}</div>
              ) : (
                <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {travelersList.filter((tv) => !tv.user_id || !blockedUserIds.has(tv.user_id)).map((t) => (
                    <Link
                      key={t.id}
                      href={`/travelers/${t.id}`}
                      style={{ display: "flex", alignItems: "center", gap: 12, background: "#ffffffee", border: "2px solid #f0d9b5", borderRadius: 16, padding: 12, textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: "2px solid #e8c99a", flexShrink: 0, overflow: "hidden" }}>
                        {t.avatar_path && travelerAvatarUrls[t.avatar_path] ? (
                          <img loading="lazy" decoding="async" src={travelerAvatarUrls[t.avatar_path]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span>{t.emoji ?? "🧑"}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>
                          ✈️ From {t.country}{t.occupation ? ` · ${t.occupation}` : ""}
                        </div>
                        {t.bio && (
                          <div style={{ fontSize: 12, color: "#555", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {t.bio}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 20, color: "#ad001c" }}>💬</div>
                    </Link>
                  ))}
                </div>
              )
            ) : visibleGuides.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>{t("no_guides", lang)}</div>
            ) : (
              <div style={{ padding: "0 20px", display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {visibleGuides.map(g => {
                  const isFree = g.mode === "free";
                  const grad = isFree ? "linear-gradient(150deg,#9fd39a 0%,#4f9e6a 60%,#2e6b46 100%)" : "linear-gradient(150deg,#ffb56b 0%,#e8693e 60%,#b8341f 100%)";
                  return (
                  <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 22, overflow: "hidden", minWidth: 200, maxWidth: 200, cursor: "pointer", position: "relative", boxShadow: "0 8px 22px rgba(90,60,30,0.10)", flexShrink: 0 }}>
                    <div style={{ position: "relative", height: 150, background: grad, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {g.avatarPath && avatarUrls[g.avatarPath] ? (
                        <img loading="lazy" decoding="async" src={avatarUrls[g.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 56, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.18))" }}>{g.emoji}</span>
                      )}
                      <span style={{ position: "absolute", top: 10, left: 10, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, color: "#fff", background: isFree ? "#2e8b57" : "#ad001c", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}>{isFree ? "🤝 Free" : "💼 Pro"}</span>
                      {currentUserId && (
                        <button onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }} aria-label="お気に入り" style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.88)", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 15, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {savedIds.has(Number(g.id)) ? "❤️" : "🤍"}
                        </button>
                      )}
                    </div>
                    <div style={{ padding: "12px 13px 14px" }}>
                      <div className="font-display" style={{ fontSize: 17, fontWeight: 900, marginBottom: 1 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "#8a7560", marginBottom: 8, fontWeight: 600 }}>{g.uni}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                        {[...g.tags, ...g.languages].slice(0, 4).map(t => <span key={t} style={{ background: "#fff7ec", border: "1px solid #f0e2cc", borderRadius: 8, padding: "3px 8px", fontSize: 10, color: "#7a6a5c", fontWeight: 700 }}>{t}</span>)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: isFree ? "#2e8b57" : "#ad001c", fontWeight: 800 }}>{isFree ? "🤝 Free" : g.rate}</span>
                        {g.mode === "paid" ? <span style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{ratingDisplay(g, lang)}</span> : isTrustedLocal(g.stars, g.tour_count) ? <span style={{ fontSize: 10, color: "#2e8b57", fontWeight: 800 }}>✨ {t("trusted_local", lang)}</span> : null}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div style={{ height: 100 }}/>
          </div>
        )}
        {/* bottom nav は screen-enter の外側で描画 (transform で position:fixed が壊れるのを回避) */}
        {screen === "home" && renderBottomNav("home")}

        {/* GUIDE PROFILE (Tinder 風) */}
        {screen === "profile" && selectedGuide && (() => {
          const carouselImages: Array<{ src: string | null; path: string }> = [];
          if (selectedGuide.avatarPath) carouselImages.push({ src: avatarUrls[selectedGuide.avatarPath] ?? null, path: selectedGuide.avatarPath });
          for (const p of selectedGuide.image_paths) carouselImages.push({ src: galleryUrls[p] ?? null, path: p });
          const cur = carouselImages[profileImgIdx] ?? null;
          const total = carouselImages.length;
          // ログアウト時 (currentUserId=null) かつ demo guide (user_id=null) で誤判定しないよう両方 non-null を要求
          const isOwn = !!currentUserId && !!selectedGuide.user_id && currentUserId === selectedGuide.user_id;
          const isDemo = !selectedGuide.user_id;
          const age = selectedGuide.tour_count; // placeholder, real age would need birth_year
          return (
          <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* 画像エリア (Tinder 風: 70vh の大きな画像) */}
            <div style={{ position: "relative", height: "70vh", minHeight: 480, background: "#1a1008", overflow: "hidden" }}>
              {/* prefetch: 全カルーセル画像をマウント直後に裏で download 開始 */}
              {carouselImages.slice(1).map((im) => im.src && (
                <img key={`pf-${im.path}`} src={im.src} alt="" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} loading="eager" decoding="async" />
              ))}
              {cur?.src ? (
                <img src={cur.src} alt="" loading="eager" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, background: "#ffefd5" }}>
                  {selectedGuide.emoji}
                </div>
              )}

              {/* Progress bars (Instagram stories 風) */}
              {total > 1 && (
                <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4, zIndex: 3 }}>
                  {carouselImages.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: "#fff", width: i < profileImgIdx ? "100%" : i === profileImgIdx ? "100%" : "0%", borderRadius: 2 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* タップゾーン: 左半分 = prev, 右半分 = next */}
              {total > 1 && (
                <>
                  <div onClick={() => setProfileImgIdx((i) => Math.max(0, i - 1))} style={{ position: "absolute", top: 30, left: 0, width: "40%", height: "calc(100% - 200px)", zIndex: 2, cursor: "pointer" }} />
                  <div onClick={() => setProfileImgIdx((i) => Math.min(total - 1, i + 1))} style={{ position: "absolute", top: 30, right: 0, width: "40%", height: "calc(100% - 200px)", zIndex: 2, cursor: "pointer" }} />
                </>
              )}

              {/* トップバー: 戻る + … メニュー + 歯車 */}
              <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 14px", zIndex: 4 }}>
                <button onClick={goBack} aria-label="戻る" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {!isOwn && !isDemo && selectedGuide.user_id && (
<ProfileActionsMenu targetUserId={selectedGuide.user_id} targetName={selectedGuide.name} />
                  )}
                  <Link href="/settings" aria-label="設定" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
                </div>
              </div>

              {/* 下部オーバーレイ (グラデ + テキスト) */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 18px 20px", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))", color: "#fff", zIndex: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{selectedGuide.name}</span>
                  {selectedGuide.mode !== "free" && <span style={{ fontSize: 18 }}>✨</span>}
                  <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 10, background: selectedGuide.mode === "paid" ? "rgba(173,0,28,0.85)" : "rgba(46,139,87,0.85)" }}>
                    {selectedGuide.mode === "paid" ? "PRO" : "FREE"}
                  </span>
                  {selectedGuide.paused && (
                    <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 10, background: "rgba(245,198,73,0.95)", color: "#1a1008" }}>
                      🛌 {lang === "ja" ? "お休み中" : "On break"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  🎓 {guideTr.showing === "translated" ? (guideTr.translations.university ?? selectedGuide.uni) : selectedGuide.uni}
                </div>
                <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  📍 {lang === "ja" ? `${selectedGuide.areas.join(" · ")} 在住` : `Lives in ${selectedGuide.areas.join(" · ")}`}
                  {ageFromBirthYear(selectedGuide.birthYear) != null && <span style={{ marginLeft: 8 }}>· {ageFromBirthYear(selectedGuide.birthYear)} {t("yo", lang)}</span>}
                </div>
                {(selectedGuide.nationality || selectedGuide.occupation) && (
                  <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {selectedGuide.nationality && <span>🌐 {guideTr.showing === "translated" ? (guideTr.translations.nationality ?? selectedGuide.nationality) : selectedGuide.nationality}</span>}
                    {selectedGuide.nationality && selectedGuide.occupation && <span> · </span>}
                    {selectedGuide.occupation && <span>💼 {guideTr.showing === "translated" ? (guideTr.translations.occupation ?? selectedGuide.occupation) : selectedGuide.occupation}</span>}
                  </div>
                )}
                {selectedGuide.bio && (
                  <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {guideTr.showing === "translated" ? (guideTr.translations.bio ?? selectedGuide.bio) : selectedGuide.bio}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {[...selectedGuide.tags, ...selectedGuide.languages].slice(0, 6).map((t) => (
                    <span key={t} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 6, padding: "2px 7px", fontSize: 10, color: "#fff", fontWeight: 700 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* スクロール下: stats + 詳細 + 自分のガイドなら編集 */}
            <div style={{ padding: "14px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#1a1008", fontWeight: 800 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#ad001c" }}>{selectedGuideFollowers}</span>
                <span style={{ marginLeft: 4, color: "#8a7560" }}>followers</span>
              </div>
              {currentUserId && selectedGuide.user_id && !isOwn && (
                <button
                  onClick={() => selectedGuide.user_id && toggleFollow(selectedGuide.user_id)}
                  style={{ background: followingIds.has(selectedGuide.user_id) ? "#fff" : "#2e8b57", color: followingIds.has(selectedGuide.user_id) ? "#2e8b57" : "#fff", border: "2px solid #2e8b57", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {followingIds.has(selectedGuide.user_id) ? "✓ Following" : "+ Follow"}
                </button>
              )}
            </div>

            <div style={(() => { const s = modeCardStyle(selectedGuide.mode); return { display: "flex", margin: "0 20px 16px", background: s.bg, border: `2px solid ${s.border}`, borderRadius: 14, overflow: "hidden" }; })()}>
              {(() => {
                const cells: Array<[string, string]> = [];
                if (selectedGuide.mode === "paid") {
                  cells.push([tourCountDisplay(selectedGuide.tour_count), t("stat_tours", lang)]);
                  cells.push([selectedGuide.tour_count === 0 ? t("rating_new", lang) : selectedGuide.stars, t("stat_rating", lang)]);
                }
                cells.push([selectedGuide.languages.join("/"), t("stat_languages", lang)]);
                return cells.map(([n, l], i, arr) => (
                  <div key={l} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: i < arr.length - 1 ? "2px solid #e8c99a" : "none" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#ad001c" }}>{n}</div>
                    <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                  </div>
                ));
              })()}
            </div>
            {isTrustedLocal(selectedGuide.stars, selectedGuide.tour_count) && (
              <div style={{ margin: "0 20px 12px", textAlign: "center" }}>
                <span style={{ display: "inline-block", background: "#e6f5ee", border: "2px solid #2e8b57", borderRadius: 14, padding: "5px 14px", fontSize: 12, fontWeight: 900, color: "#2e8b57" }}>
                  {t("trusted_local", lang)}
                </span>
              </div>
            )}

            {selectedGuide.mode !== "free" && (
              <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>Starting from</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#2e8b57" }}>{selectedGuide.rate}</span>
              </div>
            )}
            {selectedGuide.mode === "free" && (
              <div style={{ padding: "0 20px 12px", textAlign: "center", fontSize: 13, color: "#2e8b57", fontWeight: 900 }}>
                {t("free_mate_label", lang)}
              </div>
            )}

            {(selectedGuide.hobbies.length > 0 || selectedGuide.availableSlots.length > 0) && (
              <div style={{ margin: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedGuide.hobbies.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>{t("hobbies_section", lang)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedGuide.hobbies.map((h) => (
                        <span key={h} style={{ background: "#ffefd5", border: "1.5px solid #ad001c", borderRadius: 14, padding: "4px 10px", fontSize: 11, color: "#ad001c", fontWeight: 700 }}>{h}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedGuide.availableSlots.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>{t("available_section", lang)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedGuide.availableSlots.slice(0, 12).map((s) => (
                        <span key={s} style={{ background: "#e6f5ee", border: "1.5px solid #2e8b57", borderRadius: 14, padding: "4px 10px", fontSize: 11, color: "#2e8b57", fontWeight: 700 }}>{formatSlotShort(s)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!isOwn && (selectedGuide.bio || selectedGuide.occupation || selectedGuide.nationality) && (() => {
              // UI 言語と同じ方向に翻訳 (EN ユーザー → translate INTO English)
              const target: "en" | "ja" = lang;
              const showingTr = guideTr.showing === "translated";
              const hasCache = Object.keys(guideTr.translations).length > 0;
              async function onClick() {
                if (showingTr || hasCache) {
                  guideTr.toggle();
                  return;
                }
                await guideTr.translate(
                  {
                    bio: selectedGuide?.bio ?? "",
                    occupation: selectedGuide?.occupation ?? "",
                    nationality: selectedGuide?.nationality ?? "",
                    university: selectedGuide?.uni ?? "",
                  },
                  target,
                );
              }
              const label = guideTr.loading
                ? t("translating", lang)
                : showingTr
                  ? t("translate_show_original", lang)
                  : (target === "en" ? t("translate_btn_en", lang) : t("translate_btn_ja", lang));
              return (
                <>
                  <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={onClick}
                      disabled={guideTr.loading}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, background: showingTr ? "#2e8b57" : "#fff9f0", border: showingTr ? "1.5px solid #2e8b57" : "1.5px solid #e8c99a", borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: showingTr ? "#fff" : "#1a1008", cursor: guideTr.loading ? "wait" : "pointer", fontFamily: "inherit", opacity: guideTr.loading ? 0.7 : 1 }}
                    >
                      {label}
                    </button>
                  </div>
                  {guideTr.err && <div style={{ padding: "0 20px 4px", fontSize: 10, color: "#ad001c", textAlign: "right", fontWeight: 700 }}>{guideTr.err}</div>}
                </>
              );
            })()}
            {selectedGuide.user_id && (
              <div style={{ margin: "0 20px 16px" }}>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 8, textTransform: "uppercase" }}>⭐ {t("reviews_tab", lang)}</div>
                <ReviewsSection reviewedUserId={selectedGuide.user_id} lang={lang} />
              </div>
            )}
            {isOwn ? (
              <div style={{ margin: "0 20px 80px", display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href={`/guides/${selectedGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  {t("edit_my_profile", lang)}
                </Link>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>{t("this_is_your_profile", lang)}</div>
              </div>
            ) : (
              <>
                {/* sticky 下部: message + heart */}
                <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "2px solid #f0d9b5", padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", marginTop: "auto" }}>
                  {isDemo ? (
                    <button disabled style={{ flex: 1, background: "#bbb", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, cursor: "not-allowed", fontFamily: "inherit" }}>{t("demo_guide_no_msg", lang)}</button>
                  ) : !currentUserId ? (
                    <Link href="/login" style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>{t("login_to_message", lang)}</Link>
                  ) : chatUnlocked ? (
                    <button
                      onClick={() => {
                        if (!selectedGuide.user_id) return;
                        setChatPeer({ id: selectedGuide.user_id, name: selectedGuide.name, emoji: selectedGuide.emoji, guideId: selectedGuide.id });
                        setChatOrigin("profile");
                        setScreen("chat");
                      }}
                      style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {t("message_btn", lang)}
                    </button>
                  ) : (
                    <Link href={`/chat-request/${selectedGuide.id}/new`} style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                      {t("send_btn", lang)}
                    </Link>
                  )}
                  {currentUserId && (
                    <button
                      onClick={() => toggleSave(Number(selectedGuide.id))}
                      style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", border: "2px solid #ad001c", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      aria-label="お気に入り"
                    >
                      {savedIds.has(Number(selectedGuide.id)) ? "❤️" : "🤍"}
                    </button>
                  )}
                </div>
                {currentUserId && selectedGuide.user_id && selectedGuide.mode !== "free" && (
                  <div style={{ textAlign: "center", fontSize: 10, color: "#8a7560", fontWeight: 700, padding: "8px 20px 16px" }}>
                    <Link href={`/bookings/new?guide=${selectedGuide.id}`} style={{ color: "#2e8b57", textDecoration: "underline", fontWeight: 800 }}>{t("booking_form_paid", lang)}</Link>
                  </div>
                )}
              </>
            )}
          </div>
          );
        })()}
        {/* Old profile section removed below */}

        {/* CHAT */}
        {screen === "chat" && chatPeer && (
          <ChatScreen
            chatPeer={chatPeer}
            goBack={goBack}
            openGuideProfile={openGuideProfile}
            currentUserId={currentUserId}
            messages={messages}
            chatEndRef={chatEndRef}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            guides={guides}
            avatarUrls={avatarUrls}
            lang={lang}
            meeting={chatMeeting}
            onMeetingChanged={() => setMeetingRefreshTick((n) => n + 1)}
            myRole={chatMyRole}
            peerGuideMode={chatPeerGuideMode}
          />
        )}

        {/* MY PROFILE */}
        {screen === "myprofile" && (
          <MyProfileScreen
            ownGuide={ownGuide}
            openGuideProfile={openGuideProfile}
            avatarUrls={avatarUrls}
            travelerProfile={travelerProfile}
            travelerImageUrls={travelerImageUrls}
            setLightboxUrl={setLightboxUrl}
            userEmail={userEmail}
            adminEmails={ADMIN_EMAILS}
            appMode={appMode}
            lang={lang}
            onContactSupport={handleContactSupport}
            supportPending={supportPending}
          />
        )}
        {/* bottom nav を screen-enter の外側で描画 (アニメ中の position:fixed 不安定を回避) */}
        {screen === "myprofile" && renderBottomNav("myprofile")}

        {/* SAVED */}
        {screen === "saved" && (
          <SavedScreen
            currentUserId={currentUserId}
            savedIds={savedIds}
            guides={guides}
            avatarUrls={avatarUrls}
            onSelect={(g) => { setSelectedGuide(g as Guide); setScreen("profile"); }}
            toggleSave={toggleSave}
            modeCardStyle={modeCardStyle}
            lang={lang}
          />
        )}
        {screen === "saved" && renderBottomNav("saved")}

        {/* INBOX */}
        {screen === "inbox" && (
          <InboxScreen
            goBack={goBack}
            currentUserId={currentUserId}
            inboxPeers={inboxPeers}
            unreadByPeer={unreadByPeer}
            guides={guides}
            avatarUrls={avatarUrls}
            openGuideProfile={openGuideProfile}
            onOpenChat={(p) => {
              setChatPeer({ id: p.peerId, name: p.name, emoji: p.emoji, guideId: p.guideId });
              setChatOrigin("inbox");
              setScreen("chat");
            }}
            lang={lang}
          />
        )}
        {screen === "inbox" && renderBottomNav("inbox")}

        {/* LIGHTBOX */}
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      </div>

      {/* 初回ログイン: チュートリアル (home + traveler モードに到達してから開く) */}
      {tutorialChecked && tutorialOpen && currentUserId && appModeLoaded && appMode && screen === "home" && !pendingDeletion && (
        <TutorialOverlay appMode={appMode} onClose={() => setTutorialOpen(false)} />
      )}
      {/* アカウント削除予定 (チュートリアルより優先) */}
      {pendingDeletion && currentUserId && (
        <AccountDeletionPrompt scheduledAt={pendingDeletion.scheduledAt} />
      )}
      {/* 規約同意モーダル (ログイン中で同意未完了の場合に表示) */}
      {currentUserId && !pendingDeletion && <ConsentModal />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Splash />}>
      <HomeInner />
    </Suspense>
  );
}
