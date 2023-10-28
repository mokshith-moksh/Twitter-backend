import Redis from "ioredis";

export const redisClient = new Redis(
  process.env.REDID_KEY as string,
);
