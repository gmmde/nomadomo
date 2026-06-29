"use client";

// 利用規約 (Terms of Service) — 初期 β 版。
// IMPORTANT: 本テンプレートはあくまで叩き台。本番リリース前に
// 法律専門家のレビュー必須。

import Link from "next/link";
import { useLang } from "@/app/lib/i18n";
import { CURRENT_TERMS_VERSION } from "@/app/lib/legal";

export default function TermsPage() {
  const [lang] = useLang();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 18px 80px", background: "#fdf6ec", minHeight: "100vh", color: "#1a1008", fontFamily: "inherit", lineHeight: 1.7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/" aria-label="戻る" style={{ color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
          {lang === "ja" ? "利用規約" : "Terms of Service"}
        </h1>
      </div>
      <div style={{ fontSize: 11, color: "#8a7560", marginBottom: 12 }}>
        {lang === "ja" ? `バージョン ${CURRENT_TERMS_VERSION}` : `Version ${CURRENT_TERMS_VERSION}`}
      </div>
      {/* 18+ 警告バナー (法的に必須の明示) */}
      <div style={{ background: "#ad001c", color: "#fff", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 800, marginBottom: 18, lineHeight: 1.5 }}>
        ⚠️ {lang === "ja"
          ? "本サービスは満18歳以上の方のみご利用いただけます。18歳未満の方は登録および利用ができません。"
          : "This service is for users aged 18 or older only. Users under 18 may not register or use the service."}
      </div>
      {lang === "ja" ? <TermsJA /> : <TermsEN />}
    </main>
  );
}

const h2: React.CSSProperties = { fontSize: 16, fontWeight: 900, marginTop: 28, marginBottom: 8, color: "#1a1008" };
const p: React.CSSProperties = { fontSize: 14, marginBottom: 10 };

