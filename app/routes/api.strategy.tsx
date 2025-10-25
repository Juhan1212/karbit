import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import {
  createStrategy,
  getUserActiveStrategy,
  activateStrategy,
  deactivateStrategy,
  type CreateStrategyData,
} from "~/database/strategy";
import { hasActivePositions } from "~/database/position";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      throw redirect("/auth");
    }

    const user = await validateSession(token);
    if (!user) {
      throw redirect("/auth");
    }

    // 사용자의 활성 전략 조회
    const activeStrategy = await getUserActiveStrategy(user.id);

    return new Response(
      JSON.stringify({
        activeStrategy: activeStrategy || null,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Strategy API loader error:", error);
    return new Response(JSON.stringify({ activeStrategy: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      throw redirect("/auth");
    }

    const user = await validateSession(token);
    if (!user) {
      throw redirect("/auth");
    }

    const formData = await request.formData();
    const action = formData.get("action")?.toString();

    switch (action) {
      case "start": {
        // 자동매매 시작 - 새 전략 생성 및 활성화
        const strategyData: CreateStrategyData = {
          name: `자동매매 전략 ${new Date().toLocaleString("ko-KR")}`,
          seedAmount: parseFloat(formData.get("seedAmount")?.toString() || "0"),
          coinMode: (formData.get("coinMode")?.toString() || "manual") as
            | "manual"
            | "popular"
            | "all",
          selectedCoins: JSON.parse(
            formData.get("selectedCoins")?.toString() || "[]"
          ),
          entryRate: parseFloat(formData.get("entryRate")?.toString() || "0"),
          exitRate: parseFloat(formData.get("exitRate")?.toString() || "0"),
          seedDivision: parseInt(
            formData.get("seedDivision")?.toString() || "1"
          ),
          leverage: parseInt(formData.get("leverage")?.toString() || "1"),
          allowAverageDown: formData.get("allowAverageDown") === "true",
          allowAverageUp: formData.get("allowAverageUp") === "true",
          aiMode: formData.get("aiMode") === "true",
          webhookEnabled: formData.get("webhookEnabled") === "true",
          telegramEnabled: formData.get("telegramEnabled") === "true",
          backtestPeriod: formData.get("backtestPeriod")?.toString() || "3m",
          portfolioRebalancing: formData.get("portfolioRebalancing") === "true",
          tradeMode: (formData.get("tradeMode")?.toString() || "custom") as
            | "custom"
            | "auto",
        };

        // 새 전략 생성 및 활성화
        const newStrategy = await createStrategy(user.id, strategyData);

        return new Response(
          JSON.stringify({
            success: true,
            message: "자동매매가 시작되었습니다.",
            strategy: newStrategy,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "stop": {
        // 자동매매 중지 - 전략 비활성화
        await deactivateStrategy(user.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "자동매매가 중지되었습니다.",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "update": {
        // 자동매매 설정 변경
        // 실제 활성 포지션 체크
        const userHasActivePositions = await hasActivePositions(user.id);

        if (userHasActivePositions) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "포지션 강제 종료 후에 다시 시도해주십시오",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // 포지션이 없는 경우 기존 전략 비활성화 후 새 전략 생성
        await deactivateStrategy(user.id);

        const strategyData: CreateStrategyData = {
          name: `자동매매 전략 ${new Date().toLocaleString("ko-KR")} (수정됨)`,
          seedAmount: parseFloat(formData.get("seedAmount")?.toString() || "0"),
          coinMode: (formData.get("coinMode")?.toString() || "manual") as
            | "manual"
            | "popular"
            | "all",
          selectedCoins: JSON.parse(
            formData.get("selectedCoins")?.toString() || "[]"
          ),
          entryRate: parseFloat(formData.get("entryRate")?.toString() || "0"),
          exitRate: parseFloat(formData.get("exitRate")?.toString() || "0"),
          seedDivision: parseInt(
            formData.get("seedDivision")?.toString() || "1"
          ),
          leverage: parseInt(formData.get("leverage")?.toString() || "1"),
          allowAverageDown: formData.get("allowAverageDown") === "true",
          allowAverageUp: formData.get("allowAverageUp") === "true",
          aiMode: formData.get("aiMode") === "true",
          webhookEnabled: formData.get("webhookEnabled") === "true",
          telegramEnabled: formData.get("telegramEnabled") === "true",
          backtestPeriod: formData.get("backtestPeriod")?.toString() || "3m",
          portfolioRebalancing: formData.get("portfolioRebalancing") === "true",
          tradeMode: (formData.get("tradeMode")?.toString() || "custom") as
            | "custom"
            | "auto",
        };

        const updatedStrategy = await createStrategy(user.id, strategyData);

        return new Response(
          JSON.stringify({
            success: true,
            message: "자동매매 설정이 변경되었습니다.",
            strategy: updatedStrategy,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: "알 수 없는 액션입니다.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Strategy API action error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "서버 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
