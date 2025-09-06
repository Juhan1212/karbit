import { eq, and, desc, asc, isNull, gte, or, sql } from "drizzle-orm";
import { database } from "./context";
import { plans, users, userPlanHistory } from "./schema";

/* ================================
   플랜 기본 CRUD
================================ */

/**
 * 모든 플랜 조회
 */
export async function getAllPlans() {
  const db = database();
  return await db.select().from(plans).orderBy(asc(plans.price));
}

/**
 * 특정 플랜 조회
 */
export async function getPlanById(planId: number) {
  const db = database();
  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  return result[0] || null;
}

/**
 * 플랜 생성
 */
export async function createPlan(planData: {
  name: string;
  description?: string;
  price: string;
}) {
  const db = database();

  try {
    const result = await db
      .insert(plans)
      .values({
        name: planData.name,
        description: planData.description,
        price: planData.price,
      })
      .returning();

    return {
      success: true,
      data: result[0],
      message: "플랜이 성공적으로 생성되었습니다.",
    };
  } catch (error: any) {
    console.error("Create plan error:", error);
    return {
      success: false,
      message: error.message?.includes("unique")
        ? "이미 존재하는 플랜명입니다."
        : "플랜 생성에 실패했습니다.",
    };
  }
}

/**
 * 플랜 수정
 */
export async function updatePlan(
  planId: number,
  planData: {
    name?: string;
    description?: string;
    price?: string;
  }
) {
  const db = database();

  try {
    const result = await db
      .update(plans)
      .set(planData)
      .where(eq(plans.id, planId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        message: "플랜을 찾을 수 없습니다.",
      };
    }

    return {
      success: true,
      data: result[0],
      message: "플랜이 성공적으로 수정되었습니다.",
    };
  } catch (error: any) {
    console.error("Update plan error:", error);
    return {
      success: false,
      message: error.message?.includes("unique")
        ? "이미 존재하는 플랜명입니다."
        : "플랜 수정에 실패했습니다.",
    };
  }
}

/**
 * 플랜 삭제 (사용자가 있으면 삭제 불가)
 */
export async function deletePlan(planId: number) {
  const db = database();

  try {
    // 해당 플랜을 사용 중인 사용자가 있는지 확인
    const usersWithPlan = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.planId, planId));

    if (usersWithPlan.length > 0) {
      return {
        success: false,
        message: "해당 플랜을 사용 중인 사용자가 있어 삭제할 수 없습니다.",
      };
    }

    const result = await db
      .delete(plans)
      .where(eq(plans.id, planId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        message: "플랜을 찾을 수 없습니다.",
      };
    }

    return {
      success: true,
      message: "플랜이 성공적으로 삭제되었습니다.",
    };
  } catch (error: any) {
    console.error("Delete plan error:", error);
    return {
      success: false,
      message: "플랜 삭제에 실패했습니다.",
    };
  }
}

/* ================================
   사용자 플랜 관리
================================ */

/**
 * 사용자의 현재 활성 플랜 조회
 * 활성 플랜이 없을 경우 자동으로 Free 플랜을 할당
 */
