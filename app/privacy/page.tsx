"use client";

// プライバシーポリシー — 初期 β 版。
// IMPORTANT: 本テンプレートは叩き台。本番リリース前に法律専門家のレビュー必須。

import Link from "next/link";
import { useLang } from "@/app/lib/i18n";
import { CURRENT_PRIVACY_VERSION } from "@/app/lib/legal";

export default function PrivacyPage() {
  const [lang] = useLang();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 18px 80px", background: "#fdf6ec", minHeight: "100vh", color: "#1a1008", fontFamily: "inherit", lineHeight: 1.7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/" aria-label="戻る" style={{ color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
          {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
        </h1>
      </div>
      <div style={{ fontSize: 11, color: "#8a7560", marginBottom: 12 }}>
        {lang === "ja" ? `バージョン ${CURRENT_PRIVACY_VERSION}` : `Version ${CURRENT_PRIVACY_VERSION}`}
      </div>
      <div style={{ background: "#ad001c", color: "#fff", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 800, marginBottom: 18, lineHeight: 1.5 }}>
        ⚠️ {lang === "ja"
          ? "本サービスは満18歳以上の方のみご利用いただけます。"
          : "This service is for users aged 18 or older only."}
      </div>
      {lang === "ja" ? <PrivacyJA /> : <PrivacyEN />}
    </main>
  );
}

const h2: React.CSSProperties = { fontSize: 16, fontWeight: 900, marginTop: 28, marginBottom: 8, color: "#1a1008" };
const p: React.CSSProperties = { fontSize: 14, marginBottom: 10 };

function PrivacyJA() {
  return (
    <div>
      <p style={p}>NomaDomo サービス提供者（以下「当方」）は、ユーザーの個人情報を以下のとおり取り扱います。</p>

      <h2 style={h2}>1. 取得する情報</h2>
      <p style={p}>本サービスでは、以下の情報を取得することがあります。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li><strong>登録情報</strong>：メールアドレス、表示名、プロフィール（自己紹介、興味、職業、性別、生年、国籍、エリア等）、プロフィール画像</li>
        <li><strong>位置情報</strong>：エリア自動選択をご利用いただいた場合の緯度経度（端末側で最寄りエリアを算出するためのみ使用し、当方サーバーには送信しません）</li>
        <li><strong>利用情報</strong>：チャットメッセージ、画像添付、ミーティング履歴、ブロックリスト、レビュー</li>
        <li><strong>決済情報</strong>：当方は <strong>クレジットカード番号を一切保持しません</strong>。決済情報はすべて Stripe, Inc. が直接処理します。当方は Stripe から決済の結果（成功/失敗、金額、決済ID）のみを受け取ります。</li>
        <li><strong>技術情報</strong>：IPアドレス、ブラウザ種別、デバイス情報、Cookie、エラーログ</li>
      </ul>

      <h2 style={h2}>2. 利用目的</h2>
      <p style={p}>取得した情報は、以下の目的で利用します。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>本サービスの提供・運営</li>
        <li>ユーザー間のマッチング・コミュニケーション機能の提供</li>
        <li>本人確認、不正利用の防止</li>
        <li>サポート対応</li>
        <li>本サービスの改善・新機能の開発</li>
        <li>重要なお知らせや通知の配信（ご本人の同意がある場合のみプッシュ通知・メールを送信）</li>
        <li>統計データの作成（個人を特定できない形式でのみ）</li>
      </ul>

      <h2 style={h2}>3. 第三者への提供</h2>
      <p style={p}>当方は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>ユーザーの同意がある場合</li>
        <li>法令に基づく開示要請がある場合</li>
        <li>本サービスの提供に必要な業務委託先（後述）に対し、必要な範囲で提供する場合</li>
        <li>合併・事業譲渡等により事業を承継する場合</li>
      </ul>

      <h2 style={h2}>4. 業務委託先（処理を委託する第三者）</h2>
      <p style={p}>本サービスの運営にあたり、以下の事業者にデータ処理を委託しています。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li><strong>Supabase, Inc.</strong>（米国） — データベース・認証・ストレージのホスティング</li>
        <li><strong>Vercel Inc.</strong>（米国） — アプリケーションのホスティング</li>
        <li><strong>Stripe, Inc.</strong>（米国） — 決済処理</li>
        <li><strong>Functional Software, Inc. (Sentry)</strong>（米国） — エラーログ収集</li>
      </ul>
      <p style={p}>これらの事業者はいずれも、それぞれの利用規約とプライバシーポリシーに基づき適切なデータ保護措置を講じています。</p>

      <h2 style={h2}>5. 国外移転について</h2>
      <p style={p}>前項のとおり、ユーザーの個人情報は米国に所在するサーバーに保管されます。日本国外への個人情報の移転にあたっては、適切な保護措置を講じています。</p>

      <h2 style={h2}>6. Cookie および類似技術</h2>
      <p style={p}>本サービスは、認証セッションの維持および利用状況の把握のために Cookie および類似技術を使用します。ブラウザの設定により Cookie の受け入れを拒否することができますが、その場合本サービスの一部の機能をご利用いただけなくなる可能性があります。</p>

      <h2 style={h2}>7. 保存期間</h2>
      <p style={p}>個人情報は、利用目的の達成に必要な期間に限り保存します。アカウント削除のお申し込みから30日経過後、ユーザーの登録情報および関連データは原則として削除されます。ただし、法令上の保存義務がある情報（決済記録等）については、当該義務が定める期間保存します。</p>

      <h2 style={h2}>8. ユーザーの権利</h2>
      <p style={p}>ユーザーは、ご自身の個人情報について、以下の権利を有します。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>開示の請求</li>
        <li>内容の訂正・追加・削除</li>
        <li>利用停止</li>
        <li>第三者への提供の停止</li>
      </ul>
      <p style={p}>権利行使をご希望の場合は、本ポリシー末尾の窓口までご連絡ください。</p>

      <h2 style={h2}>9. 安全管理措置</h2>
      <p style={p}>当方は、個人情報の漏洩・滅失・毀損の防止のため、合理的かつ適切な技術的・組織的措置を講じます。具体的には、通信の暗号化（HTTPS）、Row Level Security によるデータベース層でのアクセス制御、定期的なセキュリティ監査等を実施しています。</p>

      <h2 style={h2}>10. 未成年者の利用</h2>
      <p style={p}>本サービスは18歳以上の方を対象としており、18歳未満の方の個人情報を意図的に収集することはありません。18歳未満の方の情報が誤って収集されたことが判明した場合は、速やかに削除します。</p>

      <h2 style={h2}>11. ポリシーの変更</h2>
      <p style={p}>当方は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は、本サービス上で告知し、必要に応じて再度の同意を求めます。</p>

      <h2 style={h2}>12. お問い合わせ</h2>
      <p style={p}>個人情報の取扱いに関するお問い合わせは、以下までお願いします。</p>
      <p style={p}><a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></p>

      <div style={{ marginTop: 30, fontSize: 11, color: "#8a7560" }}>
        最終更新日：{CURRENT_PRIVACY_VERSION}
      </div>
    </div>
  );
}