function TermsJA() {
  return (
    <div>
      <p style={p}>
        この利用規約（以下「本規約」）は、下記の運営者（以下「当方」）が提供するウェブアプリケーション「NomaDomo」（以下「本サービス」）の利用条件を定めるものです。本サービスを利用される方（以下「ユーザー」）は、本規約に同意の上、本サービスを利用するものとします。
      </p>

      <h2 style={h2}>運営者情報</h2>
      <p style={p}>本サービスは、法人ではなく個人により運営されています。</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>運営者：殿井 賢太</li>
        <li>所在地：〒606-8315 京都府京都市左京区吉田近衛町69 京都大学吉田寮</li>
        <li>連絡先：<a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></li>
      </ul>
      <p style={p}>有料取引に関する詳細は、<Link href="/tokushoho" style={{ color: "#ad001c", textDecoration: "underline" }}>特定商取引法に基づく表記</Link>をご確認ください。</p>

      <h2 style={h2}>第1条（適用範囲）</h2>
      <p style={p}>本規約は、ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されます。</p>

      <h2 style={h2}>第2条（利用資格）</h2>
      <p style={p}>本サービスは <strong>満18歳以上</strong> の方のみご利用いただけます。18歳未満の方は本サービスを利用することができません。</p>

      <h2 style={h2}>第3条（アカウント登録）</h2>
      <p style={p}>ユーザーは、当方の定める方法によりアカウントを登録するものとし、登録情報には真実かつ正確な内容を記載するものとします。</p>
      <p style={p}>ユーザーは、自己の責任において ID およびパスワード（または認証手段）を管理し、第三者に利用させてはなりません。</p>

      <h2 style={h2}>第4条（本サービスの内容）</h2>
      <p style={p}>本サービスは、日本国内に住む「ローカル（Local）」と、日本を訪れる「旅行者（Traveler）」を出会わせる場の提供を目的とします。本サービスはあくまで両者のマッチングを促進するプラットフォームを提供するものであり、ローカルが提供するガイド・案内・体験等のサービスは、当該ローカルとユーザー間の契約・実施事項であって、当方はその内容・品質・履行について責任を負いません。</p>

      <h2 style={h2}>第5条（決済・料金）</h2>
      <p style={p}>有料（Pro）ローカルとのミーティングについては、Stripe, Inc.（以下「Stripe」）の決済サービスを通じて料金が処理されます。Stripe の利用には Stripe 独自の利用規約およびプライバシーポリシーが適用されます。</p>
      <p style={p}>料金は事前承認（Authorize）方式で確保され、ローカルがミーティングを承諾した時点で確定（Capture）されます。承諾されなかった場合または期限内に応答がなかった場合は自動的にキャンセル・解放されます。</p>

      <h2 style={h2}>第6条（禁止事項）</h2>
      <p style={p}>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
      <ol style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為または犯罪を助長する行為</li>
        <li>他のユーザー、当方、第三者に対する嫌がらせ、誹謗中傷、差別的言動</li>
        <li>性的サービス、わいせつ物の提供・要求・あっせん</li>
        <li>未成年者との不適切な接触の試み</li>
        <li>他人になりすます行為、虚偽の登録</li>
        <li>本サービスの運営を妨害する行為</li>
        <li>本サービスが提供する有料ガイド（Pro）機能の正当な利用を除き、当方の事前の許可なく本サービスを商業利用する行為</li>
        <li>本サービス内で取得した他ユーザーの個人情報を本サービス外で利用する行為</li>
        <li>その他、当方が不適切と判断する行為</li>
      </ol>

      <h2 style={h2}>第7条（オフラインでの出会いについて）</h2>
      <p style={p}>本サービスはオンラインでのマッチングを提供するものであり、オフラインでの実際の出会いについては、ユーザー自身の判断と責任において行うものとします。当方は、ユーザー間のオフラインでの出会いに関連して発生したいかなる事故、損害、トラブルについても責任を負いません。</p>
      <p style={p}>初対面の相手と会う際は、公共の場所を選ぶ、第三者に予定を伝える等、ご自身の安全に十分配慮してください。</p>

      <h2 style={h2}>第8条（コンテンツ）</h2>
      <p style={p}>ユーザーが本サービスに投稿したプロフィール、メッセージ、画像等（以下「ユーザーコンテンツ」）の著作権はユーザーに帰属します。ただしユーザーは、本サービスの提供・改善・宣伝のために必要な範囲で、当方が無償・非独占的にユーザーコンテンツを利用することを許諾します。</p>
      <p style={p}>ユーザーは、ユーザーコンテンツについて、第三者の権利を侵害していないこと、および投稿する権限を有していることを保証します。</p>

      <h2 style={h2}>第9条（利用停止・アカウント削除）</h2>
      <p style={p}>当方は、ユーザーが本規約に違反した場合または違反の疑いがあると判断した場合、事前の通知なくユーザーの利用を停止し、またはアカウントを削除することができます。</p>
      <p style={p}>ユーザーは、いつでも自己の判断によりアカウントの削除を申請することができます。削除申請後30日間は復元可能とし、30日経過後に当該ユーザーの登録情報および関連データは原則として削除されます。</p>

      <h2 style={h2}>第10条（免責事項）</h2>
      <p style={p}>本サービスは現状有姿（as-is）で提供されます。当方は、本サービスが特定の目的に適合すること、エラーや不具合がないこと、継続的に利用可能であることを保証しません。</p>
      <p style={p}>当方は、本サービスの利用に関連してユーザーに生じたいかなる損害（特別損害、間接損害、逸失利益を含む）についても、当方の故意または重過失による場合を除き、責任を負いません。</p>
      <p style={p}>当方が責任を負う場合であっても、その責任の範囲は、当該ユーザーが過去1か月間に本サービスに対して支払った金額を上限とします。</p>

      <h2 style={h2}>第11条（規約の変更）</h2>
      <p style={p}>当方は、必要と判断した場合、ユーザーに事前に通知することなく本規約を変更することができます。重要な変更については、本サービス上で告知し、再度の同意を求めることがあります。</p>

      <h2 style={h2}>第12条（準拠法・裁判管轄）</h2>
      <p style={p}>本規約は日本法に準拠して解釈されるものとします。本サービスに関して当方とユーザーとの間で紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>

      <h2 style={h2}>第13条（お問い合わせ）</h2>
      <p style={p}>本規約に関するお問い合わせは、アプリ内の「開発者に問い合わせる」機能、または以下のメールアドレスまでお願いします。</p>
      <p style={p}><a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></p>

      <div style={{ marginTop: 30, fontSize: 11, color: "#8a7560" }}>
        最終更新日：{CURRENT_TERMS_VERSION}
      </div>
    </div>
  );
}

