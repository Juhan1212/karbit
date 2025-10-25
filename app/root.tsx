import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { LinksFunction } from "react-router";

// ErrorBoundaryProps 타입 직접 정의
type ErrorBoundaryProps = {
  error: unknown;
};
import { Toaster } from "./components/sonner";
import "./assets/styles/global.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  let message = "예상치 못한 오류가 발생했습니다";
  let details =
    "서비스 이용에 불편을 드려 죄송합니다. 잠시 후 다시 시도해 주세요.";
  let statusCode = 500;
  let is404 = false;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    is404 = error.status === 404;

    if (is404) {
      message = "페이지를 찾을 수 없습니다";
      details = "요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.";
    } else if (error.status === 403) {
      message = "접근이 거부되었습니다";
      details = "이 페이지에 접근할 권한이 없습니다.";
    } else if (error.status === 500) {
      message = "서버 오류";
      details = "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    } else {
      message = `오류 ${error.status}`;
      details = error.statusText || "알 수 없는 오류가 발생했습니다.";
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* 에러 아이콘 */}
        <div className="flex justify-center">
          {is404 ? (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.978-5.5-2.5m5.5 2.5a7.963 7.963 0 01-5.5-2.5M12 4.5c-2.34 0-4.29.978-5.5 2.5a7.963 7.963 0 005.5 2.5c2.34 0 4.29-.978 5.5-2.5a7.963 7.963 0 00-5.5-2.5z"
                />
              </svg>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{message}</h1>
          <p className="text-muted-foreground">{details}</p>
          {!is404 && (
            <p className="text-sm text-muted-foreground">
              오류 코드: {statusCode}
            </p>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            홈으로 돌아가기
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            페이지 새로고침
          </button>
        </div>

        {/* 개발 환경에서만 표시되는 디버그 정보 */}
        {import.meta.env.DEV && stack && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              개발자 정보 (클릭하여 펼치기)
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
              <code>{stack}</code>
            </pre>
          </details>
        )}

        {/* 추가 도움말 */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            문제가 지속되면{" "}
            <a
              href="mailto:support@karbit.world"
              className="text-primary hover:underline"
            >
              support@karbit.world
            </a>{" "}
            으로 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
