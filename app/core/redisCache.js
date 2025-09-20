// app/core/redisCache.js
import { getRedisPublisher } from "../utils/redis.server.js";

const redis = getRedisPublisher();

export async function setCache(key, value, ttlSec = 10) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
}

export async function getCache(key) {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
