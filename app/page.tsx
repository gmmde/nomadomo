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

function isTrustedLocal(stars: string, tour_count: number): boolean {
  return tour_count >= 3 && Number(stars) >= 4.0;
}

// Admin email list (Vercel env var ADMIN_EMAILS でも上書き可)
const ADMIN_EMAILS = ["tonoikenta@icloud.com", "nomadomojp@gmail.com"];


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
  const [homeInstant, setHomeInstant] = useState(false);
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
  const [profileMetCount, setProfileMetCount] = useState(0);
  const [profileReviewCount, setProfileReviewCount] = useState(0);
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
    if ((screen !== "inbox" && screen !== "myprofile") || !currentUserId) return;
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

  // プロフィール統計: 出会った人 (meetings) + 投稿レビュー数
  useEffect(() => {
    if (!currentUserId) { setProfileMetCount(0); setProfileReviewCount(0); return; }
    let cancelled = false;
    (async () => {
      const { count: metC } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
        .in("status", ["active", "completed"]);
      const { count: revC } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("reviewer_id", currentUserId)
        .not("released_at", "is", null);
      if (cancelled) return;
      setProfileMetCount(metC ?? 0);
      setProfileReviewCount(revC ?? 0);
    })();
    return () => { cancelled = true; };
  }, [supabase, currentUserId]);

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
  const NAV_PATHS: Record<string, string> = {
    home: "M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    inbox: "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-5.2A8.4 8.4 0 1 1 21 11.5z",
    saved: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
    myprofile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  };
  const NAV_ITEMS_TRAVELER: Array<{ label: string; key: NavKey }> = [
    { label: t("nav_home", lang), key: "home" },
    { label: t("nav_messages", lang), key: "inbox" },
    { label: t("nav_saved", lang), key: "saved" },
    { label: t("nav_profile", lang), key: "myprofile" },
  ];
  const NAV_ITEMS_LOCAL: Array<{ label: string; key: NavKey }> = [
    { label: t("nav_home", lang), key: "home" },
    { label: t("nav_messages", lang), key: "inbox" },
    { label: t("nav_saved", lang), key: "saved" },
    { label: t("nav_profile", lang), key: "myprofile" },
  ];
  const NAV_ITEMS = appMode === "local" ? NAV_ITEMS_LOCAL : NAV_ITEMS_TRAVELER;

  function renderBottomNav(active: NavKey | "profile" | "chat") {
    return (
      <div className="bottom-nav-safe" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, zIndex: 30, padding: "0 14px 12px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.94)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid #f0e3cf", borderRadius: 26, padding: "10px 12px", boxShadow: "0 12px 34px -12px rgba(120,50,20,.4)" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            const inboxCombined = totalUnread + pendingRequestCount + staleUnreviewedMeetings;
            const showBadge = item.key === "inbox" && inboxCombined > 0;
            const badgeCount = inboxCombined;
            const col = isActive ? "#ad001c" : "#b09a86";
            return (
              <button
                key={item.label}
                type="button"
                data-tutorial={item.key === "inbox" ? "nav-messages" : undefined}
                onClick={() => navTab(item.key as Exclude<NavKey, "requests">)}
                style={{ flex: 1, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}
              >
                <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={isActive ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round"><path d={NAV_PATHS[item.key]}/></svg>
                  {showBadge && (
                    <span style={{ position: "absolute", top: -5, right: -8, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#ad001c", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "grid", placeItems: "center", border: "1.5px solid #fff" }}>{badgeCount > 99 ? "99+" : badgeCount}</span>
                  )}
                </span>
                <span className="font-display" style={{ fontSize: 9.5, fontWeight: 700, color: col }}>{item.label}</span>
              </button>
            );
          })}
        </div>
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

        {/* HOME — リデザイン: Claude Design モック 1:1 移植 (機能は全保持) */}
        {screen === "home" && (
          <div className="screen-enter" style={{ background: "#fff8ec", minHeight: "100vh", position: "relative", paddingBottom: 8 }}>

            {/* header: area (left) + camel logo (center) + gear/avatar (right) */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 22px 18px" }}>
              <img src="/logo-camel.png" alt="NomaDomo" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", height: 78, width: "auto", pointerEvents: "none" }} />
              <button onClick={() => setAreaPickerOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, border: "none", background: "transparent", padding: "6px 4px", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: "50%", background: "#ffefd5", flex: "none" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ad001c" strokeWidth={2.2}><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>
                </span>
                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 10, letterSpacing: ".04em", color: "#ad001c", fontWeight: 700, whiteSpace: "nowrap" }}>エリア · AREA</span>
                  <span className="font-display" style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 16, color: "#2b1d1a", whiteSpace: "nowrap" }}>{homeAreaFilter ?? (lang === "ja" ? "日本全国" : "All Japan")}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b1d1a" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                  </span>
                </span>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Link href="/settings" aria-label="設定" data-tutorial="settings-gear" style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "#fff", border: "1px solid #f0e3cf", boxShadow: "0 2px 8px rgba(120,60,20,.06)", textDecoration: "none" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2b1d1a" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
                </Link>
                {userEmail ? (
                  <button onClick={() => setScreen("myprofile")} aria-label="マイページ" style={{ border: "none", padding: 0, background: "#ffefd5", cursor: "pointer", width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22, boxShadow: "0 2px 8px rgba(120,60,20,.12)" }}>😊</button>
                ) : (
                  <Link href="/login" style={{ background: "#ad001c", color: "#fff", borderRadius: 18, padding: "8px 14px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>{t("login", lang)}</Link>
                )}
              </div>
            </div>

            {/* greeting + hero */}
            <div style={{ padding: "12px 22px 4px" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#9a8a7c", fontWeight: 500 }}>{lang === "ja" ? `こんにちは、${travelerProfile?.name ?? ownGuide?.name ?? (userEmail ? userEmail.split("@")[0] : "ゲスト")} さん 👋` : `Hi, ${travelerProfile?.name ?? ownGuide?.name ?? (userEmail ? userEmail.split("@")[0] : "there")} 👋`}</p>
              <h1 className="font-display" style={{ margin: "4px 0 0", fontWeight: 900, fontSize: 27, lineHeight: 1.25, color: "#2b1d1a", letterSpacing: "-.01em" }}>本物の<span style={{ color: "#ad001c" }}>ローカル</span>と<br/>出会おう。</h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#b03a2e", fontWeight: 700 }}>Meet a real local in Japan — not a tour.</p>
            </div>

            {/* search */}
            <div style={{ padding: "14px 22px 6px" }}>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const q = String(fd.get("q") ?? "").trim(); router.push(`/guides/all${q ? `?q=${encodeURIComponent(q)}` : ""}`); }}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #f0e3cf", borderRadius: 18, padding: "13px 16px", boxShadow: "0 6px 18px -8px rgba(140,70,30,.18)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ad001c" strokeWidth={2.2}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                <input name="q" placeholder={t("search_placeholder", lang)} style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "none", fontSize: 14, color: "#2b1d1a", fontFamily: "inherit" }} />
                <button type="submit" aria-label={t("search_button", lang)} style={{ display: "grid", placeItems: "center", width: 34, height: 34, minWidth: 34, borderRadius: 12, background: "#ad001c", border: "none", cursor: "pointer" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}><path d="M3 6h18M6 12h12M10 18h4"/></svg>
                </button>
              </form>
            </div>

            {/* categories */}
            <div style={{ padding: "12px 0 4px" }}>
              <div style={{ padding: "0 22px 10px" }}>
                <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}><span style={{ display: "inline-block", width: 4, height: 15, borderRadius: 3, background: "#ad001c", marginRight: 8, verticalAlign: -1 }} />体験から探す <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>Explore by vibe</span></h2>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 22px 6px" }}>
                {[
                  { f: "🍜 Food", path: "M4 3v6a2 2 0 0 0 4 0V3M6 9v12M16 3c2 2 2 6 0 8v10", ja: "食べ歩き", en: "Foodie" },
                  { f: "🌙 Nightlife", path: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", ja: "夜遊び", en: "Nightlife" },
                  { f: "🎭 Culture", path: "M3 9l9-5 9 5M5 9v9M9 9v9M12 9v9M15 9v9M19 9v9M3 20h18", ja: "文化", en: "Culture" },
                  { f: "🌿 Nature", path: "M12 22V11M12 11C12 7 9 4 5 4c0 4 3 7 7 7zM12 11c0-4 3-7 7-7 0 4-3 7-7 7z", ja: "自然", en: "Nature" },
                  { f: "🎨 Art", path: "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1.1.9-2 2-2h1.5A3.5 3.5 0 0 0 20 11c0-4.4-3.6-8-8-8z", ja: "アート", en: "Art" },
                  { f: "🚲 Hidden spots", path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16 8l-2.5 5.5L8 16l2.5-5.5z", ja: "穴場", en: "Hidden" },
                ].map((v) => {
                  const on = activeFilter === v.f;
                  return (
                    <button key={v.f} onClick={() => setActiveFilter(on ? "All" : v.f)} style={{ flex: "none", width: 78, border: "none", background: "transparent", padding: "4px 2px", cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                      <span style={{ display: "grid", placeItems: "center", width: 60, height: 60, margin: "0 auto 6px", borderRadius: 20, background: on ? "#ad001c" : "#fff", border: on ? "none" : "1px solid #f0e3cf", boxShadow: "0 3px 9px rgba(120,80,40,.08)" }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={on ? "#fff" : "#ad001c"} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d={v.path}/></svg></span>
                      <span className="font-display" style={{ display: "block", fontWeight: 700, fontSize: 12.5, color: "#2b1d1a", whiteSpace: "nowrap" }}>{v.ja}</span>
                      <span style={{ display: "block", fontSize: 9.5, color: "#b6a48f", whiteSpace: "nowrap" }}>{v.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LOCAL DASHBOARD (Local モードのみ) */}
            {appMode === "local" && currentUserId && (
              <div style={{ padding: "4px 22px 8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Link href="/requests" style={{ display: "block", background: pendingRequestCount > 0 ? "#ad001c" : "#fff", color: pendingRequestCount > 0 ? "#fff" : "#2b1d1a", border: `1px solid ${pendingRequestCount > 0 ? "#ad001c" : "#f0e3cf"}`, borderRadius: 16, padding: 14, textDecoration: "none", boxShadow: "0 6px 18px -10px rgba(120,50,20,.3)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, marginBottom: 4 }}>{t("local_dashboard_requests", lang)}</div>
                    <div className="font-display" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{pendingRequestCount}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.7 }}>{t("items_unit", lang)}</span></div>
                  </Link>
                  <Link href="/bookings" style={{ display: "block", background: "#fff", color: "#2b1d1a", border: "1px solid #f0e3cf", borderRadius: 16, padding: 14, textDecoration: "none", boxShadow: "0 6px 18px -10px rgba(120,50,20,.3)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9a8a7c", marginBottom: 4 }}>{t("local_dashboard_bookings", lang)}</div>
                    <div className="font-display" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: "#2e8b57" }}>{upcomingBookingsCount}<span style={{ fontSize: 12, marginLeft: 4, opacity: 0.7 }}>{t("items_unit", lang)}</span></div>
                  </Link>
                </div>
                {ownGuide ? (
                  <Link href={`/?guide=${ownGuide.id}`} style={{ display: "block", marginTop: 10, background: "#e8f4ec", color: "#2e8b57", border: "1px solid #2e8b57", borderRadius: 14, padding: 12, textDecoration: "none", fontSize: 12, fontWeight: 800, textAlign: "center" }}>{t("own_guide_open", lang)} ({ownGuide.name})</Link>
                ) : (
                  <Link href="/guides/new" style={{ display: "block", marginTop: 10, background: "#ad001c", color: "#fff", borderRadius: 14, padding: 12, textDecoration: "none", fontSize: 13, fontWeight: 900, textAlign: "center" }}>{t("create_guide_profile", lang)}</Link>
                )}
              </div>
            )}

            {appMode === "local" ? (
              /* Local: travelers list */
              <div data-tutorial="home-list" style={{ padding: "4px 22px 0", display: "flex", flexDirection: "column", gap: 12 }}>
                {travelersList.filter((tv) => !tv.user_id || !blockedUserIds.has(tv.user_id)).map((tv) => (
                  <Link key={tv.id} href={`/travelers/${tv.id}`} style={{ display: "flex", alignItems: "center", gap: 13, background: "#fff", border: "1px solid #f3e8d6", borderRadius: 20, padding: 12, textDecoration: "none", color: "inherit", boxShadow: "0 8px 20px -14px rgba(120,50,20,.3)" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, display: "grid", placeItems: "center", fontSize: 26, flex: "none", overflow: "hidden", ...(tv.avatar_path && travelerAvatarUrls[tv.avatar_path] ? { backgroundImage: `url("${travelerAvatarUrls[tv.avatar_path]}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#ffefd5" }) }}>{!(tv.avatar_path && travelerAvatarUrls[tv.avatar_path]) && (tv.emoji ?? "🧑")}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 15.5, fontWeight: 700, color: "#2b1d1a" }}>{tv.name}</div>
                      <div style={{ fontSize: 11, color: "#b09a86", fontWeight: 600 }}>✈️ From {tv.country}{tv.occupation ? ` · ${tv.occupation}` : ""}</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#ad001c" }}>💬</div>
                  </Link>
                ))}
                {travelersList.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", color: "#b09a86", fontWeight: 700 }}>{t("no_travelers", lang)}</div>}
              </div>
            ) : (
              <>
                {/* featured guides (horizontal) */}
                <div style={{ padding: "12px 0 4px" }}>
                  <div data-tutorial="home-list" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px 12px" }}>
                    <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#2b1d1a" }}><span style={{ display: "inline-block", width: 4, height: 16, borderRadius: 3, background: "#ad001c", marginRight: 8, verticalAlign: -2 }} />おすすめガイド <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>For you</span></h2>
                    <Link href="/guides/all" style={{ fontSize: 12.5, fontWeight: 700, color: "#ad001c", textDecoration: "none" }}>すべて見る →</Link>
                  </div>
                  <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "2px 22px 10px" }}>
                    {visibleGuides.slice(0, 6).map((g) => {
                      const isFree = g.mode === "free";
                      const av = g.avatarPath ? avatarUrls[g.avatarPath] : null;
                      return (
                        <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={{ flex: "none", width: 236, background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 14px 34px -16px rgba(120,50,20,.32)", border: "1px solid #f3e8d6", cursor: "pointer" }}>
                          <div style={{ position: "relative", height: 176, display: "grid", placeItems: "center", ...(av ? { backgroundImage: `url("${av}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: isFree ? "linear-gradient(150deg,#9fd39a,#2e6b46)" : "linear-gradient(150deg,#ffb56b,#b8341f)" }) }}>
                            {!av && <span style={{ fontSize: 62, filter: "drop-shadow(0 3px 6px rgba(0,0,0,.2))" }}>{g.emoji}</span>}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 42%, rgba(20,8,5,.62) 100%)" }} />
                            <span style={{ position: "absolute", top: 12, left: 12, fontSize: 11, fontWeight: 800, color: "#fff", padding: "4px 10px", borderRadius: 30, background: isFree ? "#2e8b57" : "#ad001c", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }}>{isFree ? "無料 Mate" : "Pro ガイド"}</span>
                            <span style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.92)", padding: "4px 9px", borderRadius: 30 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4 7.3 13.6 2.2 9l6.9-.7z"/></svg>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#2b1d1a" }}>{g.mode === "paid" && g.tour_count === 0 ? t("rating_new", lang) : g.stars}</span>
                            </span>
                            <div style={{ position: "absolute", left: 14, bottom: 11, right: 14 }}>
                              <p className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#fff" }}>{g.name}</p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,.88)", fontWeight: 500 }}>{g.uni}{g.areas[0] ? ` · ${g.areas[0]}` : ""}</p>
                            </div>
                          </div>
                          <div style={{ padding: "12px 14px 14px" }}>
                            {isTrustedLocal(g.stars, g.tour_count) && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 9, background: "#e8f4ec", padding: "4px 9px", borderRadius: 8 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2e8b57" strokeWidth={2.4}><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#2e8b57" }}>信頼できる local · Trusted</span>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 11 }}>
                              {[...g.tags, ...g.languages].slice(0, 3).map((tag) => <span key={tag} style={{ background: "#f6efe2", color: "#7a6a5c", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>{tag}</span>)}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span className="font-display" style={{ fontWeight: 700, fontSize: 14, color: isFree ? "#2e8b57" : "#ad001c" }}>{isFree ? "🤝 Free" : g.rate}</span>
                              <span className="font-display" style={{ background: "#ad001c", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 12, boxShadow: "0 6px 14px -6px rgba(173,0,28,.7)" }}>会う Meet</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!loading && visibleGuides.length === 0 && <div style={{ padding: "20px", color: "#b09a86", fontWeight: 700 }}>{t("no_guides", lang)}</div>}
                  </div>
                </div>

                {/* locals here (vertical) */}
                <div style={{ padding: "14px 22px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#2b1d1a" }}><span style={{ display: "inline-block", width: 4, height: 16, borderRadius: 3, background: "#2e8b57", marginRight: 8, verticalAlign: -2 }} />{homeAreaFilter ?? "日本全国"}のローカル <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>Locals here</span></h2>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "#2e8b57", whiteSpace: "nowrap" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2e8b57" }} />{visibleGuides.length}{lang === "ja" ? "人オンライン" : " online"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ display: "flex", background: "#f1e6d4", borderRadius: 13, padding: 3 }}>
                      {(["all", "free", "paid"] as const).map((v) => {
                        const active = homeModeFilter === v;
                        const label = v === "all" ? (lang === "ja" ? "全て" : "All") : v === "free" ? "Free" : "Pro";
                        return <button key={v} onClick={() => setHomeModeFilter(v)} style={{ border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: active ? "#fff" : "transparent", color: active ? (v === "free" ? "#2e8b57" : v === "paid" ? "#ad001c" : "#2b1d1a") : "#9a8a7c", boxShadow: active ? "0 2px 6px rgba(120,50,20,.12)" : "none" }}>{label}</button>;
                      })}
                    </div>
                    <button onClick={() => setHomeInstant((x) => !x)} style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: homeInstant ? "#2e8b57" : "#9a8a7c", whiteSpace: "nowrap" }}>今すぐ予約可</span>
                      <span style={{ width: 38, height: 22, borderRadius: 11, background: homeInstant ? "#2e8b57" : "#e3d2bb", position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: homeInstant ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} /></span>
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {visibleGuides.map((g) => {
                      const isFree = g.mode === "free";
                      const av = g.avatarPath ? avatarUrls[g.avatarPath] : null;
                      return (
                        <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={{ display: "flex", gap: 13, alignItems: "center", background: "#fff", border: "1px solid #f3e8d6", borderRadius: 20, padding: 12, boxShadow: "0 8px 20px -14px rgba(120,50,20,.3)", cursor: "pointer" }}>
                          <div style={{ width: 62, height: 62, borderRadius: 16, flex: "none", display: "grid", placeItems: "center", fontSize: 30, overflow: "hidden", ...(av ? { backgroundImage: `url("${av}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#ffefd5" }) }}>{!av && (g.emoji ?? "🧑")}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span className="font-display" style={{ fontWeight: 700, fontSize: 15.5, color: "#2b1d1a" }}>{g.name}</span>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", padding: "2px 7px", borderRadius: 20, background: isFree ? "#2e8b57" : "#ad001c" }}>{isFree ? "FREE" : "PRO"}</span>
                              {isTrustedLocal(g.stars, g.tour_count) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e8b57" strokeWidth={2.4}><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>}
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#b09a86" }}>{g.uni}</p>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                              {[...g.tags, ...g.languages].slice(0, 2).map((tag) => <span key={tag} style={{ background: "#f6efe2", color: "#7a6a5c", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 7 }}>{tag}</span>)}
                            </div>
                          </div>
                          <div style={{ flex: "none", textAlign: "right" }}>
                            <span className="font-display" style={{ display: "block", fontWeight: 700, fontSize: 13, color: isFree ? "#2e8b57" : "#ad001c" }}>{isFree ? "Free" : g.rate}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", marginTop: 4, fontSize: 11, fontWeight: 700, color: "#2b1d1a" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4 7.3 13.6 2.2 9l6.9-.7z"/></svg>{g.mode === "paid" && g.tour_count === 0 ? t("rating_new", lang) : g.stars}</span>
                            {currentUserId && <button onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }} aria-label="お気に入り" style={{ marginTop: 3, border: "none", background: "transparent", fontSize: 15, cursor: "pointer", padding: 0, lineHeight: 1 }}>{savedIds.has(Number(g.id)) ? "❤️" : "🤍"}</button>}
                          </div>
                        </div>
                      );
                    })}
                    {!loading && visibleGuides.length === 0 && <div style={{ textAlign: "center", padding: "30px 10px", color: "#b09a86", fontSize: 13, fontWeight: 600 }}>条件に合うローカルがいません<br/><span style={{ fontSize: 11 }}>No locals match these filters</span></div>}
                  </div>
                </div>
              </>
            )}

            <div style={{ height: 100 }} />

            {/* area picker sheet */}
            {areaPickerOpen && (
              <div onClick={() => setAreaPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(28,17,16,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390, background: "#fff8ec", borderRadius: "28px 28px 0 0", padding: "14px 20px 30px", maxHeight: "72vh", overflowY: "auto" }}>
                  <div style={{ width: 40, height: 5, borderRadius: 3, background: "#e3d2bb", margin: "0 auto 14px" }} />
                  <h2 className="font-display" style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 20, color: "#2b1d1a" }}>エリアを選ぶ</h2>
                  <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#b03a2e", fontWeight: 700 }}>Choose your area · across Japan</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={autoDetectArea} disabled={geoBusy} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "#fff", border: "1px solid #f0e3cf", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 700, color: geoBusy ? "#b09a86" : "#2e8b57", cursor: geoBusy ? "wait" : "pointer", fontFamily: "inherit" }}>📍 {geoBusy ? (lang === "ja" ? "検出中…" : "Detecting…") : (lang === "ja" ? "現在地から自動選択" : "Use my location")}</button>
                    <button onClick={() => { setHomeAreaFilter(null); setAreaPickerOpen(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: homeAreaFilter === null ? "#e8f4ec" : "#fff", border: `1px solid ${homeAreaFilter === null ? "#2e8b57" : "#f0e3cf"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit" }}><span className="font-display" style={{ fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>{lang === "ja" ? "日本全国" : "All Japan"}</span></button>
                    {getSortedAreas(lang).map((a) => (
                      <button key={a.value} onClick={() => { setHomeAreaFilter(a.value); setAreaPickerOpen(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: homeAreaFilter === a.value ? "#e8f4ec" : "#fff", border: `1px solid ${homeAreaFilter === a.value ? "#2e8b57" : "#f0e3cf"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ad001c" strokeWidth={2.2}><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>
                          <span className="font-display" style={{ fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>{a.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
          const isOwn = !!currentUserId && !!selectedGuide.user_id && currentUserId === selectedGuide.user_id;
          const isDemo = !selectedGuide.user_id;
          const isFree = selectedGuide.mode === "free";
          const age2 = ageFromBirthYear(selectedGuide.birthYear);
          return (
          <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff8ec" }}>
            {/* HERO 写真 (モック: 上部340px → 下端をクリームへフェード) */}
            <div style={{ position: "relative", height: 340, background: "#1a1008", overflow: "hidden", flex: "none" }}>
              {carouselImages.slice(1).map((im) => im.src && (
                <img key={`pf-${im.path}`} src={im.src} alt="" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} loading="eager" decoding="async" />
              ))}
              {cur?.src ? (
                <img src={cur.src} alt="" loading="eager" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110, background: "#ffefd5" }}>{selectedGuide.emoji}</div>
              )}
              {total > 1 && (
                <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", gap: 4, zIndex: 3 }}>
                  {carouselImages.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: "#fff", width: i <= profileImgIdx ? "100%" : "0%", borderRadius: 2 }} />
                    </div>
                  ))}
                </div>
              )}
              {total > 1 && (
                <>
                  <div onClick={() => setProfileImgIdx((i) => Math.max(0, i - 1))} style={{ position: "absolute", top: 40, left: 0, width: "40%", height: 220, zIndex: 2, cursor: "pointer" }} />
                  <div onClick={() => setProfileImgIdx((i) => Math.min(total - 1, i + 1))} style={{ position: "absolute", top: 40, right: 0, width: "40%", height: 220, zIndex: 2, cursor: "pointer" }} />
                </>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,8,5,.4) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 58%, #fff8ec 100%)", pointerEvents: "none", zIndex: 1 }} />
              <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", zIndex: 4 }}>
                <button onClick={goBack} aria-label="戻る" style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#2b1d1a", border: "none", fontSize: 20, cursor: "pointer" }}>←</button>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!isOwn && !isDemo && selectedGuide.user_id && (
                    <ProfileActionsMenu targetUserId={selectedGuide.user_id} targetName={selectedGuide.name} />
                  )}
                  {currentUserId && (
                    <button onClick={() => toggleSave(Number(selectedGuide.id))} aria-label="お気に入り" style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", border: "none", cursor: "pointer" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill={savedIds.has(Number(selectedGuide.id)) ? "#ad001c" : "none"} stroke="#ad001c" strokeWidth={1.8}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* INFO (クリーム地) */}
            <div style={{ padding: "0 22px", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: -6 }}>
                <div style={{ minWidth: 0 }}>
                  <h1 className="font-display" style={{ margin: 0, fontWeight: 900, fontSize: 26, color: "#2b1d1a" }}>{selectedGuide.name}</h1>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8a7a6c" }}>🎓 {guideTr.showing === "translated" ? (guideTr.translations.university ?? selectedGuide.uni) : selectedGuide.uni}{selectedGuide.areas[0] ? ` · ${selectedGuide.areas[0]}` : ""}{age2 != null ? ` · ${age2}${lang === "ja" ? "歳" : ""}` : ""}</p>
                </div>
                <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "#fff", padding: "5px 12px", borderRadius: 20, background: isFree ? "#2e8b57" : "#ad001c" }}>{isFree ? "無料 Mate" : "Pro ガイド"}</span>
              </div>

              {selectedGuide.paused && (
                <div style={{ marginTop: 8 }}><span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12, background: "#fff3cf", color: "#9a7b1a" }}>🛌 {lang === "ja" ? "お休み中" : "On break"}</span></div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <span className="font-display" style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 15, color: "#2b1d1a" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4 7.3 13.6 2.2 9l6.9-.7z"/></svg>
                  {selectedGuide.tour_count === 0 ? t("rating_new", lang) : selectedGuide.stars}
                  {selectedGuide.tour_count > 0 && <span style={{ fontSize: 12, color: "#9a8a7c", fontWeight: 500 }}> ({selectedGuide.tour_count})</span>}
                </span>
                {isTrustedLocal(selectedGuide.stars, selectedGuide.tour_count) && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#e8f4ec", padding: "5px 11px", borderRadius: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2e8b57" strokeWidth={2.4}><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#2e8b57", whiteSpace: "nowrap" }}>{t("trusted_local", lang)}</span>
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#9a8a7c", fontWeight: 600 }}>{selectedGuideFollowers} followers</span>
                {currentUserId && selectedGuide.user_id && !isOwn && (
                  <button onClick={() => selectedGuide.user_id && toggleFollow(selectedGuide.user_id)} style={{ marginLeft: "auto", background: followingIds.has(selectedGuide.user_id) ? "#fff" : "#2e8b57", color: followingIds.has(selectedGuide.user_id) ? "#2e8b57" : "#fff", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{followingIds.has(selectedGuide.user_id) ? "✓ Following" : "+ Follow"}</button>
                )}
              </div>

              {(selectedGuide.nationality || selectedGuide.occupation) && (
                <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#8a7a6c" }}>
                  {selectedGuide.nationality && <span>🌐 {guideTr.showing === "translated" ? (guideTr.translations.nationality ?? selectedGuide.nationality) : selectedGuide.nationality}</span>}
                  {selectedGuide.nationality && selectedGuide.occupation && <span> · </span>}
                  {selectedGuide.occupation && <span>💼 {guideTr.showing === "translated" ? (guideTr.translations.occupation ?? selectedGuide.occupation) : selectedGuide.occupation}</span>}
                </p>
              )}

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
                {[...selectedGuide.tags, ...selectedGuide.languages].slice(0, 8).map((tg) => (
                  <span key={tg} style={{ background: "#fff", border: "1px solid #f0e3cf", borderRadius: 10, padding: "5px 11px", fontSize: 11.5, color: "#7a6a5c", fontWeight: 700 }}>{tg}</span>
                ))}
              </div>

              {selectedGuide.bio && (
                <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.75, color: "#4f4239", whiteSpace: "pre-wrap" }}>{guideTr.showing === "translated" ? (guideTr.translations.bio ?? selectedGuide.bio) : selectedGuide.bio}</p>
              )}

              {!isOwn && (selectedGuide.bio || selectedGuide.occupation || selectedGuide.nationality) && (() => {
                const target: "en" | "ja" = lang;
                const showingTr = guideTr.showing === "translated";
                const hasCache = Object.keys(guideTr.translations).length > 0;
                async function onClick() {
                  if (showingTr || hasCache) { guideTr.toggle(); return; }
                  await guideTr.translate({ bio: selectedGuide?.bio ?? "", occupation: selectedGuide?.occupation ?? "", nationality: selectedGuide?.nationality ?? "", university: selectedGuide?.uni ?? "" }, target);
                }
                const label = guideTr.loading ? t("translating", lang) : showingTr ? t("translate_show_original", lang) : (target === "en" ? t("translate_btn_en", lang) : t("translate_btn_ja", lang));
                return (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={onClick} disabled={guideTr.loading} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: showingTr ? "#2e8b57" : "#fff", border: showingTr ? "1.5px solid #2e8b57" : "1px solid #f0e3cf", borderRadius: 16, padding: "6px 13px", fontSize: 11.5, fontWeight: 700, color: showingTr ? "#fff" : "#2b1d1a", cursor: guideTr.loading ? "wait" : "pointer", fontFamily: "inherit", opacity: guideTr.loading ? 0.7 : 1 }}>{label}</button>
                  </div>
                );
              })()}
              {guideTr.err && <div style={{ marginTop: 4, fontSize: 10, color: "#ad001c", textAlign: "right", fontWeight: 700 }}>{guideTr.err}</div>}

              {selectedGuide.hobbies.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>得意なこと <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>What we&rsquo;ll do</span></h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedGuide.hobbies.map((h) => (<span key={h} style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 14, padding: "8px 13px", fontSize: 12.5, color: "#5a4d43", fontWeight: 700 }}>{h}</span>))}
                  </div>
                </div>
              )}
              {selectedGuide.availableSlots.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>会える時間 <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>Availability</span></h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedGuide.availableSlots.slice(0, 12).map((sl) => (<span key={sl} style={{ background: "#e8f4ec", border: "1px solid #cdebd9", borderRadius: 14, padding: "6px 12px", fontSize: 11.5, color: "#2e8b57", fontWeight: 700 }}>{formatSlotShort(sl)}</span>))}
                  </div>
                </div>
              )}

              {selectedGuide.user_id && (
                <div style={{ marginTop: 22 }}>
                  <h2 className="font-display" style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 16, color: "#2b1d1a" }}>レビュー <span style={{ fontSize: 11, color: "#b6a48f", fontWeight: 500 }}>Reviews</span></h2>
                  <ReviewsSection reviewedUserId={selectedGuide.user_id} lang={lang} />
                </div>
              )}

              {isOwn && (
                <div style={{ marginTop: 22 }}>
                  <Link href={`/guides/${selectedGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>{t("edit_my_profile", lang)}</Link>
                  <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center", marginTop: 8 }}>{t("this_is_your_profile", lang)}</div>
                </div>
              )}
              <div style={{ height: isOwn ? 40 : 110 }} />
            </div>

            {/* sticky CTA (モック: 価格 + メッセージ + 予約) — 自分以外 */}
            {!isOwn && (
              <div style={{ position: "sticky", bottom: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 12, padding: "14px 20px 22px", background: "linear-gradient(180deg, rgba(255,248,236,0) 0%, #fff8ec 26%)" }}>
                {!isFree && (
                  <div style={{ flex: "none" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#9a8a7c", fontWeight: 600 }}>{lang === "ja" ? "1日" : "from"}</p>
                    <p className="font-display" style={{ margin: "1px 0 0", fontWeight: 900, fontSize: 19, color: "#2e8b57" }}>{selectedGuide.rate}</p>
                  </div>
                )}
                {isDemo ? (
                  <button disabled style={{ flex: 1, height: 52, background: "#d8c4ad", color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit" }}>{t("demo_guide_no_msg", lang)}</button>
                ) : !currentUserId ? (
                  <Link href="/login" className="font-display" style={{ flex: 1, height: 52, display: "grid", placeItems: "center", background: "#ad001c", color: "#fff", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>{t("login_to_message", lang)}</Link>
                ) : chatUnlocked ? (
                  <button onClick={() => { if (!selectedGuide.user_id) return; setChatPeer({ id: selectedGuide.user_id, name: selectedGuide.name, emoji: selectedGuide.emoji, guideId: selectedGuide.id }); setChatOrigin("profile"); setScreen("chat"); }} className="font-display" style={{ flex: 1, height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 22px -8px rgba(173,0,28,.6)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-5.2A8.4 8.4 0 1 1 21 11.5z"/></svg>{t("message_btn", lang)}
                  </button>
                ) : (
                  <Link href={`/chat-request/${selectedGuide.id}/new`} className="font-display" style={{ flex: 1, height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#ad001c", color: "#fff", borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 10px 22px -8px rgba(173,0,28,.6)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-5.2A8.4 8.4 0 1 1 21 11.5z"/></svg>{t("send_btn", lang)}
                  </Link>
                )}
                {currentUserId && selectedGuide.user_id && !isFree && (
                  <Link href={`/bookings/new?guide=${selectedGuide.id}`} className="font-display" style={{ flex: "none", height: 52, display: "grid", placeItems: "center", padding: "0 18px", background: "#2e8b57", color: "#fff", borderRadius: 16, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 10px 22px -8px rgba(46,139,87,.5)" }}>{lang === "ja" ? "予約" : "Book"}</Link>
                )}
              </div>
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
            metCount={profileMetCount}
            savedCount={savedIds.size}
            reviewCount={profileReviewCount}
            recentLocals={inboxPeers}
            guides={guides}
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
