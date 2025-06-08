// Utility for managing chat stream IDs (resumable streams)
// This version uses a stub in-memory store for demo. Replace with Redis for production.

const streamStore: Record<string, string[]> = {};

export async function appendStreamId({ chatId, streamId }: { chatId: string; streamId: string }) {
  if (!streamStore[chatId]) streamStore[chatId] = [];
  streamStore[chatId].push(streamId);
}

export async function loadStreams(chatId: string): Promise<string[]> {
  return streamStore[chatId] || [];
}

// For a real app, replace above with Redis logic.
// Example Redis (ioredis):
// import Redis from 'ioredis';
// const redis = new Redis(process.env.REDIS_URL!);
// export async function appendStreamId({ chatId, streamId }) { await redis.rpush(`chat:${chatId}:streams`, streamId); }
// export async function loadStreams(chatId) { return await redis.lrange(`chat:${chatId}:streams`, 0, -1); }
