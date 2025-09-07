import nodemailer from "nodemailer";

// 이메일 설정 타입 (OAuth2.0 지원)
interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    type?: string;
    user: string;
    pass?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  };
}

// 이메일 발송 옵션 타입
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// 환경변수에서 이메일 설정 가져오기
const getEmailConfig = (): EmailConfig => {
  // OAuth2.0 설정이 있는 경우 (Gmail 권장)
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return {
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER || "",
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    };
  }

  // 기본 SMTP 설정 (Mailtrap, 네이버 등)
  const config = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASS || "",
    },
  };

  if (!config.auth.user || !config.auth.pass) {
    throw new Error(
      "이메일 인증 정보가 설정되지 않았습니다. EMAIL_USER와 EMAIL_PASS 환경변수를 확인하세요."
    );
  }

  return config;
};

// 이메일 전송기 생성
const createTransporter = () => {
  const config = getEmailConfig();
  return nodemailer.createTransport(config as any);
};

// 인증코드 생성
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 비밀번호 재설정 이메일 템플릿
const getPasswordResetEmailTemplate = (verificationCode: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Karbit 비밀번호 재설정</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .code-container { background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
        .verification-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0; color: #856404; }
        .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Karbit</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">비밀번호 재설정 인증코드</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-bottom: 20px;">안녕하세요!</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Karbit 계정의 비밀번호 재설정을 요청하셨습니다.<br>
            아래 인증코드를 입력하여 비밀번호를 재설정하세요.
          </p>
          
          <div class="code-container">
            <p style="margin: 0 0 10px 0; color: #666; font-weight: 600;">인증코드</p>
            <div class="verification-code">${verificationCode}</div>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">이 코드는 5분간 유효합니다</p>
          </div>
          
          <div class="warning">
            <strong>보안 안내:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>본인이 요청하지 않았다면 이 이메일을 무시하세요</li>
              <li>인증코드를 타인과 공유하지 마세요</li>
              <li>의심스러운 활동이 감지되면 즉시 문의하세요</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            문제가 있으시면 언제든지 <a href="mailto:support@karbit.com" style="color: #667eea;">고객지원센터</a>로 연락주세요.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">© 2024 Karbit. 모든 권리 보유.</p>
          <p style="margin: 5px 0 0 0;">김치 프리미엄 자동매매 서비스</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// 이메일 발송 함수
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Karbit" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("이메일 발송 성공:", result.messageId);
  } catch (error) {
    console.error("이메일 발송 실패:", error);
    throw new Error("이메일 발송에 실패했습니다.");
  }
};

// 비밀번호 재설정 이메일 발송
export const sendPasswordResetEmail = async (
  email: string,
  verificationCode: string
): Promise<void> => {
  const emailOptions: EmailOptions = {
    to: email,
    subject: "[Karbit] 비밀번호 재설정 인증코드",
    html: getPasswordResetEmailTemplate(verificationCode),
    text: `Karbit 비밀번호 재설정 인증코드: ${verificationCode} (5분간 유효)`,
  };

  await sendEmail(emailOptions);
};
