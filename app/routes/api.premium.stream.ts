import type { LoaderFunctionArgs } from "react-router";
import { createRedisSubscriber, getKimchiChannel } from "~/utils/redis.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || getKimchiChannel();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      // Initial ping to open stream
      controller.enqueue(encoder.encode(":ok\n\n"));

      const sub = createRedisSubscriber();
      // ioredis v5+ subscribe는 콜백 없이 Promise 반환
      sub
        .subscribe(channel)
        .then((count) => {
          send({ type: "subscribed", channel, count });
        })
        .catch((err) => {
          send({ type: "error", message: String(err) });
        });

      sub.on("message", (_ch: string, message: string) => {
        // 메시지 구조 변환: results 배열 → PremiumTicker가 기대하는 배열로 변환
        const parsed = safeParse(message);
        let payload: any = parsed;
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.results)
        ) {
          // 각 코인별로 변환
          payload = parsed.results.map((item: any) => {
            // premium: ex_rate의 첫 번째 값(혹은 평균)으로 가정
            let premium = null;
            if (Array.isArray(item.ex_rates) && item.ex_rates.length > 0) {
              // 예시: 첫 번째 ex_rate를 premium으로 사용
              premium = item.ex_rates[0].ex_rate;
            }
            return {
              symbol: item.name,
              premium,
              korean_ex: item.korean_ex,
              foreign_ex: item.foreign_ex,
              ex_rates: item.ex_rates,
            };
          });
        }
        send({ type: "tick", channel: _ch, payload });
      });

      const close = () => {
        sub.disconnect();
        controller.close();
      };

      // Close on client abort
      (request as any).signal?.addEventListener?.("abort", close);

      // Heartbeat every 20s
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`:hb ${Date.now()}\n\n`));
      }, 20000);

      // Cleanup
      (controller as any)._cleanup = () => {
        clearInterval(interval);
        close();
      };
    },
    cancel() {
      // @ts-ignore
      this._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function safeParse(msg: string) {
  try {
    return JSON.parse(msg);
  } catch {
    return msg;
  }
}
