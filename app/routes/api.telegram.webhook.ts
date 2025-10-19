import {
  findValidAuthToken,
  markTokenAsUsed,
  connectUserTelegram,
  getUserByChatId,
} from "~/database/telegram";
import { sendTelegramMessage, formatWelcomeMessage } from "~/services/telegram";
import { LoaderFunctionArgs } from "react-router";

/**
 * POST /api/telegram/webhook
 * 텔레그램 봇 Webhook 핸들러
 */
export async function action({ request }: LoaderFunctionArgs) {
  try {
    const update = await request.json();

    // 디버깅: 받은 업데이트 로그
    console.log("📨 Telegram Webhook Update:", JSON.stringify(update, null, 2));

    // 메시지가 없는 업데이트는 무시 (my_chat_member 등)
    if (!update.message) {
      console.log("⏭️  메시지가 없는 업데이트 무시");
      return Response.json({ ok: true });
    }

    // /start 명령어 처리
    if (update.message?.text?.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const username = update.message.chat.username;
      const firstName = update.message.chat.first_name;

      // 인증 토큰 추출
      const parts = update.message.text.split(" ");
      const authToken = parts[1];

      if (!authToken) {
        // 토큰이 없으면 이미 연동된 사용자인지 확인
        const existingUser = await getUserByChatId(chatId.toString());

        if (existingUser) {
          // 이미 연동된 사용자 - 환영 메시지
          await sendTelegramMessage(
            chatId,
            `👋 ${firstName || username}님, 환영합니다!\n\n✅ 이미 Karbit 계정과 연동되어 있습니다.\n\n━━━━━━━━━━━━━━━━━━━\n/status - 현재 상태 확인\n/settings - 알림 설정\n/help - 도움말`
          );
        } else {
          // 연동되지 않은 사용자 - 안내 메시지
          await sendTelegramMessage(
            chatId,
            "❌ 유효하지 않은 인증 링크입니다.\n\n🔗 Karbit 웹사이트에서 '텔레그램 연동하기' 버튼을 클릭하여 인증 링크를 받아주세요."
          );
        }
        return Response.json({ ok: true });
      }

      // 인증 토큰 확인
      const tokenRecord = await findValidAuthToken(authToken);

      if (!tokenRecord) {
        await sendTelegramMessage(
          chatId,
          "❌ 인증 토큰이 만료되었거나 유효하지 않습니다.\n\nKarbit 웹사이트에서 다시 시도해주세요."
        );
        return Response.json({ ok: true });
      }

      // 사용자 텔레그램 정보 연동
      await connectUserTelegram(
        tokenRecord.userId,
        chatId.toString(),
        username
      );

      // 토큰 사용 처리
      await markTokenAsUsed(tokenRecord.id);

      // 환영 메시지 전송
      await sendTelegramMessage(
        chatId,
        formatWelcomeMessage(firstName || username)
      );

      return Response.json({ ok: true });
    }

    // /status 명령어 처리
    if (update.message?.text === "/status") {
      const chatId = update.message.chat.id;

      // 사용자 정보 조회
      const user = await getUserByChatId(chatId.toString());

      if (!user) {
        await sendTelegramMessage(chatId, "❌ 연동된 계정을 찾을 수 없습니다.");
        return Response.json({ ok: true });
      }

      const statusMessage = `
📊 <b>계정 상태</b>

👤 <b>사용자:</b> ${user.name || "미설정"}
🔔 <b>알림:</b> ${user.telegramNotificationsEnabled ? "활성화 ✅" : "비활성화 ❌"}
📈 <b>총 진입 횟수:</b> ${user.totalEntryCount}회
💰 <b>누적 수익률:</b> ${user.totalProfitRate}%

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
      `.trim();

      await sendTelegramMessage(chatId, statusMessage);
      return Response.json({ ok: true });
    }

    // /settings 명령어 처리
    if (update.message?.text === "/settings") {
      const chatId = update.message.chat.id;

      const settingsMessage = `
⚙️ <b>알림 설정</b>

현재 알림 설정을 변경하려면 Karbit 웹사이트의 설정 페이지를 이용해주세요.

🌐 <a href="https://karbit.com/settings">설정 페이지로 이동</a>

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
      `.trim();

      await sendTelegramMessage(chatId, settingsMessage);
      return Response.json({ ok: true });
    }

    // /help 명령어 처리
    if (update.message?.text === "/help") {
      const chatId = update.message.chat.id;

      const helpMessage = `
❓ <b>도움말</b>

<b>사용 가능한 명령어:</b>
/status - 현재 계정 상태 확인
/settings - 알림 설정 변경
/help - 도움말 보기

<b>알림 종류:</b>
📊 주문 체결 알림
💰 수익/손실 알림
🚀 김치 프리미엄 알림
⚠️ 중요 시스템 알림

<b>문의:</b>
support@karbit.com

━━━━━━━━━━━━━━━━━━━
<i>Karbit 자동매매</i>
      `.trim();

      await sendTelegramMessage(chatId, helpMessage);
      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("텔레그램 webhook 처리 에러:", error);
    return Response.json({ ok: true }); // 텔레그램에는 항상 ok 응답
  }
}
