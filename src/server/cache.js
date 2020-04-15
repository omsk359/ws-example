import { promisify } from 'util';
import redis from 'redis';

const cache = redis.createClient('redis://localhost:6379');

export const cacheGet = promisify(cache.get).bind(cache);
export const cacheSet = promisify(cache.set.bind(cache));
