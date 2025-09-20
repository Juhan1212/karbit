import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

globalThis.__redis__ = globalThis.__redis__ || {};

function getRedisURL() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  const db = process.env.REDIS_DB ? `/${process.env.REDIS_DB}` : "";
  const auth = process.env.REDIS_PASSWORD
    ? `${encodeURIComponent(process.env.REDIS_PASSWORD)}@`
    : "";
  return `redis://${auth}${host}:${port}${db}`;
}

export function getRedisPublisher() {
  if (!globalThis.__redis__.pub) {
    globalThis.__redis__.pub = new Redis(getRedisURL(), {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
  }
  return globalThis.__redis__.pub;
}

export function createRedisSubscriber() {
  return new Redis(getRedisURL(), {
    maxRetriesPerRequest: null,
  });
}

export function getKimchiChannel() {
  return (
    process.env.REDIS_KIMCHI_CHANNEL ||
    process.env.REDIS_CHANNEL ||
    "kimchi:premium"
  );
}
