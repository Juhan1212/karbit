# 텔레그램 알림 사용 예시

## 개요

이 문서는 Karbit 프로젝트에서 텔레그램 알림을 전송하는 방법을 설명합니다.

## 파일 구조

```
app/
├── database/
│   └── telegram.ts          # 텔레그램 DB 레포지토리
├── services/
│   └── telegram.ts          # 텔레그램 서비스 (메시지 전송)
└── routes/
    ├── api.telegram.auth.ts    # 텔레그램 인증 API
    └── api.telegram.webhook.ts # 텔레그램 Webhook
```

## 1. 주문 체결 알림 전송

### 예시: 자동매매 주문 체결 시

```typescript
import { getUserChatId } from "~/database/telegram";
import { sendOrderNotification } from "~/services/telegram";

// 주문 체결 후
async function onOrderFilled(userId: number, order: any) {
  // 사용자의 chat_id 조회
  const chatId = await getUserChatId(userId);

  if (!chatId) {
    console.log("사용자가 텔레그램을 연동하지 않았습니다.");
    return;
  }

  // 주문 알림 전송
  const success = await sendOrderNotification(chatId, {
    symbol: order.symbol, // "BTC/USDT"
    type: order.side, // "BUY" | "SELL"
    price: order.price, // 45000
    amount: order.amount, // 0.1
    exchange: order.exchange, // "Binance"
    timestamp: new Date(),
  });

  if (success) {
    console.log(`✅ 주문 알림 전송 성공 (사용자 ID: ${userId})`);
  }
}
```

## 2. 김치 프리미엄 알림 전송

### 예시: 프리미엄이 5% 이상일 때

```typescript
import { getAllUsersWithTelegramEnabled } from "~/database/telegram";
import { sendPremiumNotification } from "~/services/telegram";

async function checkAndNotifyPremium() {
  // 프리미엄 계산
  const domesticPrice = 60000000; // ₩60,000,000
  const internationalPrice = 45000; // $45,000
  const exchangeRate = 1300;
  const premium = (domesticPrice / exchangeRate / internationalPrice - 1) * 100;

  if (premium >= 5) {
    // 알림이 활성화된 모든 사용자 조회
    const users = await getAllUsersWithTelegramEnabled();

    for (const user of users) {
      if (user.telegramChatId) {
        await sendPremiumNotification(
          user.telegramChatId,
          "BTC/USDT",
          domesticPrice,
          internationalPrice,
          premium
        );
      }
    }

    console.log(`✅ ${users.length}명에게 프리미엄 알림 전송 완료`);
  }
}
```

## 3. 특정 사용자에게 커스텀 메시지 전송

### 예시: 수익/손실 알림

```typescript
import { getUserChatId } from "~/database/telegram";
import { sendTelegramMessage } from "~/services/telegram";

async function notifyProfitLoss(
  userId: number,
  profit: number,
  percentage: number
) {
  const chatId = await getUserChatId(userId);

  if (!chatId) return;

  const emoji = profit > 0 ? "💰" : "📉";
  const status = profit > 0 ? "수익" : "손실";

  const message = `
${emoji} <b>포지션 ${status} 알림</b>

💵 <b>금액:</b> ${profit > 0 ? "+" : ""}$${Math.abs(profit).toLocaleString()}
📊 <b>수익률:</b> ${profit > 0 ? "+" : ""}${percentage.toFixed(2)}%
🕐 <b>시간:</b> ${new Date().toLocaleString("ko-KR")}

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매 알림</i>
  `.trim();

  await sendTelegramMessage(chatId, message);
}
```

## 4. 에러 알림 전송

### 예시: API 키 만료 또는 잔고 부족

```typescript
import { getUserChatId } from "~/database/telegram";
import { sendTelegramMessage } from "~/services/telegram";

async function notifyError(
  userId: number,
  errorType: string,
  errorMessage: string
) {
  const chatId = await getUserChatId(userId);

  if (!chatId) return;

  const message = `
⚠️ <b>시스템 알림</b>

<b>오류 유형:</b> ${errorType}
<b>상세 내용:</b> ${errorMessage}

대시보드에서 설정을 확인해주세요.
🌐 <a href="https://karbit.com/dashboard">대시보드 바로가기</a>

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
  `.trim();

  await sendTelegramMessage(chatId, message);
}

// 사용 예시
await notifyError(
  userId,
  "거래소 API 오류",
  "Binance API 키가 만료되었습니다."
);
await notifyError(userId, "잔고 부족", "거래 실행에 필요한 잔고가 부족합니다.");
```

## 5. 일괄 알림 전송 (브로드캐스트)

### 예시: 시스템 점검 공지

```typescript
import { getAllUsersWithTelegramEnabled } from "~/database/telegram";
import { sendTelegramMessage } from "~/services/telegram";

async function broadcastMaintenance(startTime: Date, endTime: Date) {
  const users = await getAllUsersWithTelegramEnabled();

  const message = `
🔧 <b>시스템 점검 안내</b>

안녕하세요, Karbit입니다.

<b>점검 시간:</b>
${startTime.toLocaleString("ko-KR")} - ${endTime.toLocaleString("ko-KR")}

점검 중에는 자동매매가 일시 중단됩니다.

양해 부탁드립니다.

