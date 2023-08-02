import { Context } from "telegraf";

interface IBotContext extends Context {
  userId: string;
}

export default IBotContext;
