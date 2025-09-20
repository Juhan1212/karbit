// app/core/redisCache.ts
import { getRedisPublisher } from "../utils/redis.server";

const redis = getRedisPublisher();

export async function setCache(key: string, value: any, ttlSec = 10) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