export async function getUserCurrentPlan(userId: number) {
  const db = database();

  const now = new Date();

  const result = await db
    .select({
      planHistory: userPlanHistory,
      plan: plans,
    })
    .from(userPlanHistory)
    .innerJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(
      and(
        eq(userPlanHistory.userId, userId),
        eq(userPlanHistory.isActive, true),
        or(
          isNull(userPlanHistory.endDate), // 무료 플랜이나 영구 플랜
          gte(userPlanHistory.endDate, now) // 유료 플랜이고 아직 만료되지 않음
        )
      )
    )
    .orderBy(desc(userPlanHistory.startDate))
    .limit(1);

  // 활성 플랜이 있으면 반환
  if (result[0]) {
    return result[0];
  }

  // 활성 플랜이 없으면 자동으로 Free 플랜 할당
  console.log(
    `User ${userId} has no active plan, assigning Free plan automatically`
  );

  // Free 플랜 조회
  const freePlan = await db.query.plans.findFirst({
    where: eq(plans.name, "Free"),
  });

  if (!freePlan) {
    console.error("Free plan not found!");
    return null;
  }

  // Free 플랜 자동 할당
  const assignResult = await assignUserPlan(
    userId,
    freePlan.id,
    "auto_assign_expired"
  );

  if (!assignResult.success) {
    console.error("Failed to auto-assign Free plan:", assignResult.message);
    return null;
  }

  // 새로 할당된 플랜 정보 반환
  const newResult = await db
    .select({
      planHistory: userPlanHistory,
      plan: plans,
    })
    .from(userPlanHistory)
    .innerJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(
      and(
        eq(userPlanHistory.userId, userId),
        eq(userPlanHistory.planId, freePlan.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .orderBy(desc(userPlanHistory.startDate))
    .limit(1);

  return newResult[0] || null;
}

/**
 * 사용자의 플랜 이력 조회
 */
export async function getUserPlanHistory(userId: number, limit = 10) {
  const db = database();

  return await db
    .select({
      planHistory: userPlanHistory,
      plan: plans,
    })
    .from(userPlanHistory)
    .innerJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(eq(userPlanHistory.userId, userId))
    .orderBy(desc(userPlanHistory.startDate))
    .limit(limit);
}

/**
 * 사용자에게 새 플랜 할당 (이력 관리)
 */
export async function assignUserPlan(
  userId: number,
  planId: number,
  reason?: string
) {
  const db = database();

  try {
    // 먼저 플랜 정보를 조회하여 유료/무료 여부 확인
    const planInfo = await getPlanById(planId);
    if (!planInfo) {
      return {
        success: false,
        message: "존재하지 않는 플랜입니다.",
      };
    }

    const isPaidPlan =
      parseFloat(planInfo.price || "0") > 0 && planInfo.name !== "Free";
    const now = new Date();
    let endDate: Date | null = null;

    // 유료 플랜인 경우 한 달 후 만료일 설정
    if (isPaidPlan) {
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    await db.transaction(async (tx) => {
      // 1. 기존 활성 플랜을 비활성화
      const existingActivePlans = await tx
        .select()
        .from(userPlanHistory)
        .where(
          and(
            eq(userPlanHistory.userId, userId),
            eq(userPlanHistory.isActive, true),
            or(
              isNull(userPlanHistory.endDate),
              gte(userPlanHistory.endDate, now)
            )
          )
        );

      if (existingActivePlans.length > 0) {
        await tx
          .update(userPlanHistory)
          .set({
            isActive: false,
            endDate: now,
          })
          .where(
            and(
              eq(userPlanHistory.userId, userId),
              eq(userPlanHistory.isActive, true),
              or(
                isNull(userPlanHistory.endDate),
                gte(userPlanHistory.endDate, now)
              )
            )
          );
      }

      // 2. 새 플랜 이력 추가
      await tx.insert(userPlanHistory).values({
        userId,
        planId,
        reason,
        isActive: true,
        startDate: now,
        endDate, // 유료 플랜이면 한 달 후, 무료 플랜이면 null
      });

      // 3. users 테이블의 planId도 업데이트 (현재 플랜 추적용)
      await tx
        .update(users)
        .set({ planId, updatedAt: new Date() })
        .where(eq(users.id, userId));
    });

    return {
      success: true,
      message: "플랜이 성공적으로 할당되었습니다.",
    };
  } catch (error: any) {
    console.error("Assign user plan error:", error);
    return {
      success: false,
      message: "플랜 할당에 실패했습니다.",
    };
  }
}

/**
 * 사용자 플랜 변경
 */
export async function changeUserPlan(
  userId: number,
  newPlanId: number,
  reason = "plan_change"
) {
  return await assignUserPlan(userId, newPlanId, reason);
}

/**
 * 사용자 플랜 취소/해지
 */
export async function cancelUserPlan(userId: number, reason = "cancel") {
  const db = database();

  try {
    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. 현재 활성 플랜을 비활성화
      await tx
        .update(userPlanHistory)
        .set({
          isActive: false,
          endDate: now,
          reason,
        })
        .where(
          and(
            eq(userPlanHistory.userId, userId),
            eq(userPlanHistory.isActive, true),
            or(
              isNull(userPlanHistory.endDate),
              gte(userPlanHistory.endDate, now)
            )
          )
        );

      // 2. users 테이블의 planId를 null로 설정
      await tx
        .update(users)
        .set({ planId: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
    });

    return {
      success: true,
      message: "플랜이 성공적으로 취소되었습니다.",
    };
  } catch (error: any) {
    console.error("Cancel user plan error:", error);
    return {
      success: false,
      message: "플랜 취소에 실패했습니다.",
    };
  }
}

/**
 * 만료된 유료 플랜들을 자동으로 비활성화하고 Free 플랜으로 변경
 */
export async function expireOldPlans() {
  const db = database();

  try {
    const now = new Date();

    // 만료된 플랜들 조회
    const expiredPlans = await db
      .select({
        userId: userPlanHistory.userId,
        planId: userPlanHistory.planId,
      })
      .from(userPlanHistory)
      .where(
        and(
          eq(userPlanHistory.isActive, true),
          sql`${userPlanHistory.endDate} < ${now}` // endDate가 현재 시간보다 이전
        )
      );

    if (expiredPlans.length === 0) {
      return {
        success: true,
        message: "만료된 플랜이 없습니다.",
        expiredCount: 0,
      };
    }

    // Free 플랜 ID 조회
    const freePlan = await db.query.plans.findFirst({
      where: eq(plans.name, "Free"),
    });

    if (!freePlan) {
      return {
        success: false,
        message: "Free 플랜을 찾을 수 없습니다.",
      };
    }

    await db.transaction(async (tx) => {
      for (const expiredPlan of expiredPlans) {
        // 1. 만료된 플랜 비활성화
        await tx
          .update(userPlanHistory)
          .set({
            isActive: false,
            reason: "expired",
          })
          .where(
            and(
              eq(userPlanHistory.userId, expiredPlan.userId),
              eq(userPlanHistory.planId, expiredPlan.planId),
              eq(userPlanHistory.isActive, true)
            )
          );

        // 2. Free 플랜으로 변경
        await tx.insert(userPlanHistory).values({
          userId: expiredPlan.userId,
          planId: freePlan.id,
          reason: "auto_downgrade_expired",
          isActive: true,
          startDate: now,
          endDate: null, // Free 플랜은 만료되지 않음
        });

        // 3. users 테이블의 planId 업데이트
        await tx
          .update(users)
          .set({ planId: freePlan.id, updatedAt: now })
          .where(eq(users.id, expiredPlan.userId));
      }
    });

    return {
      success: true,
      message: `${expiredPlans.length}개의 만료된 플랜이 Free 플랜으로 변경되었습니다.`,
      expiredCount: expiredPlans.length,
    };
  } catch (error: any) {
    console.error("Expire old plans error:", error);
    return {
      success: false,
      message: "만료된 플랜 처리에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 특정 플랜을 사용하는 사용자 수 조회
 */
export async function getPlanUserCount(planId: number) {
  const db = database();

  const result = await db
    .select({ count: users.id })
    .from(users)
    .where(eq(users.planId, planId));

  return result.length;
}

/**
 * 플랜별 사용자 통계
 */
export async function getPlanStatistics() {
  const db = database();

  const result = await db
    .select({
      plan: plans,
      userCount: users.id,
    })
    .from(plans)
    .leftJoin(users, eq(plans.id, users.planId))
    .orderBy(asc(plans.price));

  // 그룹화해서 통계 생성
  const statistics: Record<
    number,
    { plan: typeof plans.$inferSelect; userCount: number }
  > = {};

  result.forEach((row) => {
    const planId = row.plan.id;
    if (!statistics[planId]) {
      statistics[planId] = {
        plan: row.plan,
        userCount: 0,
      };
    }
    if (row.userCount) {
      statistics[planId].userCount++;
    }
  });

  return Object.values(statistics);
}
