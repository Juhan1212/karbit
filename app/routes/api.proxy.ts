import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
// @ts-ignore
import { getCache } from "../core/redisCache";

// GET 요청 프록시 (loader)
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const targetParam = url.searchParams.get("url");
  if (!targetParam) {
    return Response.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }
  const target = decodeURIComponent(targetParam);

  // Upbit KRW-USDT ticker 캐시 예외처리 (Redis)
  if (target === "https://api.upbit.com/v1/ticker?markets=KRW-USDT") {
    const cached = await getCache<{ data: any; timestamp: number }>(
      "upbit:KRW-USDT"
    );
    if (cached && Date.now() - cached.timestamp < 10000) {
      return Response.json(cached.data, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return Response.json(
        { error: "Data temporarily unavailable" },
        { status: 503 }
      );
    }
  }

  try {
    const response = await fetch(target);
    const data = await response.json();
    return Response.json(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json({ error: "Proxy request failed" }, { status: 500 });
  }
}

// POST 요청 프록시 (action)
export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return Response.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }
  try {
    const body = await request.text();
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("Content-Type") || "application/json",
      },
      body,
    });
    const data = await response.json();
    return Response.json(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json({ error: "Proxy request failed" }, { status: 500 });
  }
}
