import { RedisClient } from "bullmq";

type FileCacheOptions = {
  expireMs: number;
};

class FileCache {
  private _client: RedisClient;
  private expireMs: number;
  constructor(client: RedisClient, options: FileCacheOptions) {
    this._client = client;
    this.expireMs = options.expireMs;
  }

  public async set(key: string, value: string | Buffer): Promise<void> {
    await this._client.set(key, value, "PX", this.expireMs);
  }

  public async get(key: string): Promise<string | null> {
    return await this._client.get(key);
  }
}

export { FileCacheOptions };
export default FileCache;
