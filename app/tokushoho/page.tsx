"use client";

// 特定商取引法に基づく表記 (Commercial Transactions Act disclosure)。
// IMPORTANT: 本テンプレートは叩き台。本番リリース前に法律専門家のレビュー必須。
// 事業者情報（氏名・所在地・連絡先）は運営者本人の情報を記載済み。

import Link from "next/link";
import { useLang } from "@/app/lib/i18n";

export default function TokushohoPage() {
  const [lang] = useLang();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 18px 80px", background: "#fdf6ec", minHeight: "100vh", color: "#1a1008", fontFamily: "inherit", lineHeight: 1.7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/" aria-label={lang === "ja" ? "戻る" : "Back"} style={{ color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
          {lang === "ja" ? "特定商取引法に基づく表記" : "Commercial Transactions Act Disclosure"}
        </h1>
      </div>
      <div style={{ background: "#fff3cd", border: "1px solid #f5c649", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, fontWeight: 700, marginBottom: 18, lineHeight: 1.6, color: "#5a4a18" }}>
        {lang === "ja"
          ? "本表記は特定商取引法第11条に基づく事業者情報の開示です。"
          : "This disclosure is provided under Article 11 of Japan's Act on Specified Commercial Transactions."}
      </div>
      {lang === "ja" ? <TokushohoJA /> : <TokushohoEN />}
    </main>
  );
}

const dt: React.CSSProperties = { fontSize: 13, fontWeight: 900, color: "#ad001c", marginTop: 18, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".03em" };
const dd: React.CSSProperties = { fontSize: 14, marginBottom: 6 };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={dt}>{label}</div>
      <div style={dd}>{children}</div>
    </div>
  );
}

function TokushohoJA() {
  return (
    <div>
      <Row label="事業者名（販売業者）">殿井 賢太（個人事業）</Row>
      <Row label="運営統括責任者">殿井 賢太</Row>
      <Row label="所在地">個人運営のため非公開としています。<br /><span style={{ fontSize: 11.5, color: "#8a7560" }}>※請求があった場合は、下記連絡先より遅滞なく開示します。</span></Row>
      <Row label="連絡先">
        メール：<a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a>
        <br /><span style={{ fontSize: 11.5, color: "#8a7560" }}>※電話番号は請求があった場合に遅滞なく開示します。お問い合わせはメールまたはアプリ内「開発者に問い合わせる」よりお願いします。</span>
      </Row>
      <Row label="販売価格">
        ガイド（Pro ローカル）とのミーティング料金は、各ローカルが個別に設定します。料金は各ローカルのプロフィールおよび決済画面に税込で表示されます。
      </Row>
      <Row label="プラットフォーム手数料">
        当方は、有料ミーティングの成立時に、ローカルへの支払額からプラットフォーム手数料として <strong>料金の10%</strong> を申し受けます（旅行者の支払総額に変更はなく、ローカルへの振込額から控除されます）。料率は変更する場合があり、変更時は本ページおよびアプリ内で告知します。
      </Row>
      <Row label="商品代金以外の必要料金">
        本サービスの閲覧・登録・メッセージ送受信に必要な通信料はユーザーの負担となります。消費税は表示価格に含まれます。
      </Row>
      <Row label="支払方法">
        クレジットカード決済（Stripe, Inc. を通じて処理）。当方はクレジットカード番号を保持しません。
      </Row>
      <Row label="支払時期">
        旅行者がミーティングを申請した時点でカードの与信枠を確保（オーソリ）し、ローカルが承諾した時点で決済が確定（キャプチャ）されます。承諾されなかった場合または期限内に応答がなかった場合は自動的にキャンセルされ、与信は解放されます。
      </Row>
      <Row label="役務の提供時期">
        ローカルが承諾した後、当事者間で合意した日時にミーティング（オンラインでのやり取りおよび任意のオフラインでの面会）が提供されます。実際の案内・体験の内容および実施は、当該ローカルとユーザー間の取り決めによります。
      </Row>
      <Row label="返金・キャンセルについて">
        ローカルが承諾する前（決済確定前）であれば、申請はいつでもキャンセルでき、与信は解放されます（課金は発生しません）。ローカルが48時間以内に応答しない場合も自動的にキャンセル・解放されます。決済確定後のキャンセル・返金については、ミーティング実施前であれば、アプリ内「開発者に問い合わせる」または上記メールよりご連絡ください。個別の事情を確認のうえ対応します。サービスの性質上、役務の提供が完了した後の返金には応じられない場合があります。
      </Row>
      <Row label="動作環境">
        最新版の主要ウェブブラウザ（Chrome、Safari、Edge 等）。
      </Row>
      <div style={{ marginTop: 24, fontSize: 12.5 }}>
        本サービスの利用条件の詳細は<Link href="/terms" style={{ color: "#ad001c", textDecoration: "underline" }}>利用規約</Link>、個人情報の取扱いは<Link href="/privacy" style={{ color: "#ad001c", textDecoration: "underline" }}>プライバシーポリシー</Link>をご確認ください。
      </div>
    </div>
  );
}