function PrivacyEN() {
  return (
    <div>
      <p style={p}>NomaDomo (the &quot;Service&quot;) handles your personal data as described below.</p>

      <h2 style={h2}>1. Information We Collect</h2>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li><strong>Registration data</strong>: email, display name, profile (bio, interests, occupation, gender, birth year, nationality, area), profile photo.</li>
        <li><strong>Location</strong>: when you use the &quot;Use my location&quot; feature, your latitude/longitude is processed <em>locally on your device</em> to find the nearest area. Coordinates are not transmitted to our servers.</li>
        <li><strong>Usage data</strong>: chat messages, image attachments, meeting history, block list, reviews.</li>
        <li><strong>Payment data</strong>: <strong>we do not store any credit card information</strong>. Payments are processed directly by Stripe, Inc. We only receive the outcome (success/failure, amount, payment ID).</li>
        <li><strong>Technical data</strong>: IP address, browser type, device info, cookies, error logs.</li>
      </ul>

      <h2 style={h2}>2. How We Use Your Data</h2>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>To provide and operate the Service;</li>
        <li>To enable matching and communication between users;</li>
        <li>For identity verification and abuse prevention;</li>
        <li>For customer support;</li>
        <li>To improve the Service and develop new features;</li>
        <li>To send important notices (push or email, only with your consent);</li>
        <li>To produce aggregated, non-identifiable statistics.</li>
      </ul>

      <h2 style={h2}>3. Sharing with Third Parties</h2>
      <p style={p}>We do not share your personal data with third parties except:</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>With your consent;</li>
        <li>When required by law;</li>
        <li>With our processors listed below, within the scope necessary;</li>
        <li>In connection with a merger or business transfer.</li>
      </ul>

      <h2 style={h2}>4. Service Providers (Processors)</h2>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li><strong>Supabase, Inc.</strong> (USA) — database, authentication, storage hosting</li>
        <li><strong>Vercel Inc.</strong> (USA) — application hosting</li>
        <li><strong>Stripe, Inc.</strong> (USA) — payment processing</li>
        <li><strong>Functional Software, Inc. (Sentry)</strong> (USA) — error log collection</li>
      </ul>

      <h2 style={h2}>5. International Transfers</h2>
      <p style={p}>Your personal data may be stored on servers located outside Japan, including the United States. Appropriate safeguards are in place for such transfers.</p>

      <h2 style={h2}>6. Cookies and Similar Technologies</h2>
      <p style={p}>We use cookies for authentication and usage analytics. You may disable cookies in your browser, but some features may stop working.</p>

      <h2 style={h2}>7. Retention</h2>
      <p style={p}>We retain personal data only as long as necessary for the purposes stated. After 30 days from an account deletion request, your registration data and related records will be permanently removed, except as required by law (e.g. payment records).</p>

      <h2 style={h2}>8. Your Rights</h2>
      <p style={p}>You have the right to access, correct, delete, restrict the use of, and object to the sharing of your personal data. To exercise these rights, contact us at the address below.</p>

      <h2 style={h2}>9. Security</h2>
      <p style={p}>We implement reasonable technical and organizational measures, including HTTPS, database-level Row Level Security, and periodic security audits.</p>

      <h2 style={h2}>10. Minors</h2>
      <p style={p}>The Service is intended for users aged 18 and over. We do not knowingly collect data from anyone under 18. If we learn that we have, we will delete it promptly.</p>

      <h2 style={h2}>11. Changes</h2>
      <p style={p}>We may update this Policy. Material changes will be announced in the Service, and we may request renewed consent.</p>

      <h2 style={h2}>12. Contact</h2>
      <p style={p}><a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></p>

      <div style={{ marginTop: 30, fontSize: 11, color: "#8a7560" }}>
        Last updated: {CURRENT_PRIVACY_VERSION}
      </div>
    </div>
  );
}
