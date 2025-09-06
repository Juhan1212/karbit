import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { eq, and, gt } from "drizzle-orm";
import { database } from "~/database/context";
import { users, passwordResets } from "~/database/schema";
import { isValidEmail, isValidPassword, hashPassword } from "~/utils/auth";
import {
  sendPasswordResetEmail,
  generateVerificationCode,
} from "~/utils/email";
import { getUserByEmail } from "~/database/user";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const actionType = url.searchParams.get("action");

  switch (actionType) {
    case "send-code":
      return handleSendVerificationCode(request);
    case "verify-code":
      return handleVerifyCode(request);
    case "reset-password":
      return handleResetPassword(request);
    default:
      return Response.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
  }
}

async function handleSendVerificationCode(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;

    // 입력값 검증
    if (!email) {
      return Response.json(
        {
          success: false,
          message: "이메일을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        {
          success: false,
          message: "올바른 이메일 형식을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json(
        {
          success: false,
          message: "등록되지 않은 이메일입니다.",
        },
        { status: 400 }
      );
    }

    // 인증코드 생성
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료

    // 기존 인증코드가 있다면 삭제 후 새로 생성
    const db = database();
    await db
      .delete(passwordResets)
      .where(eq(passwordResets.email, email.toLowerCase().trim()));

    // 새 인증코드 저장
    await db.insert(passwordResets).values({
      email: email.toLowerCase().trim(),
      verificationCode,
      expiresAt,
      isUsed: false,
    });

    // 이메일 발송
    await sendPasswordResetEmail(email, verificationCode);

    return Response.json({
      success: true,
      message: "인증코드가 이메일로 발송되었습니다.",
    });
  } catch (error) {
    console.error("Send verification code error:", error);

    if (error instanceof Error) {
      return Response.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}

async function handleVerifyCode(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const verificationCode = formData.get("verificationCode") as string;

    // 입력값 검증
    if (!email || !verificationCode) {
      return Response.json(
        {
          success: false,
          message: "이메일과 인증코드를 모두 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (verificationCode.length !== 6) {
      return Response.json(
        {
          success: false,
          message: "6자리 인증코드를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 인증코드 확인
    const db = database();
    const resetRecord = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.email, email.toLowerCase().trim()),
        eq(passwordResets.verificationCode, verificationCode),
        eq(passwordResets.isUsed, false),
        gt(passwordResets.expiresAt, new Date())
      ),
    });

    if (!resetRecord) {
      return Response.json(
        {
          success: false,
          message: "유효하지 않거나 만료된 인증코드입니다.",
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "인증이 완료되었습니다.",
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}

async function handleResetPassword(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const verificationCode = formData.get("verificationCode") as string;
    const newPassword = formData.get("newPassword") as string;

    // 입력값 검증
    if (!email || !verificationCode || !newPassword) {
      return Response.json(
        {
          success: false,
          message: "모든 필드를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.isValid) {
      return Response.json(
        {
          success: false,
          message: passwordValidation.errors[0],
        },
        { status: 400 }
      );
    }

    // 인증코드 재확인
    const db = database();
    const resetRecord = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.email, email.toLowerCase().trim()),
        eq(passwordResets.verificationCode, verificationCode),
        eq(passwordResets.isUsed, false),
        gt(passwordResets.expiresAt, new Date())
      ),
    });

    if (!resetRecord) {
      return Response.json(
        {
          success: false,
          message: "유효하지 않거나 만료된 인증코드입니다.",
        },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json(
        {
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        },
        { status: 400 }
      );
    }

    // 비밀번호 해싱 및 업데이트
    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 인증코드 사용 처리
    await db
      .update(passwordResets)
      .set({ isUsed: true })
      .where(eq(passwordResets.id, resetRecord.id));

    return Response.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
