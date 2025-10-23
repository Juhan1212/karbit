# 텔레그램 봇 설정 가이드

## 개요

Karbit은 단일 텔레그램 봇을 통해 모든 사용자에게 개별화된 알림을 제공합니다. 각 사용자는 고유한 `chat_id`를 통해 자신의 트레이딩 알림만 받게 됩니다.

## 아키텍처

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│   사용자 A   │───────▶│  Karbit Bot  │◀───────│   사용자 B   │
│  (chat_id_A) │        │   (단일 봇)   │        │  (chat_id_B) │
└─────────────┘        └──────────────┘        └─────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Database │
                        │  users   │
                        └──────────┘
```

### 동작 방식

1. **사용자가 "텔레그램 연동" 버튼 클릭**
   - 서버에서 일회용 인증 토큰 생성 (10분 유효)
   - 텔레그램 딥링크 생성: `https://t.me/KarbitBot?start={TOKEN}`

2. **사용자가 딥링크 클릭**
   - 텔레그램 앱이 자동으로 열림
   - `/start {TOKEN}` 명령어 자동 전송

3. **봇이 토큰 검증 및 연동**
   - 인증 토큰 유효성 확인
   - 사용자의 `chat_id` 획득
   - DB에 `chat_id` 저장
   - 환영 메시지 전송

4. **알림 전송**
   - 주문 발생 시 해당 사용자의 `chat_id`로 메시지 전송
   - 각 사용자는 자신의 알림만 받음

## 1단계: BotFather로 봇 생성

### 1.1 BotFather 시작

1. 텔레그램에서 [@BotFather](https://t.me/BotFather) 검색
2. `/start` 명령어 전송

### 1.2 새 봇 생성

```
/newbot
```

- **봇 이름**: Karbit Trading Bot
- **봇 사용자명**: KarbitTradingBot (또는 사용 가능한 다른 이름)

### 1.3 봇 토큰 저장

BotFather가 제공하는 토큰을 안전하게 저장:

```
8343048488:AAH7tP0ILe897MOCptIx0zZ49oiru5Kik9c
```

### 1.4 봇 설명 설정

```
/setdescription
```

```
Karbit 자동매매 플랫폼의 공식 알림 봇입니다.
실시간 트레이딩 알림, 수익/손실 알림, 김치 프리미엄 알림을 받아보세요.
```

### 1.5 봇 정보 설정

```
/setabouttext
```

```
Karbit 자동매매 알림 봇 🚀
웹사이트: https://karbit.com
```

### 1.6 봇 프로필 사진 설정 (선택사항)

```
/setuserpic
```

## 2단계: 환경 변수 설정

`.env` 파일에 다음을 추가:

```env
TELEGRAM_BOT_TOKEN=8343048488:AAH7tP0ILe897MOCptIx0zZ49oiru5Kik9c
TELEGRAM_BOT_USERNAME=KarbitTradingBot
TELEGRAM_WEBHOOK_URL=https://karbit.com/api/telegram/webhook
```

## 3단계: Webhook 설정

### 개발 환경 (ngrok 사용)

1. ngrok 설치 및 실행:

```bash
ngrok http 3000
```

2. ngrok URL 복사 (예: `https://abc123.ngrok.io`)

3. Webhook 설정 스크립트 실행:

```bash
curl -X POST "https://api.telegram.org/bot8343048488:AAH7tP0ILe897MOCptIx0zZ49oiru5Kik9c/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://15a50c707194.ngrok-free.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### 프로덕션 환경

1. 도메인 SSL 인증서 확인 (필수)

2. Webhook 설정:

```bash
curl -X POST "https://api.telegram.org/bot8343048488:AAH7tP0ILe897MOCptIx0zZ49oiru5Kik9c/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://karbit.world/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### Webhook 확인

```bash
curl "https://api.telegram.org/bot8343048488:AAH7tP0ILe897MOCptIx0zZ49oiru5Kik9c/getWebhookInfo"
```

응답 예시:

```json
{
  "ok": true,
  "result": {
    "url": "https://karbit.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": "",
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }
}
```

## 4단계: 데이터베이스 마이그레이션

```bash
npm run db:generate
npm run db:migrate
```

## 5단계: 서버 실행 및 테스트

### 5.1 서버 실행

```bash
npm run dev
```

### 5.2 웹에서 연동 테스트

1. Karbit 웹사이트 로그인
2. 대시보드 또는 설정 페이지로 이동
3. "텔레그램 연동하기" 버튼 클릭
4. 텔레그램 앱이 자동으로 열림
5. `/start` 명령어 자동 전송
6. "연동 완료" 메시지 확인

### 5.3 봇 명령어 테스트

텔레그램에서 다음 명령어 테스트:

- `/status` - 계정 상태 확인
- `/settings` - 알림 설정
- `/help` - 도움말

## 6단계: 알림 전송 예시

### 주문 체결 알림

```typescript
import {
  sendTelegramMessage,
  formatOrderNotification,
} from "~/services/telegram";

// 사용자의 chat_id 조회
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

if (user?.telegramChatId && user.telegramNotificationsEnabled) {
  const order = {
    symbol: "BTC/USDT",
    type: "BUY" as const,
    price: 45000,
    amount: 0.1,
    exchange: "Binance",
    timestamp: new Date(),
  };

  const message = formatOrderNotification(order);
  await sendTelegramMessage(user.telegramChatId, message);
}
```

### 김치 프리미엄 알림

```typescript
import { sendTelegramMessage, formatPremiumAlert } from "~/services/telegram";

const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

if (user?.telegramChatId && user.telegramNotificationsEnabled) {
  const message = formatPremiumAlert(
    "BTC/USDT",
    60000000, // ₩60,000,000
    45000, // $45,000
    5.5 // 5.5% 프리미엄
  );

  await sendTelegramMessage(user.telegramChatId, message);
}
```

## 보안 고려사항

### 1. 인증 토큰

- 10분 유효 기간
- 일회용 (한 번 사용 후 무효화)
- 암호화된 랜덤 64자 문자열

### 2. Webhook 보안

- HTTPS 필수
- 서버 측 토큰 검증
- Rate Limiting 적용 권장

### 3. 개인정보 보호

- `chat_id`는 민감 정보로 취급
- DB에 암호화 저장 권장
- 연동 해제 시 즉시 삭제

## 문제 해결

### Webhook이 작동하지 않음

```bash
# Webhook 삭제
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"

# Webhook 재설정
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### 봇이 응답하지 않음

1. 봇 토큰 확인
2. Webhook URL 확인
3. 서버 로그 확인
4. 텔레그램 서버 상태 확인

### 메시지가 전송되지 않음

1. `chat_id` 확인
2. 사용자가 봇을 차단했는지 확인
3. 텔레그램 API 응답 로그 확인

## 참고 자료

- [Telegram Bot API 공식 문서](https://core.telegram.org/bots/api)
- [BotFather 가이드](https://core.telegram.org/bots#6-botfather)
- [Webhook 가이드](https://core.telegram.org/bots/webhooks)

---

**Built with ❤️ by Karbit Team**
