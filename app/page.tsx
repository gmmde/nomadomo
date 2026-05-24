"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "./lib/supabase/client";
import { signout } from "./actions/auth";

type Guide = {
  id: string;
  name: string;
  emoji: string;
  uni: string;
  tags: string[];
  languages: string[];
  rate: string;
  stars: string;
  bio: string;
  tour_count: number;
  user_id: string | null;
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
};

function ratingDisplay(g: { stars: string; tour_count: number }) {
  // 新規ガイド（実績ゼロ）は ★0.0 ではなく「✨ 新規」と出す
  if (g.tour_count === 0 || Number(g.stars) <= 0) return "✨ 新規";
  return `★ ${g.stars}`;
}

const filters = ["All", "🍜 Food", "⛩ Temples", "🌙 Nightlife", "🚲 Hidden spots", "🎨 Art"];

const filterKeyword: Record<string, string> = {
  "🍜 Food": "Food",
  "⛩ Temples": "Temples",
  "🌙 Nightlife": "Nightlife",
  "🚲 Hidden spots": "Hidden",
  "🎨 Art": "Art",
};

export default function Home() {
  const [screen, setScreen] = useState("home");
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [travelerProfile, setTravelerProfile] = useState<TravelerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const supabase = useMemo(() => createClient(), []);

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
      .select("name, country, interests")
      .maybeSingle()
      .then(({ data }) => {
        setTravelerProfile(
          data
            ? {
                name: data.name as string,
                country: data.country as string,
                interests: (data.interests as string[]) ?? [],
              }
            : null,
        );
      });
  }, [supabase, userEmail]);

  useEffect(() => {
    async function fetchGuides() {
      const { data, error } = await supabase
        .from("guides")
        .select("id, name, emoji, university, tags, languages, rate_per_hour, rating, bio, tour_count, user_id")
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
        uni: g.university ?? "",
        user_id: (g.user_id as string | null) ?? null,
        tags: g.tags ?? [],
        languages: g.languages ?? [],
        rate: `¥${Number(g.rate_per_hour).toLocaleString()}/hr`,
        stars: Number(g.rating).toFixed(1),
        bio: g.bio ?? "",
        tour_count: g.tour_count ?? 0,
      }));

      setGuides(mapped);
      if (mapped.length > 0) setSelectedGuide(mapped[0]);
      setLoading(false);
    }

    fetchGuides();
  }, [supabase]);

  // チャット画面が開いたら、選択中ガイドとのメッセージ履歴をロード + リアルタイム購読
  useEffect(() => {
    if (screen !== "chat" || !currentUserId || !selectedGuide?.user_id) {
      return;
    }
    const peerId = selectedGuide.user_id;
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
    })();

    const channel = supabase
      .channel(`chat-${currentUserId}-${peerId}`)
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
  }, [screen, currentUserId, selectedGuide?.user_id, supabase]);

  const visibleGuides =
    activeFilter === "All"
      ? guides
      : guides.filter((g) => g.tags.includes(filterKeyword[activeFilter] ?? ""));

  const sendMessage = async () => {
    if (!input.trim() || !currentUserId || !selectedGuide?.user_id) return;
    const body = input.trim();
    setInput("");
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      recipient_id: selectedGuide.user_id,
      body,
    });
    if (error) console.error("Send failed:", error.message);
  };

  return (
    <div style={{ background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", position: "relative" }}>

        {/* HOME */}
        {screen === "home" && (
          <div>
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
              </div>
            </div>

            {/* MAP BG HERO */}
            <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
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
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #f5ead0 100%)" }}/>
              <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ffffffee", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: "#2e8b57", marginBottom: 8 }}>📍 Kyoto, Japan</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.2, textShadow: "0 2px 12px #fff8" }}>
                  Meet a <span style={{ color: "#ad001c" }}>real local</span>,<br/>not a tour guide
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <div style={{ padding: "12px 20px" }}>
              <div style={{ background: "#ffffffee", border: "2px solid #e8c99a", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#ad001c", fontSize: 18 }}>🔍</span>
                <input placeholder="Temples, ramen, nightlife..." style={{ background: "none", border: "none", outline: "none", fontSize: 14, fontWeight: 600, flex: 1, fontFamily: "inherit", color: "#1a1008" }}/>
              </div>
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
              <div style={{ fontSize: 12, color: "#2e8b57", fontWeight: 800, background: "#ffffffdd", padding: "4px 10px", borderRadius: 10 }}>See all</div>
            </div>

            {loading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>Loading guides...</div>
            ) : visibleGuides.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>No guides found</div>
            ) : (
              <div style={{ padding: "0 20px", display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {visibleGuides.map(g => (
                  <div key={g.id} onClick={() => { setSelectedGuide(g); setScreen("profile"); }} style={{ background: "#ffffffee", border: "2px solid #f0d9b5", borderRadius: 20, padding: 16, minWidth: 152, cursor: "pointer" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 10, border: "2px solid #e8c99a" }}>{g.emoji}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "#8a7560", marginBottom: 8, fontWeight: 600 }}>{g.uni}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {[...g.tags, ...g.languages].map(t => <span key={t} style={{ background: "#ffefd5", border: "1.5px solid #e8c99a", borderRadius: 6, padding: "3px 7px", fontSize: 10, color: "#ad001c", fontWeight: 700 }}>{t}</span>)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#ad001c", fontWeight: 800 }}>{g.rate}</span>
                      <span style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{ratingDisplay(g)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 100 }}/>

            {/* BOTTOM NAV */}
            <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: "#2e8b57f5", borderTop: "2px solid #1e6b40", padding: "10px 0 22px", display: "flex", justifyContent: "space-around", zIndex: 10 }}>
              {[["🏠", "Home"], ["💬", "Messages"], ["🤍", "Saved"], ["😊", "Profile"]].map(([icon, label]) => (
                <div key={label} onClick={() => { if (label === "Messages") setScreen("chat"); if (label === "Profile") setScreen("myprofile"); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                  <div style={{ fontSize: 20, color: label === "Home" ? "#fff" : "#a8d5b8" }}>{icon}</div>
                  <div style={{ fontSize: 10, color: label === "Home" ? "#fff" : "#a8d5b8", fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GUIDE PROFILE */}
        {screen === "profile" && selectedGuide && (
          <div style={{ background: "#ffefd5", minHeight: "100vh" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>Guide profile</div>
              <div style={{ width: 36 }}/>
            </div>
            <div style={{ padding: "28px 20px 16px", textAlign: "center" }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 14px", border: "3px solid #ad001c" }}>{selectedGuide.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{selectedGuide.name}</div>
              <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>{selectedGuide.uni}</div>
            </div>
            <div style={{ display: "flex", margin: "0 20px 20px", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 18, overflow: "hidden" }}>
              {[[String(selectedGuide.tour_count), "Tours"], [selectedGuide.tour_count === 0 ? "新規" : selectedGuide.stars, "Rating"], [selectedGuide.languages.join("/"), "Languages"]].map(([n, l], i) => (
                <div key={l} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderRight: i < 2 ? "2px solid #e8c99a" : "none" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#ad001c" }}>{n}</div>
                  <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 16, margin: "0 20px 16px", fontSize: 13, color: "#555", lineHeight: 1.7, fontWeight: 600 }}>
              "{selectedGuide.bio}"
            </div>
            <div style={{ padding: "0 20px", display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {selectedGuide.tags.map(t => (
                <span key={t} style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#2e8b57", fontWeight: 700 }}>{t}</span>
              ))}
            </div>
            <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>Starting from</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#ad001c" }}>{selectedGuide.rate}</span>
            </div>
            {currentUserId && selectedGuide.user_id === currentUserId ? (
              <div style={{ margin: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href={`/guides/${selectedGuide.id}/edit`} style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  ✏️ プロファイル編集
                </Link>
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textAlign: "center" }}>
                  これはあなたのガイドプロファイルよ
                </div>
              </div>
            ) : (
              <button
                onClick={() => setScreen("chat")}
                disabled={!selectedGuide.user_id}
                title={!selectedGuide.user_id ? "デモガイドにはメッセージング不可" : undefined}
                style={{ margin: "0 20px", display: "block", width: "calc(100% - 40px)", background: selectedGuide.user_id ? "#ad001c" : "#bbb", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: selectedGuide.user_id ? "pointer" : "not-allowed", fontFamily: "inherit" }}
              >
                {selectedGuide.user_id ? `Message ${selectedGuide.name} 💬` : "デモガイド・メッセージ不可"}
              </button>
            )}
          </div>
        )}

        {/* CHAT */}
        {screen === "chat" && selectedGuide && (
          <div style={{ background: "#ffefd5", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setScreen("profile")} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff28", border: "2px solid #ffffff50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{selectedGuide.emoji}</div>
              <div style={{ flex: 1, paddingLeft: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{selectedGuide.name}</div>
                <div style={{ fontSize: 11, color: "#a8ffca", fontWeight: 700 }}>● Online now</div>
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {!currentUserId ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
                  ログインするとメッセージできるわよ
                </div>
              ) : !selectedGuide.user_id ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
                  このガイドはデモ表示用なのでメッセージ送信できないわ
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
                  まだメッセージなし。最初の一言を送ってみて 👇
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === currentUserId;
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                      <div style={{ padding: "11px 15px", borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: mine ? "#ad001c" : "#fff9f0", color: mine ? "#fff" : "#1a1008", fontSize: 13, fontWeight: 600, lineHeight: 1.6, border: !mine ? "2px solid #e8c99a" : "none" }}>{m.body}</div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: "12px 20px 24px", display: "flex", gap: 10, alignItems: "center", background: "#fff9f0", borderTop: "2px solid #e8c99a" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={`Message ${selectedGuide.name}...`}
                disabled={!currentUserId || !selectedGuide.user_id}
                style={{ flex: 1, background: "#ffefd5", border: "2px solid #e8c99a", borderRadius: 24, padding: "10px 16px", fontSize: 13, color: "#1a1008", fontFamily: "inherit", fontWeight: 600, outline: "none" }}
              />
              <button
                onClick={sendMessage}
                disabled={!currentUserId || !selectedGuide.user_id || !input.trim()}
                style={{ width: 40, height: 40, borderRadius: "50%", background: currentUserId && selectedGuide.user_id ? "#ad001c" : "#bbb", border: "none", cursor: currentUserId && selectedGuide.user_id ? "pointer" : "not-allowed", fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↑</button>
            </div>
          </div>
        )}

        {/* MY PROFILE */}
        {screen === "myprofile" && (
          <div style={{ background: "#ffefd5", minHeight: "100vh" }}>
            <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>My profile</div>
              <div style={{ width: 36 }}/>
            </div>
            <div style={{ padding: "28px 20px 16px", textAlign: "center" }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 14px", border: "3px solid #ad001c" }}>😊</div>
              {travelerProfile ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{travelerProfile.name}</div>
                  <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600 }}>Traveler · From {travelerProfile.country}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: "#8a7560" }}>プロファイル未登録</div>
                  <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600 }}>下のボタンから旅行者 or ガイドとして登録してね</div>
                </>
              )}
            </div>

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
                <Link href="/guides/new" style={{ display: "block", width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 900, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  + ガイドとして登録
                </Link>
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
          </div>
        )}

      </div>
    </div>
  );
}
