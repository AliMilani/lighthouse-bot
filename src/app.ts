import mongoose from "mongoose";
import config from "config";
import { userService, reportHandler } from "./DI";
import ReportConsumer from "./modules/report/reportConsumer";
import logger from "./lib/logger";

import Bot from "./modules/bot/bot";

class App {
  private _db: mongoose.Connection | null = null;
  private _bot: Bot;

  constructor() {
    this._bot = Bot.getInstance(userService, reportHandler);
    new ReportConsumer(this._bot);
  }

  public async start(): Promise<void> {
    this._db = await this._connectDatabase();
    logger.info("Database connected");
    this._bot.launch();
    logger.info("Bot started");
  }

  private async _connectDatabase(): Promise<mongoose.Connection> {
    const dbUri = config.get<string>("mongodbURI");
    const db = await mongoose.connect(dbUri);
    console.log("Connected to database");
    return db.connection;
  }

  public async stop(): Promise<void> {
    this._bot.stop();
    if (this._db) {
      await this._db.close();
    }
  }
}

export default App;
