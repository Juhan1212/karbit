import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { database } from "./context";
import { strategies, users, userPlanHistory } from "./schema";
import { preciseAdd, safeNumeric, CRYPTO_DECIMALS } from "~/utils/decimal";

export interface CreateStrategyData {
  name: string;
  seedAmount: number;
  coinMode: "manual" | "popular" | "all";
  selectedCoins?: string[];
  entryRate: number;
  exitRate: number;
  seedDivision: number;
  leverage: number;
  allowAverageDown: boolean;
  allowAverageUp: boolean;
  aiMode: boolean;
  webhookEnabled?: boolean;
  telegramEnabled?: boolean;
  backtestPeriod: string;
  portfolioRebalancing?: boolean;
}

export interface UpdateStrategyData extends Partial<CreateStrategyData> {
  id: number;
}

/**
 * 새로운 전략을 생성하고 사용자에게 할당합니다
 */
export async function createStrategy(userId: number, data: CreateStrategyData) {
  const db = database();

  return await db.transaction(async (tx: any) => {
    // 새 전략 생성
    const [strategy] = await tx
      .insert(strategies)
      .values({
        name: data.name,
        seedAmount: data.seedAmount.toString(),
        coinMode: data.coinMode,
        selectedCoins: data.selectedCoins,
        entryRate: data.entryRate.toString(),
        exitRate: data.exitRate.toString(),
        seedDivision: data.seedDivision,
        leverage: data.leverage,
        allowAverageDown: data.allowAverageDown,
        allowAverageUp: data.allowAverageUp,
        aiMode: data.aiMode,
        webhookEnabled: data.webhookEnabled || false,
        telegramEnabled: data.telegramEnabled || false,
        backtestPeriod: data.backtestPeriod,
        portfolioRebalancing: data.portfolioRebalancing || false,
        isActive: true,
        updatedAt: new Date(),
      })
      .returning();

    // 사용자의 activeStrategyId 업데이트
    await tx
      .update(users)
      .set({
        activeStrategyId: strategy.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return strategy;
  });
}

/**
 * 사용자의 활성 전략을 조회합니다 (플랜 만료 정보 포함)
 */
export async function getUserActiveStrategy(userId: number) {
  const db = database();

  const result = await db
    .select({
      strategy: strategies,
      user: users,
      planHistory: userPlanHistory,
    })
    .from(users)
    .leftJoin(strategies, eq(users.activeStrategyId, strategies.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .where(eq(users.id, userId))
    .limit(1);

  const [data] = result;

  if (!data?.strategy) {
    return null;
  }

  // 플랜 만료 정보 계산
  let planExpiryInfo = null;
  if (data.planHistory?.endDate) {
    const now = new Date();
    const endDate = new Date(data.planHistory.endDate);

    // 시간대 차이를 고려하여 날짜만 비교
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    const diffTime = endDateOnly.getTime() - nowDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      planExpiryInfo = `D-${diffDays}`;
    } else if (diffDays === 0) {
      planExpiryInfo = "오늘 만료";
    } else {
      planExpiryInfo = "만료됨";
    }
  } else {
    // 활성 플랜이 없는 경우
    planExpiryInfo = null; // 플랜이 없으면 표시하지 않음
  }

  return {
    ...data.strategy,
    planExpiryInfo,
  };
}

/**
 * 특정 전략을 조회합니다
 */
export async function getStrategyById(strategyId: number) {
  const db = database();
  const [strategy] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, strategyId))
    .limit(1);

  return strategy || null;
}

/**
 * 전략을 업데이트합니다
 */
export async function updateStrategy(
  strategyId: number,
  data: Partial<CreateStrategyData>
) {
  const db = database();
  const updateData: any = {
    updatedAt: new Date(),
  };

  // 선택적으로 업데이트할 필드들
  if (data.name !== undefined) updateData.name = data.name;
  if (data.seedAmount !== undefined)
    updateData.seedAmount = data.seedAmount.toString();
  if (data.coinMode !== undefined) updateData.coinMode = data.coinMode;
  if (data.selectedCoins !== undefined)
    updateData.selectedCoins = data.selectedCoins;
  if (data.entryRate !== undefined)
    updateData.entryRate = data.entryRate.toString();
  if (data.exitRate !== undefined)
    updateData.exitRate = data.exitRate.toString();
  if (data.seedDivision !== undefined)
    updateData.seedDivision = data.seedDivision;
  if (data.allowAverageDown !== undefined)
    updateData.allowAverageDown = data.allowAverageDown;
  if (data.allowAverageUp !== undefined)
    updateData.allowAverageUp = data.allowAverageUp;
  if (data.aiMode !== undefined) updateData.aiMode = data.aiMode;
  if (data.webhookEnabled !== undefined)
    updateData.webhookEnabled = data.webhookEnabled;
  if (data.telegramEnabled !== undefined)
    updateData.telegramEnabled = data.telegramEnabled;
  if (data.backtestPeriod !== undefined)
    updateData.backtestPeriod = data.backtestPeriod;
  if (data.portfolioRebalancing !== undefined)
    updateData.portfolioRebalancing = data.portfolioRebalancing;

  const [updatedStrategy] = await db
    .update(strategies)
    .set(updateData)
    .where(eq(strategies.id, strategyId))
    .returning();

  return updatedStrategy;
}

/**
 * 전략을 활성화합니다 (사용자의 activeStrategyId 업데이트)
 */
export async function activateStrategy(userId: number, strategyId: number) {
  const db = database();

  return await db.transaction(async (tx: any) => {
    // 전략을 활성화
    const [activatedStrategy] = await tx
      .update(strategies)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(strategies.id, strategyId))
      .returning();

    // 사용자의 activeStrategyId 업데이트
    await tx
      .update(users)
      .set({
        activeStrategyId: strategyId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return activatedStrategy;
  });
}

/**
 * 전략을 비활성화합니다
 */
export async function deactivateStrategy(userId: number) {
  const db = database();

  return await db.transaction(async (tx: any) => {
    // 사용자의 현재 활성 전략 조회
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.activeStrategyId) {
      // 전략 비활성화
      await tx
        .update(strategies)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(strategies.id, user.activeStrategyId));
    }

    // 사용자의 activeStrategyId 제거
    await tx
      .update(users)
      .set({
        activeStrategyId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}

/**
 * 전략을 삭제합니다
 */
export async function deleteStrategy(userId: number, strategyId: number) {
  const db = database();

  return await db.transaction(async (tx: any) => {
    // 사용자의 activeStrategyId가 삭제할 전략과 같다면 null로 설정
    await tx
      .update(users)
      .set({
        activeStrategyId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.activeStrategyId, strategyId)));

    // 전략 삭제
    const [deletedStrategy] = await tx
      .delete(strategies)
      .where(eq(strategies.id, strategyId))
      .returning();

    return deletedStrategy;
  });
}

/**
 * 전략 데이터를 프론트엔드에서 사용하기 쉬운 형태로 변환합니다
 */
export function formatStrategyForFrontend(strategy: any) {
  return {
    id: strategy.id,
    name: strategy.name,
    isActive: strategy.isActive,

    // 기본 설정
    seedAmount: parseFloat(strategy.seedAmount),

    // 코인 선택 설정
    coinMode: strategy.coinMode as "auto" | "custom",
    selectedCoins: strategy.selectedCoins || [],

    // 환율 설정
    entryRate: parseFloat(strategy.entryRate),
    exitRate: parseFloat(strategy.exitRate),

    // 리스크 관리 설정
    seedDivision: strategy.seedDivision,
    leverage: strategy.leverage,
    allowAverageDown: strategy.allowAverageDown,
    allowAverageUp: strategy.allowAverageUp,

    // 고급 설정
    aiMode: strategy.aiMode,
    webhookEnabled: strategy.webhookEnabled,
    telegramEnabled: strategy.telegramEnabled,
    backtestPeriod: strategy.backtestPeriod,
    portfolioRebalancing: strategy.portfolioRebalancing,

    // 플랜 만료 정보
    planExpiryInfo: strategy.planExpiryInfo,

    createdAt: strategy.createdAt,
    updatedAt: strategy.updatedAt,
  };
}

/**
 * 포지션 종료 후 전략 성과 업데이트
 */
export async function updateStrategyStatsAfterPositionClose(
  strategyId: number,
  profit: number,
  profitRate: number
): Promise<void> {
  const db = database();

  try {
    // 전략의 entryCount 증가 및 업데이트 시간 갱신
    await db
      .update(strategies)
      .set({
        entryCount: sql`${strategies.entryCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(strategies.id, strategyId));

    console.log(
      `전략 ${strategyId} 성과 업데이트 완료: 수익 ${profit}, 수익률 ${profitRate}%`
    );
  } catch (error) {
    console.error("전략 성과 업데이트 실패:", error);
    throw error;
  }
}
