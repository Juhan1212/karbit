import crypto from "crypto";

// 텔레그램 봇 설정
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "KarbitBot";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// 텔레그램 메시지 타입
interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: any;
}

// 주문 알림 타입
interface OrderNotification {
  symbol: string;
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  exchange: string;
  timestamp: Date;
}

/**
 * 텔레그램 메시지 전송
 */
export async function sendTelegramMessage(
  chatId: string | number,
  message: string,
  parseMode: "Markdown" | "HTML" = "HTML"
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("텔레그램 메시지 전송 실패:", data);
      return false;
    }

    console.log(`✅ 텔레그램 메시지 전송 성공 (chat_id: ${chatId})`);
    return true;
  } catch (error) {
    console.error("텔레그램 메시지 전송 에러:", error);
    return false;
  }
}

/**
 * 주문 알림 메시지 포맷
 */
export function formatOrderNotification(order: OrderNotification): string {
  const emoji = order.type === "BUY" ? "🟢" : "🔴";
  const typeText = order.type === "BUY" ? "매수" : "매도";

  return `
${emoji} <b>${typeText} 주문 체결</b>

📊 <b>종목:</b> ${order.symbol}
💰 <b>가격:</b> $${order.price.toLocaleString()}
📦 <b>수량:</b> ${order.amount}
🏦 <b>거래소:</b> ${order.exchange}
🕐 <b>시간:</b> ${order.timestamp.toLocaleString("ko-KR")}

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매 알림</i>
  `.trim();
}

/**
 * 프리미엄 알림 메시지 포맷
 */
export function formatPremiumAlert(
  symbol: string,
  domesticPrice: number,
  internationalPrice: number,
  premium: number
): string {
  const emoji = premium > 5 ? "🚀" : premium > 3 ? "📈" : "📊";

  return `
${emoji} <b>김치 프리미엄 알림</b>

💎 <b>종목:</b> ${symbol}
🇰🇷 <b>국내가격:</b> ₩${domesticPrice.toLocaleString()}
🌍 <b>해외가격:</b> $${internationalPrice.toLocaleString()}
📊 <b>프리미엄:</b> ${premium.toFixed(2)}%

━━━━━━━━━━━━━━━━━━━
<i>Karbit 김치 프리미엄 알림</i>
  `.trim();
}

/**
 * 환영 메시지
 */
export function formatWelcomeMessage(username?: string): string {
  const greeting = username ? `${username}님, 환영합니다!` : "환영합니다!";

  return `
🎉 <b>${greeting}</b>

Karbit 텔레그램 봇이 성공적으로 연동되었습니다!

이제 다음 알림을 실시간으로 받으실 수 있습니다:
📊 주문 체결 알림
💰 수익/손실 알림
🚀 김치 프리미엄 알림
⚠️ 중요 시스템 알림

━━━━━━━━━━━━━━━━━━━
<b>알림 설정</b>
/settings - 알림 설정 변경
/help - 도움말 보기
/status - 현재 상태 확인

<i>행복한 트레이딩 되세요! 🚀</i>
  `.trim();
}

/**
 * 인증 토큰 생성
 */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 텔레그램 딥링크 생성
 */
export function generateTelegramDeepLink(authToken: string): string {
  // 텔레그램 봇 딥링크: https://t.me/BOT_USERNAME?start=AUTH_TOKEN
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${authToken}`;
}

/**
 * Webhook 설정
 */
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Webhook 설정 실패:", data);
      return false;
    }

    console.log("✅ Telegram Webhook 설정 성공:", webhookUrl);
    return true;
  } catch (error) {
    console.error("Webhook 설정 에러:", error);
    return false;
  }
}

/**
 * Webhook 제거
 */
export async function deleteWebhook(): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
      method: "POST",
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Webhook 제거 실패:", data);
      return false;
    }

    console.log("✅ Telegram Webhook 제거 성공");
    return true;
  } catch (error) {
    console.error("Webhook 제거 에러:", error);
    return false;
  }
}

/**
 * 봇 정보 가져오기
 */
export async function getBotInfo() {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      console.error("봇 정보 가져오기 실패:", data);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error("봇 정보 가져오기 에러:", error);
    return null;
  }
}

/**
 * 사용자에게 주문 알림 전송
 */
export async function sendOrderNotification(
  chatId: string,
  order: OrderNotification
): Promise<boolean> {
  const message = formatOrderNotification(order);
  return await sendTelegramMessage(chatId, message);
}

/**
 * 사용자에게 프리미엄 알림 전송
 */
export async function sendPremiumNotification(
  chatId: string,
  symbol: string,
  domesticPrice: number,
  internationalPrice: number,
  premium: number
): Promise<boolean> {
  const message = formatPremiumAlert(
    symbol,
    domesticPrice,
    internationalPrice,
    premium
  );
  return await sendTelegramMessage(chatId, message);
}