━━━━━━━━━━━━━━━━━━━
<i>Karbit 운영팀</i>
  `.trim();

  let successCount = 0;

  for (const user of users) {
    if (user.telegramChatId) {
      const success = await sendTelegramMessage(user.telegramChatId, message);
      if (success) successCount++;

      // Rate limiting: 초당 30개 메시지 제한
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
  }

  console.log(`✅ ${successCount}/${users.length}명에게 공지 전송 완료`);
}
```

## 6. 전략 실행 알림

### 예시: 자동매매 전략 시작/종료

```typescript
import { getUserChatId } from "~/database/telegram";
import { sendTelegramMessage } from "~/services/telegram";

async function notifyStrategyStatus(
  userId: number,
  strategyName: string,
  action: "start" | "stop"
) {
  const chatId = await getUserChatId(userId);

  if (!chatId) return;

  const emoji = action === "start" ? "▶️" : "⏸️";
  const actionText = action === "start" ? "시작" : "종료";

  const message = `
${emoji} <b>전략 ${actionText} 알림</b>

📋 <b>전략명:</b> ${strategyName}
🕐 <b>시간:</b> ${new Date().toLocaleString("ko-KR")}

${action === "start" ? "자동매매가 시작되었습니다." : "자동매매가 종료되었습니다."}

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
  `.trim();

  await sendTelegramMessage(chatId, message);
}

// 사용 예시
await notifyStrategyStatus(userId, "김치 프리미엄 전략", "start");
await notifyStrategyStatus(userId, "김치 프리미엄 전략", "stop");
```

## 7. 실시간 포지션 업데이트

### 예시: 포지션 진입/청산 시

```typescript
import { getUserChatId } from "~/database/telegram";
import { sendTelegramMessage } from "~/services/telegram";

async function notifyPositionUpdate(
  userId: number,
  position: {
    action: "entry" | "exit";
    symbol: string;
    entryPrice: number;
    exitPrice?: number;
    profitLoss?: number;
    profitLossPercentage?: number;
  }
) {
  const chatId = await getUserChatId(userId);

  if (!chatId) return;

  if (position.action === "entry") {
    const message = `
📍 <b>포지션 진입</b>

💎 <b>종목:</b> ${position.symbol}
💵 <b>진입가:</b> $${position.entryPrice.toLocaleString()}
🕐 <b>시간:</b> ${new Date().toLocaleString("ko-KR")}

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
    `.trim();

    await sendTelegramMessage(chatId, message);
  } else {
    const profitEmoji = (position.profitLoss || 0) > 0 ? "💰" : "📉";
    const profitText = (position.profitLoss || 0) > 0 ? "수익" : "손실";

    const message = `
${profitEmoji} <b>포지션 청산 (${profitText})</b>

💎 <b>종목:</b> ${position.symbol}
📈 <b>진입가:</b> $${position.entryPrice.toLocaleString()}
📉 <b>청산가:</b> $${position.exitPrice?.toLocaleString()}
💵 <b>손익:</b> ${(position.profitLoss || 0) > 0 ? "+" : ""}$${Math.abs(position.profitLoss || 0).toLocaleString()}
📊 <b>수익률:</b> ${(position.profitLossPercentage || 0) > 0 ? "+" : ""}${(position.profitLossPercentage || 0).toFixed(2)}%
🕐 <b>시간:</b> ${new Date().toLocaleString("ko-KR")}

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
    `.trim();

    await sendTelegramMessage(chatId, message);
  }
}
```

## 8. 데이터베이스 함수 사용 예시

### 사용자 텔레그램 상태 확인

```typescript
import { getUserTelegramStatus } from "~/database/telegram";

const status = await getUserTelegramStatus(userId);

if (status?.telegramChatId && status.telegramNotificationsEnabled) {
  // 알림 전송
  await sendTelegramMessage(status.telegramChatId, "메시지 내용");
}
```

### 텔레그램 연동 해제

```typescript
import { disconnectUserTelegram } from "~/database/telegram";

await disconnectUserTelegram(userId);
```

### 알림 설정 토글

```typescript
import { toggleTelegramNotifications } from "~/database/telegram";

// 알림 활성화
await toggleTelegramNotifications(userId, true);

// 알림 비활성화
await toggleTelegramNotifications(userId, false);
```

## 주의사항

### 1. Rate Limiting

텔레그램 API는 초당 30개 메시지 제한이 있습니다. 대량 전송 시 지연을 추가하세요:

```typescript
for (const user of users) {
  await sendTelegramMessage(user.telegramChatId!, message);
  await new Promise((resolve) => setTimeout(resolve, 35)); // 35ms 대기
}
```

### 2. 에러 처리

메시지 전송 실패 시 적절히 처리하세요:

```typescript
const success = await sendTelegramMessage(chatId, message);

if (!success) {
  console.error(`텔레그램 메시지 전송 실패 (사용자 ID: ${userId})`);
  // 실패 로그 저장 또는 재시도 로직
}
```

### 3. HTML 이스케이프

메시지에 사용자 입력값을 포함할 때는 HTML 특수문자를 이스케이프하세요:

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const safeSymbol = escapeHtml(userInputSymbol);
const message = `<b>종목:</b> ${safeSymbol}`;
```

## 참고 자료

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [텔레그램 봇 설정 가이드](./TELEGRAM_SETUP.md)

---

**Built with ❤️ by Karbit Team**
