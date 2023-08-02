import { Telegraf } from "telegraf";
import config from "config";
import { SocksProxyAgent } from "socks-proxy-agent";
import UserService from "../user/userService.ts";
import IBotContext from "../../interfaces/IBotContext.ts";
import ReportService from "../report/reportService.ts";
import ReportHandler from "../report/reportHandler.ts";
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
  private _reportService: ReportService;
  private _reportHandler: ReportHandler;

  private constructor(
    userService: UserService,
    reportService: ReportService,
    reportHandler: ReportHandler
  ) {
    this._userService = userService;
    this._reportService = reportService;
    this._reportHandler = reportHandler;

    if (this._hasSocksProxy()) {
      this._botOptions.telegram = {
        agent: this._getSocksProxyAgent(),
      };
    }
    const botToken = config.get<string>("bot.token");

    this._bot = new Telegraf<IBotContext>(botToken, this._botOptions);
    this._userIdMiddleware();
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
    const helpMessage = `
    ✔<b>دریافت گزارش روزانه</b>:
برای دریافت گزارش به صورت روزانه دستور زیر را ارسال کنید و طبق این فرمت ادرس سایت و ساعت را مشخص کنید
<code>/daily example.com 15</code>
در مثال بالا هر روز ساعت ۳ گزارش ارسال می شود


✔<b>دریافت گزارش فوری</b>:
<code>/now example.com‍‍</code>`;
    this._bot.start(async (ctx) => {
      await ctx.telegram.sendMessage(ctx.chat.id, welcomeMessage);
      await ctx.telegram.sendMessage(ctx.chat.id, helpMessage, {
        parse_mode: "HTML",
      });
    });
    // register commands
    this._bot.command("help", async (ctx) => {
      await ctx.replyWithHTML(helpMessage);
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
          "ساعت باید بین ۰ تا ۲3 باشد"
        );
        return;
      }

      if (isNaN(hour)) {
        return await ctx.telegram.sendMessage(
          ctx.chat.id,
          "فرمت دستور اشتباه است"
        );
      }
      const userOtherReports = await this._reportService.findAllByUserId(
        ctx.userId
      );

      const isDuplicate = userOtherReports.some(
        (report) => report.websiteUrl === url && report.hour === hour
      );

      const toManySameReports =
        userOtherReports.filter((report) => report.websiteUrl === url).length >=
        3;
      if (isDuplicate) {
        return await ctx.telegram.sendMessage(
          ctx.chat.id,
          "این گزارش قبلا ثبت شده است"
        );
      }
      if (toManySameReports) {
        return await ctx.telegram.sendMessage(
          ctx.chat.id,
          "شما نمی توانید بیش از ۳ گزارش با یک آدرس وب سایت ثبت کنید"
        );
      }

      // await this._reportService.create({
      //   userId: ctx.userId,
      //   websiteUrl: url,
      //   hour: hour,
      // });
      await this._reportHandler.createDailyReport({
        userId: ctx.userId,
        hour,
        websiteUrl: url,
      });

      return await ctx.telegram.sendMessage(
        ctx.chat.id,
        `گزارش شما با موفقیت ثبت شد. \n شما می توانید با دستور /list گزارش های خود را مشاهده کنید.`
      );
    });
  }

  private _userIdMiddleware(): void {
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
    reportService: ReportService,
    reportHandler: ReportHandler
  ): Bot {
    if (!Bot._instance)
      Bot._instance = new Bot(userService, reportService, reportHandler);
    return Bot._instance;
  }
}

export default Bot;
