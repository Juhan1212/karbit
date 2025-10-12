import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import {
  saveExchangeConnection,
  disconnectExchange,
  getUserExchangeConnections,
} from "~/database/exchange";
import { KoreanExchangeType } from "~/types/exchange";
import { createExchangeAdapter } from "~/exchanges";

// 거래소별 테스트 함수
async function testExchangeConnection(
  exchangeName: string,
  apiKey: string,
  secret: string,
  passphrase?: string
) {
  try {
    // 어댑터를 사용한 연결 테스트
    const adapter = createExchangeAdapter(exchangeName as KoreanExchangeType, {
      apiKey,
      apiSecret: secret,
      passphrase,
    });

    // 잔액 조회로 연결 테스트
    const balance = await adapter.getBalance();

    // balance.error가 있으면 예외 throw
    if (balance && balance.error) {
      throw new Error(balance.error);
    }

    return {
      success: true,
      exchangeName,
      message: `${exchangeName} 연결에 성공했습니다.`,
      data: {
        balance,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error(`${exchangeName} 연결 테스트 실패:`, error);

    // 에러 메시지 분석 및 사용자 친화적 메시지 변환
    let userMessage = `${exchangeName} 연결에 실패했습니다.`;

    if (
      error.message?.includes("Invalid API key") ||
      error.message?.includes("401")
    ) {
      userMessage = "API 키가 올바르지 않습니다. 다시 확인해주세요.";
    } else if (
      error.message?.includes("Invalid signature") ||
      error.message?.includes("403")
    ) {
      userMessage = "API 시크릿이 올바르지 않습니다. 다시 확인해주세요.";
    } else if (
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    ) {
      userMessage =
        "네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.";
    }

    return {
      success: false,
      exchangeName,
      message: userMessage,
      data: null,
    };
  }
}

export async function loader({ request }: ActionFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await validateSession(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const connections = await getUserExchangeConnections(user.id);
    return new Response(JSON.stringify({ connections }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get exchanges error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await validateSession(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = request.headers.get("content-type");
    let formData;

    if (contentType?.includes("application/json")) {
      const body = await request.json();
      formData = new FormData();
      Object.entries(body).forEach(([key, value]) => {
        formData!.append(key, value as string);
      });
    } else {
      formData = await request.formData();
    }

    const action = formData.get("action") as string;

    switch (action) {
      case "connect": {
        const exchangeName = formData.get("exchangeName") as string;
        const apiKey = formData.get("apiKey") as string;
        const secretKey = formData.get("secretKey") as string;
        const passphrase = formData.get("passphrase") as string;

        if (!exchangeName || !apiKey || !secretKey) {
          return new Response(
            JSON.stringify({ error: "필수 정보가 누락되었습니다." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // 거래소 연결 테스트
        const testResult = await testExchangeConnection(
          exchangeName,
          apiKey,
          secretKey,
          passphrase
        );

        if (!testResult.success) {
          return new Response(JSON.stringify(testResult), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 연결 정보 저장
        await saveExchangeConnection(user.id, exchangeName, apiKey, secretKey);

        return new Response(
          JSON.stringify({
            success: true,
            message: `${exchangeName} 연결이 성공적으로 저장되었습니다.`,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "disconnect": {
        const exchangeName = formData.get("exchangeName") as string;

        if (!exchangeName) {
          return new Response(
            JSON.stringify({ error: "거래소 이름이 필요합니다." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        await disconnectExchange(user.id, exchangeName);

        return new Response(
          JSON.stringify({
            success: true,
            message: `${exchangeName} 연결이 해제되었습니다.`,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "지원하지 않는 액션입니다." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Exchange action error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