function TokushohoEN() {
  return (
    <div>
      <Row label="Seller / Operator">Kenta Tonoi (sole proprietor / individual)</Row>
      <Row label="Operations manager">Kenta Tonoi</Row>
      <Row label="Address">Not published (individual operator).<br /><span style={{ fontSize: 11.5, color: "#8a7560" }}>Disclosed without delay upon request to the contact below.</span></Row>
      <Row label="Contact">
        Email: <a href="mailto:nomadomojp@gmail.com" style={{ color: "#ad001c" }}>nomadomojp@gmail.com</a>
        <br /><span style={{ fontSize: 11.5, color: "#8a7560" }}>A phone number will be disclosed without delay upon request. Please contact us by email or via the in-app &quot;Contact developer&quot; feature.</span>
      </Row>
      <Row label="Price">
        Fees for meetings with paid (Pro) locals are set individually by each local and are shown, tax included, on the local&apos;s profile and at checkout.
      </Row>
      <Row label="Platform fee">
        When a paid meeting is confirmed, we charge a platform fee of <strong>10% of the fee</strong>, deducted from the amount paid out to the local (the traveler&apos;s total is unchanged). This rate may change; any change will be announced here and in the app.
      </Row>
      <Row label="Additional costs">
        Internet/communication charges incurred when using the Service are borne by the user. Consumption tax is included in displayed prices.
      </Row>
      <Row label="Payment method">
        Credit card, processed via Stripe, Inc. We do not store card numbers.
      </Row>
      <Row label="Payment timing">
        Funds are authorized (held) when the traveler requests a meeting and captured when the local accepts. If not accepted or no response within the deadline, the request is automatically cancelled and the hold released.
      </Row>
      <Row label="Service delivery timing">
        After the local accepts, the meeting (online interaction and any optional offline meeting) takes place at the date and time agreed between the parties. The actual guidance/experience is arranged directly between the local and the user.
      </Row>
      <Row label="Refunds and cancellation">
        Before the local accepts (before capture), a request can be cancelled at any time and the hold is released (no charge). If the local does not respond within 48 hours, it is cancelled automatically. For cancellation or refund after capture but before the meeting takes place, please contact us via the in-app &quot;Contact developer&quot; feature or the email above; we will review the circumstances. Due to the nature of the service, refunds may not be available once the service has been provided.
      </Row>
      <Row label="System requirements">
        A current version of a major web browser (Chrome, Safari, Edge, etc.).
      </Row>
      <div style={{ marginTop: 24, fontSize: 12.5 }}>
        See the <Link href="/terms" style={{ color: "#ad001c", textDecoration: "underline" }}>Terms of Service</Link> for usage conditions and the <Link href="/privacy" style={{ color: "#ad001c", textDecoration: "underline" }}>Privacy Policy</Link> for how personal data is handled.
      </div>
    </div>
  );
}
