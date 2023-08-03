import { Telegraf } from "telegraf";
import config from "config";
import { SocksProxyAgent } from "socks-proxy-agent";
import UserService from "../user/userService.ts";
import IBotContext from "../../interfaces/IBotContext.ts";
import ReportHandler from "../report/reportHandler.ts";
import mongoose from "mongoose";
// import commands from "./commands.ts";

type BotOptions = {
  telegram?: {
    agent: SocksProxyAgent;
  };
};

type SocksProxy = { host: string; port: string };

// const botOptions: BotOptions = {};

// if (config.has("bot.socksProxy.host") && config.has("bot.socksProxy.port")) {
//   const socksProxyAgent = new SocksProxyAgent(
//     `socks://${config.get<string>("bot.socksProxy.host")}:${config.get<string>(
//       "bot.socksProxy.port"
//     )}`
//   );
//   botOptions.telegram = {
//     agent: socksProxyAgent,
//   };
// }
// const botToken = config.get<string>("bot.token");

// const bot = new Telegraf(botToken, botOptions);

class Bot {
  private static _instance: Bot;
  private _bot: Telegraf<IBotContext>;
  private _botOptions: BotOptions = {};
  private _isLaunched: boolean = false;
  private _userService: UserService;
  private _reportHandler: ReportHandler;

  private constructor(userService: UserService, reportHandler: ReportHandler) {
    this._userService = userService;
    this._reportHandler = reportHandler;

    if (this._hasSocksProxy()) {
      this._botOptions.telegram = {
        agent: this._getSocksProxyAgent(),
      };
    }
    const botToken = config.get<string>("bot.token");

    this._bot = new Telegraf<IBotContext>(botToken, this._botOptions);
    this._useUserIdMiddleware();
    this._useCommands();
  }

  private _hasSocksProxy(): boolean {
    return (
      config.has("bot.socksProxy.host") && config.has("bot.socksProxy.port")
    );
  }

  private _getSocksProxyAgent(): SocksProxyAgent {
    const socksProxy: SocksProxy = config.get<SocksProxy>("bot.socksProxy");
    return new SocksProxyAgent(`socks://${socksProxy.host}:${socksProxy.port}`);
  }

  private _useCommands(): void {
    this._bot.telegram.setMyCommands([
      { command: "help", description: "راهنمای ربات" },
      // { command: "daily", description: "تنظیم گزارش روزانه" },
      // { command: "now", description: "گزارش فوری" },
      {command: "list", description: "لیست گزارشات روزانه"},
    ])
    // const menuKeyboard = Markup.keyboard(
    //   [
    //     Markup.button.callback("تست سایت", "testSite"),
    //     Markup.button.callback("تست روزانه", "dailyTest"),
    //     Markup.button.callback("غیر فعال کردن تست روزانه", "disableDailyTest"),
    //   ],
    //   {
    //     columns: 2,
    //   }
    // );
    // const menuMessage = `سلام، به ربات lighthouse خوش آمدید.`;
    // // testSite Scene
    // const testSiteScene = new Scenes.BaseScene<IBotContext>("testStie");
    // testSiteScene.enter(async (ctx) => {
    // });
    // testSiteScene.leave(async (ctx) => {});
    // const stage = new Scenes.Stage<IBotContext>([testSiteScene], {
    //   ttl: 10,
    // });
    // this._bot.use(session());
    // this._bot.use(stage.middleware());
    // this._bot.start(async (ctx) => {
    //   return await ctx.reply(menuMessage, menuKeyboard);
    // });
    // this._bot.action("testSite", async (ctx) => {
    //   return await ctx.scene.enter("testStie");
    // });
    const welcomeMessage = `سلام، به ربات lighthouse خوش آمدید. \n برای راهنمایی بیشتر /help را ارسال کنید.`;
    this._bot.start(async (ctx) => {
      await ctx.telegram.sendMessage(ctx.chat.id, welcomeMessage);
      await this._sendHelp(ctx.chat.id);
    });
    // register commands
    this._bot.command("help", async (ctx) => {
      await this._sendHelp(ctx.chat.id);
    });

    this._bot.command("daily", async (ctx) => {
      const args = ctx.message.text.split(" ");
      if (args.length !== 3) {
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است \n برای راهنمایی بیشتر /help را ارسال کنید"
        );
        return;
      }
      const url = args[1];
      const hour = parseInt(args[2]);

      if (!url || !hour) {
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است \n برای راهنمایی بیشتر /help را ارسال کنید"
        );
        return;
      }

      if (hour < 0 || hour > 23) {
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "ساعت باید بین 0 تا 23 باشد"
        );
        return;
      }

