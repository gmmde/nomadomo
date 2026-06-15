"use client";

import { useEffect, useState, useTransition } from "react";
import { completeTutorial } from "../actions/user-settings";
import { useLang, t } from "../lib/i18n";

type Props = {
  onClose: () => void;
  appMode: "local" | "traveler" | null;
};

// 5 ステップの定義: targetSelector が無ければ中央モーダル表示
type Step = {
  selector?: string;       // ハイライト対象 (data-tutorial 属性)
  titleKey?: string;       // タイトル文 (i18n key)
  bodyKey: string;         // 本文 (i18n key)
  nextKey: string;         // 次へボタン文言
  showLogo?: boolean;      // Step 1 (Welcome) で logo を大きく表示
};

function buildSteps(appMode: "local" | "traveler" | null): Step[] {
  const isLocal = appMode === "local";
  return [
  // Step 1: Welcome
  { titleKey: "tut_welcome_title", bodyKey: "tut_welcome_body", nextKey: "tut_start_btn", showLogo: true },
  // Step 2: Home 一覧 (Local/Traveler で文言を出し分け)
  { selector: '[data-tutorial="home-list"]', titleKey: isLocal ? "tut_home_title_local" : "tut_home_title", bodyKey: isLocal ? "tut_home_body_local" : "tut_home_body", nextKey: "tut_next_btn" },
  // Step 3: モード切替 (歯車アイコン spotlight、本文で「ここから設定→モード切替」を案内)
  { selector: '[data-tutorial="settings-gear"]', titleKey: "tut_mode_title", bodyKey: "tut_mode_body", nextKey: "tut_next_btn" },
  // Step 4: Messages タブ
  { selector: '[data-tutorial="nav-messages"]', titleKey: "tut_msg_title", bodyKey: "tut_msg_body", nextKey: "tut_next_btn" },
  // Step 5: 完了
  { titleKey: "tut_done_title", bodyKey: "tut_done_body", nextKey: "tut_finish_btn" },
  ];
}

// ハイライト枠の余白
const PAD = 8;
// ツールチップカード幅 / 上下マージン
const CARD_W = 300;
const CARD_GAP = 16;

