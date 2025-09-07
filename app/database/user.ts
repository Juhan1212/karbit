import { eq, sql } from "drizzle-orm";
import { database } from "./context";
import { users, plans, userPlanHistory } from "./schema";
import { hashPassword } from "~/utils/auth";
import { preciseAdd, safeNumeric, CRYPTO_DECIMALS } from "~/utils/decimal";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UserWithPlan {
  id: number;
  email: string;
  name: string | null;
  planId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  plan?: {
    id: number;
    name: string;
    description: string | null;
    price: string | null;
  } | null;
}

/**
 * 새 사용자 생성
 */
export async function createUser(
  input: CreateUserInput
): Promise<UserWithPlan> {
  const db = database();

  // 이메일 중복 확인
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase().trim()),
  });

  if (existingUser) {
    throw new Error("이미 사용 중인 이메일입니다.");
  }

  // 기본 플랜 조회 (보통 Free 플랜)
  const defaultPlan = await db.query.plans.findFirst({
    where: eq(plans.name, "Free"),
  });

  if (!defaultPlan) {
    throw new Error("기본 플랜을 찾을 수 없습니다.");
  }

  // 비밀번호 해싱
  const hashedPassword = await hashPassword(input.password);

  // 트랜잭션으로 사용자 생성과 플랜 히스토리 동시 생성
  const result = await db.transaction(async (tx) => {
    // 1. 사용자 생성
    const [newUser] = await tx
      .insert(users)
      .values({
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        planId: defaultPlan.id,
      })
      .returning();

    // 2. 기본 플랜 히스토리 생성
    await tx.insert(userPlanHistory).values({
      userId: newUser.id,
      planId: defaultPlan.id,
      reason: "initial_signup",
      isActive: true,
      startDate: new Date(),
    });

    return newUser;
  });

  return {
    id: result.id,
    email: result.email,
    name: result.name,
    planId: result.planId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

/**
 * 이메일로 사용자 조회
 */
export async function getUserByEmail(
  email: string
): Promise<UserWithPlan | null> {
  const db = database();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
    with: {
      plan: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planId: user.planId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    plan: user.plan,
  };
}

/**
 * ID로 사용자 조회
 */
export async function getUserById(id: number): Promise<UserWithPlan | null> {
  const db = database();

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      plan: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planId: user.planId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    plan: user.plan,
  };
}

/**
 * 사용자 정보 업데이트
 */
export async function updateUser(
  id: number,
  updates: Partial<{
    name: string;
    email: string;
    planId: number;
  }>
): Promise<UserWithPlan | null> {
  const db = database();

  // 이메일 업데이트 시 중복 확인
  if (updates.email) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, updates.email.toLowerCase().trim()),
    });

    if (existingUser && existingUser.id !== id) {
      throw new Error("이미 사용 중인 이메일입니다.");
    }
  }

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.email !== undefined)
    updateData.email = updates.email.toLowerCase().trim();
  if (updates.planId !== undefined) updateData.planId = updates.planId;

  if (Object.keys(updateData).length === 0) {
    return getUserById(id);
  }

  updateData.updatedAt = new Date();

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) return null;

  return getUserById(id);
}

/**
 * 사용자 삭제
 */
export async function deleteUser(id: number): Promise<boolean> {
  const db = database();

  const result = await db.delete(users).where(eq(users.id, id));
  return result.length > 0;
}

/**
 * 사용자 비밀번호 업데이트
 */
export async function updateUserPassword(
  id: number,
  newPassword: string
): Promise<boolean> {
  const db = database();

  const hashedPassword = await hashPassword(newPassword);

  const result = await db
    .update(users)
    .set({
      passwordHash: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  return result.length > 0;
}

/**
 * 사용자 목록 조회 (페이지네이션)
 */
export async function getUsers(
  page: number = 1,
  limit: number = 10
): Promise<{
  users: UserWithPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const db = database();

  const offset = (page - 1) * limit;

  const [userList, [{ count }]] = await Promise.all([
    db.query.users.findMany({
      with: {
        plan: true,
      },
      limit,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    }),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);

  return {
    users: userList.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      plan: user.plan,
    })),
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * 포지션 종료 후 사용자 누적 통계 업데이트
 */
export async function updateUserStatsAfterPositionClose(
  userId: number,
  orderAmount: number
): Promise<void> {
  const db = database();

  try {
    await db
      .update(users)
      .set({
        totalEntryCount: sql`${users.totalEntryCount} + 1`,
        totalOrderAmount: sql`${users.totalOrderAmount} + ${orderAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(
      `사용자 ${userId} 누적 통계 업데이트 완료: 주문금액 ${orderAmount}`
    );
  } catch (error) {
    console.error("사용자 누적 통계 업데이트 실패:", error);
    throw error;
  }
}
