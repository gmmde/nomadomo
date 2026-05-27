"use client";
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "./lib/supabase/client";
import { useSignedUrls } from "./lib/use-signed-urls";
import { signout } from "./actions/auth";

type Guide = {
  id: string;
  name: string;
  emoji: string;
  avatarPath: string | null;
  areas: string[];
  uni: string;
  tags: string[];
  languages: string[];
  rate: string;       // 表示用フォーマット (free なら "Free")
  ratePerDay: number | null;
  mode: "free" | "paid" | "both";
  stars: string;
  bio: string;
  tour_count: number;
  user_id: string | null;
  image_paths: string[];
};

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
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

function ratingDisplay(g: { stars: string; tour_count: number }) {
  // 新規ガイド（実績ゼロ）は ★0.0 ではなく「✨ 新規」と出す
  if (g.tour_count === 0 || Number(g.stars) <= 0) return "✨ 新規";
  return `★ ${g.stars}`;
}

// Admin email list (Vercel env var ADMIN_EMAILS でも上書き可)
const ADMIN_EMAILS = ["tonoikenta@icloud.com"];

const filters = [
  "All",
  "🤝 mate",
  "💼 guide",
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
function modeCardStyle(mode: "free" | "paid" | "both") {
  if (mode === "free") return { bg: "#e6f5ee", border: "#9fc9b6" };
  if (mode === "paid") return { bg: "#fceaec", border: "#e8b5bc" };
  return { bg: "#ffffffee", border: "#f0d9b5" };
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
  const [heroImgError, setHeroImgError] = useState(false);
  const [heroImgLoaded, setHeroImgLoaded] = useState(false);

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

  // ログイン中なら自分の旅行者プロファイル取得（RLSで自分の行のみ取得可）
  useEffect(() => {
    if (!userEmail) {
      setTravelerProfile(null);
      return;
    }
    supabase
      .from("travelers")
      .select("name, country, interests, bio, image_paths")
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
  }, [supabase, userEmail]);

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
      .select("app_mode")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        const m = data?.app_mode as "local" | "traveler" | null | undefined;
        setAppMode(m === "local" || m === "traveler" ? m : null);
        setAppModeLoaded(true);
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

  // 自分宛 pending リクエスト数 (Local モード時のみ意味あり)
  useEffect(() => {
    if (!currentUserId) {
      setPendingRequestCount(0);
      return;
    }
    supabase
      .from("chat_requests")
      .select("id", { count: "exact", head: true })
      .eq("guide_user_id", currentUserId)
      .eq("status", "pending")
      .then(({ count }) => setPendingRequestCount(count ?? 0));
  }, [supabase, currentUserId]);

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
      .channel(`inbox-notify-${currentUserId}`)
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
  }, [supabase, currentUserId]);

  // Inbox: 過去メッセージから会話相手一覧 + guides/travelers から名前解決
  useEffect(() => {
    if (screen !== "inbox" || !currentUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, body, created_at")
        .order("created_at", { ascending: false });

      const seen = new Map<string, { peerId: string; lastBody: string; lastAt: string }>();
      for (const m of (data ?? []) as Array<{ sender_id: string; recipient_id: string; body: string; created_at: string }>) {
        const peerId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id;
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
  }, [supabase, currentUserId, screen, guides]);

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
    async function fetchGuides() {
      const { data, error } = await supabase
        .from("guides")
        .select("id, name, emoji, university, tags, languages, rate_per_day, mode, rating, bio, tour_count, user_id, image_paths, avatar_path, areas")
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
        areas: (g.areas as string[]) ?? ["Kyoto"],
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
        mode: ((g.mode as string) ?? "paid") as "free" | "paid" | "both",
        stars: Number(g.rating).toFixed(1),
        bio: g.bio ?? "",
        tour_count: g.tour_count ?? 0,
        image_paths: (g.image_paths as string[]) ?? [],
      }));

      setGuides(mapped);
      if (mapped.length > 0) setSelectedGuide(mapped[0]);
      setLoading(false);
    }

    fetchGuides();
  }, [supabase]);

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
        .select("id, sender_id, recipient_id, body, created_at")
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
      .channel(pairChannel("chat", currentUserId, peerId))
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
  }, [screen, currentUserId, chatPeer?.id, supabase]);

  const visibleGuides = (() => {
    if (activeFilter === "All") return guides;
    if (activeFilter === "🤝 mate") return guides.filter((g) => g.mode === "free" || g.mode === "both");
    if (activeFilter === "💼 guide") return guides.filter((g) => g.mode === "paid" || g.mode === "both");
    const kw = filterKeyword[activeFilter] ?? "";
    return guides.filter((g) => g.tags.includes(kw));
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
  const ownGuide = guides.find((g) => g.user_id === currentUserId) ?? null;

  type NavKey = "home" | "inbox" | "saved" | "myprofile" | "requests";
  const NAV_ITEMS_TRAVELER: Array<{ icon: string; label: string; key: NavKey }> = [
    { icon: "🏠", label: "Home", key: "home" },
    { icon: "💬", label: "Messages", key: "inbox" },
    { icon: "🤍", label: "Saved", key: "saved" },
    { icon: "😊", label: "Profile", key: "myprofile" },
  ];
  const NAV_ITEMS_LOCAL: Array<{ icon: string; label: string; key: NavKey }> = [
    { icon: "📨", label: "Requests", key: "requests" },
    { icon: "💬", label: "Messages", key: "inbox" },
    { icon: "🏠", label: "Browse", key: "home" },
    { icon: "😊", label: "Profile", key: "myprofile" },
  ];
  const NAV_ITEMS = appMode === "local" ? NAV_ITEMS_LOCAL : NAV_ITEMS_TRAVELER;

  function renderBottomNav(active: NavKey | "profile" | "chat") {
    return (
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "#2e8b57f5", borderTop: "2px solid #1e6b40", padding: "10px 0 22px", display: "flex", justifyContent: "space-around", zIndex: 10 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const isReq = item.key === "requests";
          const showBadge = (item.key === "inbox" && totalUnread > 0) || (isReq && pendingRequestCount > 0);
          const badgeCount = isReq ? pendingRequestCount : totalUnread;
          return (
            <div
              key={item.label}
              onClick={() => { if (item.key === "requests") router.push("/requests"); else navTab(item.key as Exclude<NavKey, "requests">); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", position: "relative" }}
            >
              <div style={{ fontSize: 20, color: isActive ? "#fff" : "#a8d5b8" }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: isActive ? "#fff" : "#a8d5b8", fontWeight: 700 }}>{item.label}</div>
              {showBadge && (
                <div style={{ position: "absolute", top: -2, right: -8, background: "#ad001c", color: "#fff", borderRadius: 10, minWidth: 18, height: 18, padding: "0 5px", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #2e8b57" }}>
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
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 390, minHeight: "100vh", position: "relative" }}>

        {/* SPLASH (initial mount) */}
        {loading && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f5ead0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1 }}>
              <span style={{ color: "#2ecc71" }}>Noma</span>
              <span style={{ color: "#ad001c" }}>Domo</span>
            </div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>
              京都で本物のローカルと出会う
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e8c99a", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite", marginTop: 8 }} />
          </div>
        )}

        {/* MODE PICKER (ログイン中 + app_mode 未選択時) */}
        {!loading && currentUserId && appModeLoaded && !appMode && (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "#f5ead0", display: "flex", flexDirection: "column", padding: "32px 20px 80px", overflowY: "auto" }}>
            <div style={{ fontSize: 32, fontWeight: 900, textAlign: "center", marginTop: 40, marginBottom: 4 }}>
              <span style={{ color: "#2ecc71" }}>Noma</span>
              <span style={{ color: "#ad001c" }}>Domo</span>
            </div>
            <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, textAlign: "center", marginBottom: 36 }}>
              どのモードで使う？
            </div>

            <button
              onClick={() => saveAppMode("traveler")}
              style={{ background: "linear-gradient(135deg, #ffefd5, #ffe0a0)", color: "#1a1008", border: "3px solid #ad001c", borderRadius: 22, padding: "24px 18px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            >
              <div style={{ fontSize: 38, marginBottom: 8 }}>✈️</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Traveler モード</div>
              <div style={{ fontSize: 12, color: "#5a4530", fontWeight: 700, lineHeight: 1.5 }}>
                旅行者として地元のガイドや mate と出会う。<br/>
                ガイドを検索 / 保存 / メッセージリクエストできる。
              </div>
            </button>

            <button
              onClick={() => saveAppMode("local")}
              style={{ background: "linear-gradient(135deg, #e6f5ee, #b0e5cc)", color: "#1a1008", border: "3px solid #2e8b57", borderRadius: 22, padding: "24px 18px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            >
              <div style={{ fontSize: 38, marginBottom: 8 }}>🏯</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: "#1e6b40" }}>Local モード</div>
              <div style={{ fontSize: 12, color: "#1e6b40", fontWeight: 700, lineHeight: 1.5 }}>
                ガイド / mate として旅行者を受け入れる。<br/>
                受信リクエスト管理 / 自分のプロフィール / 予約管理ができる。
              </div>
            </button>

            <div style={{ textAlign: "center", fontSize: 11, color: "#8a7560", fontWeight: 700, marginTop: 20 }}>
              ⚙️ 設定からあとで切り替えられるわよ
            </div>
          </div>
        )}

        {/* HOME */}
        {screen === "home" && (
          <div className="screen-enter">
            {/* TOPBAR */}
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                <span style={{ color: "#2ecc71" }}>Noma</span>
                <span style={{ color: "#fff" }}>Domo</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Link href="/guides/new" style={{ background: "#2ecc71", color: "#fff", border: "none", borderRadius: 18, padding: "6px 12px", fontSize: 11, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
                  + ガイドになる
                </Link>
                {userEmail ? (
                  <div onClick={() => setScreen("myprofile")} style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff28", border: "2px solid #ffffff60", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer" }}>😊</div>
                ) : (
                  <Link href="/login" style={{ background: "#ffffff28", border: "2px solid #ffffff60", borderRadius: 18, padding: "6px 12px", fontSize: 11, fontWeight: 800, color: "#fff", textDecoration: "none" }}>
                    ログイン
                  </Link>
                )}
                <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff28", border: "2px solid #ffffff60", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", textDecoration: "none" }}>⚙</Link>
              </div>
            </div>

            {/* MAP BG HERO */}
            <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
              {!heroImgError && (
                <img
                  src="/home-hero.png"
                  alt=""
                  onError={() => setHeroImgError(true)}
                  onLoad={() => setHeroImgLoaded(true)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: 1,
                    // ごく僅かに下端のみソフト fade (body 背景に滑らかに繋がる)
                    maskImage: "linear-gradient(to bottom, black 88%, rgba(0,0,0,0) 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 88%, rgba(0,0,0,0) 100%)",
                  }}
                />
              )}
              {(!heroImgLoaded || heroImgError) && (<>
              <svg width="100%" height="200" viewBox="0 0 380 200" preserveAspectRatio="xMidYMid slice">
                <rect width="380" height="200" fill="#f5ead0"/>
                <rect x="0" y="0" width="60" height="45" fill="#e8d9b8" rx="2"/><rect x="65" y="0" width="80" height="30" fill="#ddd0b0" rx="2"/><rect x="150" y="0" width="50" height="50" fill="#e8d9b8" rx="2"/><rect x="205" y="0" width="70" height="35" fill="#ddd0b0" rx="2"/><rect x="320" y="0" width="60" height="60" fill="#ddd0b0" rx="2"/>
                <rect x="0" y="50" width="45" height="55" fill="#e8d9b8" rx="2"/><rect x="110" y="55" width="65" height="50" fill="#e8d9b8" rx="2"/><rect x="180" y="40" width="50" height="60" fill="#ddd0b0" rx="2"/><rect x="235" y="38" width="80" height="45" fill="#e8d9b8" rx="2"/>
                <path d="M0 108 Q60 98 120 110 Q180 122 240 108 Q300 94 380 105 L380 128 Q300 118 240 132 Q180 146 120 132 Q60 118 0 130 Z" fill="#a8d8ea" opacity="0.85"/>
                <rect x="0" y="135" width="68" height="58" fill="#e8d9b8" rx="2"/><rect x="73" y="128" width="48" height="65" fill="#ddd0b0" rx="2"/><rect x="126" y="135" width="72" height="55" fill="#e8d9b8" rx="2"/><rect x="260" y="133" width="58" height="55" fill="#e8d9b8" rx="2"/>
                <line x1="0" y1="48" x2="380" y2="48" stroke="#fff9f0" strokeWidth="5"/><line x1="0" y1="98" x2="380" y2="98" stroke="#fff9f0" strokeWidth="5"/><line x1="0" y1="165" x2="380" y2="165" stroke="#fff9f0" strokeWidth="5"/>
                <line x1="60" y1="0" x2="60" y2="200" stroke="#fff9f0" strokeWidth="4"/><line x1="145" y1="0" x2="145" y2="200" stroke="#fff9f0" strokeWidth="4"/><line x1="235" y1="0" x2="235" y2="200" stroke="#fff9f0" strokeWidth="4"/><line x1="330" y1="0" x2="330" y2="200" stroke="#fff9f0" strokeWidth="4"/>
                <g transform="translate(90,65)"><circle cx="0" cy="0" r="10" fill="#ad001c"/><circle cx="0" cy="0" r="5" fill="#fff"/></g>
                <g transform="translate(200,75)"><circle cx="0" cy="0" r="8" fill="#ad001c" opacity="0.7"/><circle cx="0" cy="0" r="4" fill="#fff"/></g>
                <text x="155" y="120" fontSize="8" fill="#5a9ab5" fontWeight="700" opacity="0.9">Kamo River</text>
              </svg>
              <svg style={{ position: "absolute", top: -8, right: -8, opacity: 0.88, pointerEvents: "none" }} width="140" height="140" viewBox="0 0 160 160">
                <path d="M160 0 C145 20 125 35 105 55" stroke="#7a5230" strokeWidth="9" fill="none" strokeLinecap="round"/>
                <path d="M160 0 C148 25 140 40 130 60" stroke="#7a5230" strokeWidth="7" fill="none" strokeLinecap="round"/>
                <path d="M105 55 C88 68 72 78 55 88" stroke="#8a6340" strokeWidth="6" fill="none" strokeLinecap="round"/>
                <path d="M130 60 C115 72 100 80 85 92" stroke="#8a6340" strokeWidth="5" fill="none" strokeLinecap="round"/>
                <g transform="translate(100,52)"><g transform="rotate(0)"><ellipse cx="0" cy="-11" rx="5" ry="9" fill="#ffb7c5"/></g><g transform="rotate(72)"><ellipse cx="0" cy="-11" rx="5" ry="9" fill="#ffb7c5"/></g><g transform="rotate(144)"><ellipse cx="0" cy="-11" rx="5" ry="9" fill="#ffb7c5"/></g><g transform="rotate(216)"><ellipse cx="0" cy="-11" rx="5" ry="9" fill="#ffb7c5"/></g><g transform="rotate(288)"><ellipse cx="0" cy="-11" rx="5" ry="9" fill="#ffb7c5"/></g><circle cx="0" cy="0" r="4" fill="#fffde7"/><circle cx="0" cy="0" r="2" fill="#f9c74f"/></g>
                <g transform="translate(83,90)"><g transform="rotate(20)"><ellipse cx="0" cy="-12" rx="6" ry="10" fill="#ffb7c5"/></g><g transform="rotate(92)"><ellipse cx="0" cy="-12" rx="6" ry="10" fill="#ffb7c5"/></g><g transform="rotate(164)"><ellipse cx="0" cy="-12" rx="6" ry="10" fill="#ffb7c5"/></g><g transform="rotate(236)"><ellipse cx="0" cy="-12" rx="6" ry="10" fill="#ffb7c5"/></g><g transform="rotate(308)"><ellipse cx="0" cy="-12" rx="6" ry="10" fill="#ffb7c5"/></g><circle cx="0" cy="0" r="5" fill="#fffde7"/><circle cx="0" cy="0" r="2.5" fill="#f9c74f"/></g>
                <g transform="translate(52,86)"><g transform="rotate(5)"><ellipse cx="0" cy="-9" rx="4" ry="7" fill="#ffb7c5"/></g><g transform="rotate(77)"><ellipse cx="0" cy="-9" rx="4" ry="7" fill="#ffb7c5"/></g><g transform="rotate(149)"><ellipse cx="0" cy="-9" rx="4" ry="7" fill="#ffb7c5"/></g><g transform="rotate(221)"><ellipse cx="0" cy="-9" rx="4" ry="7" fill="#ffb7c5"/></g><g transform="rotate(293)"><ellipse cx="0" cy="-9" rx="4" ry="7" fill="#ffb7c5"/></g><circle cx="0" cy="0" r="3.5" fill="#fffde7"/><circle cx="0" cy="0" r="1.8" fill="#f9c74f"/></g>
              </svg>
              </>)}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.05) 100%)", zIndex: 2, pointerEvents: "none" }}/>
              <div style={{ position: "absolute", bottom: 16, left: 20, zIndex: 3 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ffffffee", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: "#2e8b57", marginBottom: 8 }}>📍 Kyoto, Japan</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.2, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)" }}>
                  Meet a <span style={{ color: "#a8eabf" }}>real local</span>,<br/>not a tour guide
                </div>
              </div>
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
                  placeholder="Temples, ramen, nightlife..."
                  style={{ background: "none", border: "none", outline: "none", fontSize: 14, fontWeight: 600, flex: 1, fontFamily: "inherit", color: "#1a1008" }}
                />
                <button
                  type="submit"
                  style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >
                  検索
                </button>
              </form>
            </div>

            {/* FILTERS */}
            <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, overflowX: "auto" }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{ background: activeFilter === f ? "#ad001c" : "#ffffffdd", border: `2px solid ${activeFilter === f ? "#ad001c" : "#f0d9b5"}`, borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: activeFilter === f ? "#fff" : "#8a7560", whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>{f}</button>
              ))}
            </div>

            {/* GUIDES */}
            <div style={{ padding: "0 20px 10px", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 900, background: "#ffffffdd", padding: "4px 10px", borderRadius: 10 }}>Available now ✨</div>
              <Link href="/guides/all" style={{ fontSize: 12, color: "#2e8b57", fontWeight: 800, background: "#ffffffdd", padding: "4px 10px", borderRadius: 10, textDecoration: "none" }}>See all &rarr;</Link>
            </div>

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
            ) : visibleGuides.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>No guides found</div>
            ) : (
              <div style={{ padding: "0 20px", display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {visibleGuides.map(g => (
                  <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={(() => { const s = modeCardStyle(g.mode); return { background: s.bg, border: `2px solid ${s.border}`, borderRadius: 20, padding: 16, minWidth: 152, cursor: "pointer", position: "relative" }; })()}>
                    {currentUserId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }}
                        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}
                        aria-label="お気に入り"
                      >
                        {savedIds.has(Number(g.id)) ? "❤️" : "🤍"}
                      </button>
                    )}
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 10, border: "2px solid #e8c99a", overflow: "hidden" }}>{g.avatarPath && avatarUrls[g.avatarPath] ? <img src={avatarUrls[g.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : g.emoji}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "#8a7560", marginBottom: 8, fontWeight: 600 }}>{g.uni}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {[...g.tags, ...g.languages].map(t => <span key={t} style={{ background: "#ffefd5", border: "1.5px solid #e8c99a", borderRadius: 6, padding: "3px 7px", fontSize: 10, color: "#ad001c", fontWeight: 700 }}>{t}</span>)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: g.mode === "free" ? "#2e8b57" : g.mode === "paid" ? "#2e8b57" : "#ad001c", fontWeight: 800 }}>{g.mode === "free" ? "🤝 Free" : g.rate}</span>
                      <span style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{ratingDisplay(g)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 100 }}/>
            {renderBottomNav("home")}
          </div>
        )}

        {/* GUIDE PROFILE (Tinder 風) */}
        {screen === "profile" && selectedGuide && (() => {
          const carouselImages: Array<{ src: string | null; path: string }> = [];
          if (selectedGuide.avatarPath) carouselImages.push({ src: avatarUrls[selectedGuide.avatarPath] ?? null, path: selectedGuide.avatarPath });
          for (const p of selectedGuide.image_paths) carouselImages.push({ src: galleryUrls[p] ?? null, path: p });
          const cur = carouselImages[profileImgIdx] ?? null;
          const total = carouselImages.length;
          const isOwn = currentUserId === selectedGuide.user_id;
          const isDemo = !selectedGuide.user_id;
          const age = selectedGuide.tour_count; // placeholder, real age would need birth_year
          return (
          <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* 画像エリア (Tinder 風: 70vh の大きな画像) */}
            <div style={{ position: "relative", height: "70vh", minHeight: 480, background: "#1a1008", overflow: "hidden" }}>
              {cur?.src ? (
                <img src={cur.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
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

              {/* トップバー: 戻る + 歯車 */}
              <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 14px", zIndex: 4 }}>
                <button onClick={goBack} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                <Link href="/settings" aria-label="設定" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
              </div>

              {/* 下部オーバーレイ (グラデ + テキスト) */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 18px 20px", background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))", color: "#fff", zIndex: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{selectedGuide.name}</span>
                  {selectedGuide.mode !== "free" && <span style={{ fontSize: 18 }}>✨</span>}
                  <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 10, background: selectedGuide.mode === "paid" ? "rgba(173,0,28,0.85)" : selectedGuide.mode === "free" ? "rgba(46,139,87,0.85)" : "rgba(26,16,8,0.85)" }}>
                    {selectedGuide.mode === "paid" ? "GUIDE" : selectedGuide.mode === "free" ? "MATE" : "MATE & GUIDE"}
                  </span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  🎓 {selectedGuide.uni}
                </div>
                <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  📍 {selectedGuide.areas.join(" · ")} 在住
                </div>
                {selectedGuide.bio && (
                  <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {selectedGuide.bio}
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
              {[[String(selectedGuide.tour_count), "Tours"], [selectedGuide.tour_count === 0 ? "新規" : selectedGuide.stars, "Rating"], [selectedGuide.languages.join("/"), "Languages"]].map(([n, l], i, arr) => (
                <div key={l} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: i < arr.length - 1 ? "2px solid #e8c99a" : "none" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#ad001c" }}>{n}</div>
                  <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                </div>
              ))}
            </div>

            {selectedGuide.mode !== "free" && (
              <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>Starting from</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#2e8b57" }}>{selectedGuide.rate}</span>
              </div>
            )}
            {selectedGuide.mode === "free" && (
              <div style={{ padding: "0 20px 12px", textAlign: "center", fontSize: 13, color: "#2e8b57", fontWeight: 900 }}>
                🤝 無料で会える mate よ
              </div>
            )}

            {isOwn ? (
              <div style={{ margin: "0 20px 80px", display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href={`/guides/${selectedGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  ✏️ プロファイル編集
                </Link>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>これはあなたのガイドプロファイルよ</div>
              </div>
            ) : (
              <>
                {/* sticky 下部: message + heart */}
                <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "2px solid #f0d9b5", padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", marginTop: "auto" }}>
                  {isDemo ? (
                    <button disabled style={{ flex: 1, background: "#bbb", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, cursor: "not-allowed", fontFamily: "inherit" }}>デモガイド・メッセージ不可</button>
                  ) : !currentUserId ? (
                    <Link href="/login" style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>ログインしてメッセージ</Link>
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
                      💬 message
                    </button>
                  ) : (
                    <Link href={`/chat-request/${selectedGuide.id}/new`} style={{ flex: 1, background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 15, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                      📨 メッセージリクエスト
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
                {currentUserId && selectedGuide.user_id && (
                  <div style={{ textAlign: "center", fontSize: 10, color: "#8a7560", fontWeight: 700, padding: "8px 20px 16px" }}>
                    <Link href={`/report/${selectedGuide.user_id}`} style={{ color: "#8a7560", textDecoration: "underline", marginRight: 12 }}>🚩 通報</Link>
                    {selectedGuide.mode !== "free" && (
                      <Link href={`/bookings/new?guide=${selectedGuide.id}`} style={{ color: "#2e8b57", textDecoration: "underline", fontWeight: 800 }}>📅 予約フォーム (有料)</Link>
                    )}
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
          <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={goBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
              <div
                onClick={() => chatPeer.guideId && openGuideProfile(chatPeer.guideId)}
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff28", border: "2px solid #ffffff50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: chatPeer.guideId ? "pointer" : "default", overflow: "hidden" }}
                title={chatPeer.guideId ? "ガイド詳細を見る" : undefined}
              >{(() => { const pg = chatPeer.guideId ? guides.find((x) => x.id === chatPeer.guideId) : null; return pg?.avatarPath && avatarUrls[pg.avatarPath] ? <img src={avatarUrls[pg.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : chatPeer.emoji; })()}</div>
              <div style={{ flex: 1, paddingLeft: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{chatPeer.name}</div>
                <div style={{ fontSize: 11, color: "#a8ffca", fontWeight: 700 }}>● Online now</div>
              </div>
              <Link
                href={`/report/${chatPeer.id}`}
                style={{ color: "#fff", fontSize: 16, textDecoration: "none", padding: 4 }}
                title="このユーザーを通報"
              >
                🚩
              </Link>
              <Link href="/settings" aria-label="設定" style={{ width: 30, height: 30, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {!currentUserId ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
                  ログインするとメッセージできるわよ
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
                  まだメッセージなし。最初の一言を送ってみて 👇
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const mine = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                        <div style={{ padding: "11px 15px", borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: mine ? "#ad001c" : "#fff9f0", color: mine ? "#fff" : "#1a1008", fontSize: 13, fontWeight: 600, lineHeight: 1.6, border: !mine ? "2px solid #e8c99a" : "none" }}>{m.body}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
            <div style={{ padding: "12px 20px 24px", display: "flex", gap: 10, alignItems: "center", background: "#fff9f0", borderTop: "2px solid #e8c99a" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={`Message ${chatPeer.name}...`}
                disabled={!currentUserId}
                style={{ flex: 1, background: "#ffefd5", border: "2px solid #e8c99a", borderRadius: 24, padding: "10px 16px", fontSize: 13, color: "#1a1008", fontFamily: "inherit", fontWeight: 600, outline: "none" }}
              />
              <button
                onClick={sendMessage}
                disabled={!currentUserId || !input.trim()}
                style={{ width: 40, height: 40, borderRadius: "50%", background: currentUserId ? "#ad001c" : "#bbb", border: "none", cursor: currentUserId ? "pointer" : "not-allowed", fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↑</button>
            </div>
          </div>
        )}

        {/* MY PROFILE */}
        {screen === "myprofile" && (
          <div className="screen-enter" style={{ minHeight: "100vh" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36 }}/>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>My profile</div>
              <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
            </div>
            <div style={{ padding: "28px 20px 16px", textAlign: "center" }}>
              <div
                onClick={() => ownGuide && openGuideProfile(ownGuide.id)}
                style={{ width: 90, height: 90, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 14px", border: "3px solid #ad001c", cursor: ownGuide ? "pointer" : "default", overflow: "hidden" }}
                title={ownGuide ? "自分のガイドプロファイルを開く" : undefined}
              >{ownGuide?.avatarPath && avatarUrls[ownGuide.avatarPath] ? <img src={avatarUrls[ownGuide.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (ownGuide?.emoji ?? "😊")}</div>
              {travelerProfile ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{travelerProfile.name}</div>
                  <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>
                    Traveler · From {travelerProfile.country}
                    {ownGuide && <span style={{ marginLeft: 6, color: "#ad001c" }}>+ ガイド「{ownGuide.name}」</span>}
                  </div>
                </>
              ) : ownGuide ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{ownGuide.name}</div>
                  <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>ガイド · {ownGuide.uni}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: "#8a7560" }}>プロファイル未登録</div>
                  <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600 }}>下のボタンから旅行者 or ガイドとして登録してね</div>
                </>
              )}
            </div>

            {travelerProfile && travelerProfile.image_paths.length > 0 && (
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -20px", padding: "0 20px" }}>
                  {travelerProfile.image_paths.map((p) => (
                    travelerImageUrls[p] ? (
                      <img
                        key={p}
                        src={travelerImageUrls[p]}
                        alt=""
                        onClick={() => travelerImageUrls[p] && setLightboxUrl(travelerImageUrls[p])}
                        style={{ width: 320, height: 320, borderRadius: 16, border: "2px solid #e8c99a", flexShrink: 0, objectFit: "cover", scrollSnapAlign: "center", cursor: "pointer" }}
                      />
                    ) : (
                      <div key={p} style={{ width: 320, height: 320, borderRadius: 16, border: "2px solid #e8c99a", flexShrink: 0, background: "#f0d9b5", animation: "pulse 1.4s ease-in-out infinite", scrollSnapAlign: "center" }} />
                    )
                  ))}
                </div>
              </div>
            )}

            {travelerProfile?.bio && (
              <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 16, margin: "0 20px 16px", fontSize: 13, color: "#555", lineHeight: 1.7, fontWeight: 600 }}>
                &ldquo;{travelerProfile.bio}&rdquo;
              </div>
            )}

            {travelerProfile && travelerProfile.interests.length > 0 && (
              <div style={{ padding: "0 20px", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, justifyContent: "center" }}>
                {travelerProfile.interests.map((t) => (
                  <span key={t} style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#2e8b57", fontWeight: 700 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {userEmail && (
              <div style={{ margin: "0 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>
                  ログイン中：{userEmail}
                </div>
                <Link href="/bookings" style={{ display: "block", width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  📅 予約一覧
                </Link>
                <Link href="/requests" style={{ display: "block", width: "100%", background: "#fff", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  📨 メッセージリクエスト
                </Link>
                {userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase()) && (
                  <Link href="/admin/analytics" style={{ display: "block", width: "100%", background: "#1a1008", color: "#fff", border: "none", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    📊 分析ダッシュボード (admin)
                  </Link>
                )}
                {ownGuide ? (
                  <Link href={`/guides/${ownGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    ✏️ ガイドプロファイルを編集
                  </Link>
                ) : (
                  <Link href="/guides/new" style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    + ガイドとして登録
                  </Link>
                )}
                {travelerProfile ? (
                  <Link href="/travelers/edit" style={{ display: "block", width: "100%", background: "#fff", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    ✏️ 旅行者プロファイルを編集
                  </Link>
                ) : (
                  <Link href="/travelers/new" style={{ display: "block", width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                    ✈ 旅行者として登録
                  </Link>
                )}
                <form action={signout}>
                  <button type="submit" style={{ width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                    ログアウト
                  </button>
                </form>
              </div>
            )}
            <div style={{ height: 100 }}/>
            {renderBottomNav("myprofile")}
          </div>
        )}

        {/* SAVED */}
        {screen === "saved" && (
          <div className="screen-enter" style={{ minHeight: "100vh" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36 }}/>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>Saved guides ❤️</div>
              <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
            </div>
            <div style={{ padding: "20px" }}>
              {!currentUserId ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
                  ログインするとお気に入り使えるわよ
                </div>
              ) : savedIds.size === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
                  まだお気に入りなし。ガイド詳細で 🤍 をタップして追加して
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {guides.filter((g) => savedIds.has(Number(g.id))).map((g) => (
                    <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={(() => { const s = modeCardStyle(g.mode); return { background: s.bg, border: `2px solid ${s.border}`, borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }; })()}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #e8c99a", overflow: "hidden" }}>{g.avatarPath && avatarUrls[g.avatarPath] ? <img src={avatarUrls[g.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : g.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600 }}>{g.uni}{g.mode !== "free" ? ` · ${g.rate}` : " · 🤝 Free"}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4 }}>❤️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 100 }}/>
            {renderBottomNav("saved")}
          </div>
        )}

        {/* INBOX */}
        {screen === "inbox" && (
          <div className="screen-enter" style={{ minHeight: "100vh" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={goBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>Messages 💬</div>
              <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
            </div>
            <div style={{ padding: "20px" }}>
              {!currentUserId ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
                  ログインするとメッセージ使えるわよ
                </div>
              ) : inboxPeers.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
                  まだ会話なし。ガイドにメッセージリクエスト → 承認されると会話開始
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {inboxPeers.map((p) => {
                    const unread = unreadByPeer[p.peerId] ?? 0;
                    return (
                      <div
                        key={p.peerId}
                        onClick={() => {
                          setChatPeer({ id: p.peerId, name: p.name, emoji: p.emoji, guideId: p.guideId });
                          setChatOrigin("inbox");
                          setScreen("chat");
                        }}
                        style={{ background: "#fff9f0", border: "2px solid #f0d9b5", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                      >
                        <div style={{ position: "relative" }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); if (p.guideId) openGuideProfile(p.guideId); }}
                            style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #e8c99a", cursor: p.guideId ? "pointer" : "default", overflow: "hidden" }}
                            title={p.guideId ? "ガイド詳細" : undefined}
                          >{(() => { const pg = p.guideId ? guides.find((x) => x.id === p.guideId) : null; return pg?.avatarPath && avatarUrls[pg.avatarPath] ? <img src={avatarUrls[pg.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.emoji; })()}</div>
                          {unread > 0 && (
                            <div style={{ position: "absolute", top: -4, right: -4, background: "#ad001c", color: "#fff", borderRadius: 10, minWidth: 20, height: 20, padding: "0 5px", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff9f0" }}>
                              {unread > 99 ? "99+" : unread}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: unread > 0 ? 900 : 700 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: unread > 0 ? "#1a1008" : "#8a7560", fontWeight: unread > 0 ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.lastBody}</div>
                        </div>
                        <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700 }}>{new Date(p.lastAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ height: 100 }}/>
            {renderBottomNav("inbox")}
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxUrl && (
          <div
            onClick={() => setLightboxUrl(null)}
            className="fade-enter"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}
          >
            <img src={lightboxUrl} alt="" className="zoom-enter" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
              style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.18)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, fontSize: 18, cursor: "pointer", fontWeight: 900 }}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <HomeInner />
    </Suspense>
  );
}
