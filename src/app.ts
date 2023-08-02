import "dotenv/config.js";
import mongoose from "mongoose";
import config from "config";
import validateEnv from "./startup/validateEnv.ts";
import { reportService, userService } from "./DI.ts";
import ReportConsumer from "./modules/report/reportConsumer.ts";

import Bot from "./modules/bot/bot.ts";

class App {
  private _db: mongoose.Connection | null = null;
  private _bot: Bot;

  constructor() {
    validateEnv(process.env);
    this._bot = Bot.getInstance(userService, reportService);
    new ReportConsumer(reportService, this._bot);
  }

  public async start(): Promise<void> {
    this._db = await this._connectDatabase();
    this._bot.launch();
  }

  private async _connectDatabase(): Promise<mongoose.Connection> {
    const dbUri = config.get<string>("mongodbURI");
    const db = await mongoose.connect(dbUri);
    console.log("Connected to database");
    // this._handleDatabaseError(db.connection);
    return db.connection;
  }

  // private async _connectRedis(): Promise<void> {

  // }

  // private connectRedis

  // private _handleDatabaseError(connection: mongoose.Connection): void {
  //   connection.on("error", (err) => {
  //     throw new Error(`Database error: ${err}`);
  //   });
  //   connection.on("disconnected", () => {
  //     throw new Error("Database disconnected");
  //   });
  // }

  public async stop(): Promise<void> {
    this._bot.stop();
    if (this._db) {
      await this._db.close();
    }
  }
}

export default App;
