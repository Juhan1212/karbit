import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis__:
    | {
        pub?: Redis;
        sub?: Redis;
      }
    | undefined;
}

const getRedisURL = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  const db = process.env.REDIS_DB ? `/${process.env.REDIS_DB}` : "";
  // 비밀번호가 있으면 포함, 없으면 생략
  const auth = process.env.REDIS_PASSWORD
    ? `${encodeURIComponent(process.env.REDIS_PASSWORD)}@`
    : "";
  return `redis://${auth}${host}:${port}${db}`;
};

export function getRedisPublisher() {
  if (!globalThis.__redis__) globalThis.__redis__ = {};
  if (!globalThis.__redis__.pub) {
    globalThis.__redis__.pub = new Redis(getRedisURL(), {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
  }
  return globalThis.__redis__.pub!;
}

export function createRedisSubscriber() {
  // For SSE, a dedicated subscriber per connection is safer
  return new Redis(getRedisURL(), {
    maxRetriesPerRequest: null,
  });
}

export const getKimchiChannel = () =>
  process.env.REDIS_KIMCHI_CHANNEL ||
  process.env.REDIS_CHANNEL ||
  "kimchi:premium";