export default function TutorialOverlay({ onClose, appMode }: Props) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [pending, startTransition] = useTransition();
  const [lang] = useLang();

  const STEPS = buildSteps(appMode);
  const step = STEPS[idx];
  const total = STEPS.length;
  const isFinal = idx === total - 1;

  // viewport 取得
  useEffect(() => {
    function updateSize() {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // 対象 element の rect を計測 (selector 変更時 + 再計測タイマー)
  useEffect(() => {
    if (!step.selector) { setRect(null); return; }
    let cancelled = false;
    function recompute() {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(step.selector!);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }
    recompute();
    // requestAnimationFrame で layout 後にもう一度測る
    const raf = requestAnimationFrame(recompute);
    // fallback poll (画像 load 等で rect が後から変わる場合)
    const t1 = setTimeout(recompute, 120);
    const t2 = setTimeout(recompute, 400);
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [step.selector]);

  function finishAndClose() {
    startTransition(async () => {
      await completeTutorial();
      onClose();
    });
  }

  function handleNext() {
    if (isFinal) {
      finishAndClose();
    } else {
      setIdx((i) => Math.min(i + 1, total - 1));
    }
  }

  // カード位置: rect があれば上下どちらかに、なければ中央
  const cardStyle = computeCardStyle(rect, vw, vh);
  // ハイライト枠 (rect 周りの 4 辺バックドロップ)
  const haloRect = rect ? {
    left: Math.max(0, rect.left - PAD),
    top: Math.max(0, rect.top - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        fontFamily: "inherit",
        // 暗転背景を疑似要素無しに統一: 一旦 transparent にして spotlight に頼る
        background: haloRect ? "transparent" : "rgba(20, 8, 4, 0.72)",
        backdropFilter: haloRect ? "none" : "blur(2px)",
        WebkitBackdropFilter: haloRect ? "none" : "blur(2px)",
        animation: "tutFadeIn 220ms ease-out",
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
    >
      {/* SVG マスクで spotlight を切り抜く (rect ある時のみ) */}
      {haloRect && (
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          aria-hidden="true"
        >
          <defs>
            <mask id="tut-spot-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={haloRect.left}
                y={haloRect.top}
                width={haloRect.width}
                height={haloRect.height}
                rx={14}
                ry={14}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(20, 8, 4, 0.72)" mask="url(#tut-spot-mask)" />
          {/* spotlight 枠線 */}
          <rect
            x={haloRect.left}
            y={haloRect.top}
            width={haloRect.width}
            height={haloRect.height}
            rx={14}
            ry={14}
            fill="none"
            stroke="#2e8b57"
            strokeWidth={3}
            strokeDasharray="6 4"
            style={{ animation: "tutPulse 1.4s ease-in-out infinite" }}
          />
        </svg>
      )}

      {/* スキップボタン (右上、最終ステップ以外) */}
      {!isFinal && (
        <button
          onClick={finishAndClose}
          disabled={pending}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "rgba(255, 239, 213, 0.85)",
            color: "#1a1008",
            border: "2px solid #e8c99a",
            borderRadius: 18,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 800,
            cursor: pending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            zIndex: 2,
          }}
          aria-label={t("tut_skip", lang)}
        >
          {t("tut_skip", lang)} ×
        </button>
      )}

      {/* メインカード */}
      <div style={{ ...cardStyle, zIndex: 2 }} className="tut-card-enter">
        {/* ステップ番号 */}
        <div
          style={{
            display: "inline-block",
            background: "#ad001c",
            color: "#fff",
            borderRadius: 12,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          {idx + 1} / {total}
        </div>

        {/* Welcome step: logo を大きく */}
        {step.showLogo && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 16,
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: -0.5,
            }}
          >
            <span style={{ color: "#2ecc71" }}>Noma</span>
            <span style={{ color: "#ad001c" }}>Domo</span>
          </div>
        )}

        {step.titleKey && (
          <div
            style={{
              fontSize: step.showLogo ? 18 : 16,
              fontWeight: 900,
              color: "#1a1008",
              marginBottom: 10,
              textAlign: step.showLogo ? "center" : "left",
              lineHeight: 1.4,
            }}
          >
            {t(step.titleKey, lang)}
          </div>
        )}

        <div
          style={{
            fontSize: 13,
            color: "#3a2818",
            fontWeight: 600,
            lineHeight: 1.6,
            marginBottom: 18,
            whiteSpace: "pre-wrap",
            textAlign: step.showLogo || isFinal ? "center" : "left",
          }}
        >
          {t(step.bodyKey, lang)}
        </div>

        <button
          onClick={handleNext}
          disabled={pending}
          style={{
            width: "100%",
            background: isFinal ? "#2e8b57" : "#ad001c",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: 14,
            fontSize: 14,
            fontWeight: 900,
            cursor: pending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.3,
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          {t(step.nextKey, lang)}
        </button>
      </div>

      {/* keyframes (inline scoped) */}
      <style>{`
        @keyframes tutFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tutPulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.4 }
        }
        .tut-card-enter {
          animation: tutCardEnter 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes tutCardEnter {
          from { opacity: 0; transform: translate(-50%, calc(var(--tut-y, 0%) + 8px)) }
          to { opacity: 1; transform: translate(-50%, var(--tut-y, 0%)) }
        }
      `}</style>
    </div>
  );
}

// カード配置: rect がある時はその上 or 下に置く、無ければ画面中央
function computeCardStyle(rect: DOMRect | null, vw: number, vh: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    width: Math.min(CARD_W, vw - 32),
    background: "#ffefd5",
    border: "3px solid #2e8b57",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 12px 36px rgba(0,0,0,0.32)",
    left: "50%",
  };
  if (!rect || vh === 0) {
    return {
      ...base,
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  const cardEstHeight = 260;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  // 下に十分なスペースがあれば下、無ければ上、どちらも無ければ中央
  if (spaceBelow > cardEstHeight + CARD_GAP + 24) {
    return {
      ...base,
      top: rect.bottom + CARD_GAP,
      transform: "translate(-50%, 0)",
    };
  }
  if (spaceAbove > cardEstHeight + CARD_GAP + 24) {
    return {
      ...base,
      top: rect.top - CARD_GAP,
      transform: "translate(-50%, -100%)",
    };
  }
  return {
    ...base,
    top: "50%",
    transform: "translate(-50%, -50%)",
  };
}
