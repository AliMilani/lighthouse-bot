import "dotenv/config.js";
import mongoose from "mongoose";
import config from "config";
import validateEnv from "./startup/validateEnv.ts";
import { userService, reportHandler } from "./DI.ts";
import ReportConsumer from "./modules/report/reportConsumer.ts";
import logger from "./lib/logger.ts";

import Bot from "./modules/bot/bot.ts";

class App {
  private _db: mongoose.Connection | null = null;
  private _bot: Bot;

  constructor() {
    validateEnv(process.env);
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