      if (isNaN(hour)) {
        return await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است"
        );
      }

      try {
        await this._reportHandler.createDailyReport({
          userId: ctx.userId,
          hour,
          websiteUrl: url,
        });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (error.message === "Duplicate daily report") {
          return await ctx.telegram.sendMessage(
            ctx.chat.id,
            "این گزارش قبلا ثبت شده است"
          );
        }
        if (error.message === "Reaching same website limit") {
          return await ctx.telegram.sendMessage(
            ctx.chat.id,
            "شما نمی توانید بیش از ۳ گزارش با یک آدرس وب سایت ثبت کنید \n مشاهده همه گزارش ها با دستور /list"
          );
        }
      }

      return await ctx.telegram.sendMessage(
        ctx.chat.id,
        `گزارش شما با موفقیت ثبت شد. \n شما می توانید با دستور /list گزارش های خود را مشاهده کنید.`
      );
    });

    this._bot.command("now", async (ctx) => {
      const args = ctx.message.text.split(" ");
      if (args.length !== 2) {
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است \n برای راهنمایی بیشتر /help را ارسال کنید"
        );
        return;
      }
      const url = args[1];

      if (!url) {
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است \n برای راهنمایی بیشتر /help را ارسال کنید"
        );
        return;
      }
      await this._reportHandler.createReportNow({
        userId: ctx.userId,
        websiteUrl: url,
      });

      return await ctx.telegram.sendMessage(
        ctx.chat.id,
        `گزارش شما با موفقیت ثبت شد. \n تا دقایقی دیگر فایل pdf برای شما ارسال خواهد شد`
      );
    });

    this._bot.command("list", async (ctx) => {
      try {
        const dailyReports = await this._reportHandler.getDailyReports(
          ctx.userId
        );
        const message: string = dailyReports
          .map((report) => {
            return `وب سایت: ${report.websiteUrl} \n ساعت: ${report.hour}\n لغو /remove_${report.id}`;
          })
          .join("\n\n");
        return await ctx.telegram.sendMessage(ctx.chat.id, message);
      } catch (error: unknown) {
        if (error instanceof Error && error?.message === "No reports found")
          return await ctx.telegram.sendMessage(ctx.chat.id, "گزارشی یافت نشد");
        throw error;
      }
    });
    // handle remove_
    this._bot.hears(/^\/remove_(\w+)$/, async (ctx) => {
      const id = ctx.match[1];
      if (!mongoose.isValidObjectId(id))
        return await ctx.reply("شناسه گزارش اشتباه است");
      try {
        await this._reportHandler.removeDailyReport(id.toString(), ctx.userId);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (error.message === "Report id not found in database")
          return await ctx.telegram.sendMessage(
            ctx.chat.id,
            "گزارش یافت نشد \n ممکن است گزارش از قبل حذف شده باشد"
          );
        if (error.message === "You are not allowed to remove this report") {
          return await ctx.telegram.sendMessage(
            ctx.chat.id,
            "شما اجازه حذف این گزارش را ندارید"
          );
        }
        throw error;
      }
      return await ctx.telegram.sendMessage(
        ctx.chat.id,
        `گزارش با موفقیت حذف شد`
      );
    });
  }

  private async _sendHelp(chatId: number): Promise<void> {
    const helpMessage = `
    ✔<b>دریافت گزارش روزانه</b>:
برای دریافت گزارش به صورت روزانه دستور زیر را ارسال کنید و طبق این فرمت ادرس سایت و ساعت را مشخص کنید
/daily example.com 15
در مثال بالا هر روز ساعت ۳ گزارش ارسال می شود


✔<b>دریافت گزارش فوری</b>:
/now example.com‍‍

✔<b>لیست گزارش ها</b>:
برای مشاهده لیست گزارش های خود دستور زیر را ارسال کنید
/list`;
    await this._bot.telegram.sendMessage(chatId, helpMessage, {
      parse_mode: "HTML",
    });
  }

  private _useUserIdMiddleware(): void {
    this._bot.use(async (ctx, next) => {
      const chatId = ctx.chat?.id;
      if (!chatId) throw new Error("chatId is undefined");
      const user = await this._userService.findByChatId(chatId);
      if (!user) {
        const createdUser = await this._userService.create({
          chatId,
        });
        ctx.userId = createdUser.id;
      } else {
        ctx.userId = user.id;
      }
      await next();
    });
  }

  public async launch(): Promise<void> {
    if (this._isLaunched) throw new Error("Bot is already launched");
    await this._bot.launch();
  }

  public getBot(): Telegraf<IBotContext> {
    return this._bot;
  }

  public stop(): void {
    this._bot.stop();
  }

  public static getInstance(
    userService: UserService,
    reportHandler: ReportHandler
  ): Bot {
    if (!Bot._instance) Bot._instance = new Bot(userService, reportHandler);
    return Bot._instance;
  }
}

export default Bot;