function TermsEN() {
  return (
    <div>
      <p style={p}>These Terms of Service (&quot;Terms&quot;) govern your use of the NomaDomo web application (the &quot;Service&quot;) operated by the individual operator identified below (&quot;we&quot;, &quot;us&quot;). By using the Service, you agree to be bound by these Terms.</p>

      <h2 style={h2}>Operator</h2>
      <p style={p}>The Service is operated by an individual, not a corporation.</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>Operator: Kenta Tonoi</li>
        <li>Address: Kyoto University Yoshida Dormitory, 69 Yoshida-Konoe-cho, Sakyo-ku, Kyoto 606-8315, Japan</li>
        <li>Contact: <a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></li>
      </ul>
      <p style={p}>For details on paid transactions, please see the <Link href="/tokushoho" style={{ color: "#ad001c", textDecoration: "underline" }}>Commercial Transactions Act Disclosure</Link>.</p>

      <h2 style={h2}>1. Scope</h2>
      <p style={p}>These Terms apply to all aspects of your use of the Service.</p>

      <h2 style={h2}>2. Eligibility</h2>
      <p style={p}>You must be <strong>at least 18 years old</strong> to use the Service. Users under 18 are prohibited.</p>

      <h2 style={h2}>3. Account Registration</h2>
      <p style={p}>You agree to provide accurate, complete information when registering. You are responsible for safeguarding your authentication credentials.</p>

      <h2 style={h2}>4. The Service</h2>
      <p style={p}>The Service connects locals living in Japan with travelers visiting Japan. We provide the matching platform only; any guide, tour, experience or other service offered by a local is a separate arrangement between that local and the user, and we are not responsible for the content, quality, or fulfillment of those arrangements.</p>

      <h2 style={h2}>5. Payments</h2>
      <p style={p}>Payments for meetings with paid (Pro) locals are processed through Stripe, Inc. (&quot;Stripe&quot;), whose own terms and privacy policy apply.</p>
      <p style={p}>Funds are authorized at the time of the meeting request and captured only when the local accepts. Unaccepted or expired requests are automatically cancelled and the hold is released.</p>

      <h2 style={h2}>6. Prohibited Conduct</h2>
      <p style={p}>You agree NOT to:</p>
      <ol style={{ paddingLeft: 20, fontSize: 14 }}>
        <li>Violate any law or public order;</li>
        <li>Commit, facilitate, or promote criminal activity;</li>
        <li>Harass, defame, threaten, or discriminate against any user or third party;</li>
        <li>Offer, request, or facilitate sexual services or obscene content;</li>
        <li>Attempt to contact minors inappropriately;</li>
        <li>Impersonate others or provide false registration information;</li>
        <li>Interfere with the operation of the Service;</li>
        <li>Use the Service for commercial purposes without prior written permission, except for the legitimate use of the paid (Pro) guide features provided by the Service;</li>
        <li>Use other users&apos; personal information obtained through the Service outside of the Service;</li>
        <li>Engage in any conduct we deem inappropriate.</li>
      </ol>

      <h2 style={h2}>7. Offline Meetings</h2>
      <p style={p}>The Service provides online matching only. Any offline meeting is undertaken at your own risk and discretion. We disclaim all liability for incidents, damages, or disputes arising from offline encounters between users.</p>
      <p style={p}>When meeting strangers, please prioritize your safety: choose public locations, share your plans with a trusted third party.</p>

      <h2 style={h2}>8. Content</h2>
      <p style={p}>You retain copyright in the profile, messages, and images you submit (&quot;User Content&quot;). You grant us a non-exclusive, royalty-free license to use User Content as reasonably necessary to operate, improve, and promote the Service.</p>
      <p style={p}>You warrant that your User Content does not infringe any third-party rights and that you have the authority to post it.</p>

      <h2 style={h2}>9. Suspension and Termination</h2>
      <p style={p}>We may suspend or terminate your access without prior notice if you violate these Terms or if we reasonably suspect a violation.</p>
      <p style={p}>You may request account deletion at any time. Deleted accounts are recoverable for 30 days; after that period your registration data and related records will be permanently removed.</p>

      <h2 style={h2}>10. Disclaimers</h2>
      <p style={p}>The Service is provided &quot;as is&quot;. We make no warranty that the Service will meet any particular purpose, be error-free, or be continuously available.</p>
      <p style={p}>To the maximum extent permitted by law, we are not liable for any damages (including special, indirect, or consequential damages, and lost profits) arising out of your use of the Service, except in cases of our willful misconduct or gross negligence.</p>
      <p style={p}>Where we are liable, our aggregate liability is capped at the amount you paid to the Service in the one (1) month preceding the event giving rise to the liability.</p>

      <h2 style={h2}>11. Changes to These Terms</h2>
      <p style={p}>We may amend these Terms at any time. Material changes will be announced in the Service, and we may ask for renewed consent.</p>

      <h2 style={h2}>12. Governing Law and Jurisdiction</h2>
      <p style={p}>These Terms are governed by the laws of Japan. The Tokyo District Court shall have exclusive jurisdiction of first instance over any dispute arising in connection with the Service.</p>

      <h2 style={h2}>13. Contact</h2>
      <p style={p}>For inquiries, please use the in-app &quot;Contact developer&quot; feature, or email:</p>
      <p style={p}><a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a></p>

      <div style={{ marginTop: 30, fontSize: 11, color: "#8a7560" }}>
        Last updated: {CURRENT_TERMS_VERSION}
      </div>
    </div>
  );
}
