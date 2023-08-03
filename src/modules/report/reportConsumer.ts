import { Worker, Job, RedisClient, WorkerOptions } from "bullmq";
import { Input, TelegramError } from "telegraf";
import config from "config";
import { ReportJobData } from "../../types/reportTypes.ts";
// import ReportService from "./reportService.ts";
import { ReportJobSteps } from "../../enums/reportEnums.ts";
import { createReport } from "../../lib/lighthose.ts";
// import FileCache from "../../lib/fileCache.ts";
import { convertFromHtml } from "../../utils/pdfUtil.ts";
import Bot from "../bot/bot.ts";

class ReportConsumer {
  private _worker: Worker;
  // private _reportService: ReportService;
  private _bot: Bot;
  private readonly _queueName = "reportQueue";
  private _workerOptions: WorkerOptions = {
    concurrency: 3,
    connection: {
      host: config.get<string>("redis.host"),
      port: config.get<number>("redis.port"),
    },
    autorun: true,
  };
  // private _redisClientGetter: Promise<RedisClient>;
  // private fileCache: FileCache
  constructor(bot: Bot) {
    this._bot = bot;

    // this._reportService = reportService;
    this._worker = new Worker<ReportJobData>(
      this._queueName,
      this._reportProcessor,
      this._workerOptions
    );

    this._worker.on("failed", this._handleFailedJob);
    this._worker.on("completed", this._handleCompletedJob);
    this._worker.on("progress", this._handleProgressJob);
    // this.fileCache = new FileCache(this._worker.client);
    // this._redisClientGetter = this._worker.client;
  }

  private _reportProcessor = async (job: Job<ReportJobData>): Promise<void> => {
    // remove expired jobs
    const expireMs = 60 * 1000 * 5;
    if (job.timestamp + expireMs < Date.now()) {
      // job.discard();
      // if (!job.token) throw new Error("Job token is undefined");
      // await job.moveToFailed(new Error("Job expired"), job.token);
      // return;
      throw new Error("Job expired");
    }
    console.log(JSON.stringify(job.asJSON(), null, 2));

    // const report = await this._reportService.findById(job.data.reportId);
    // if (!report)
    // throw new Error(`Report with id ${job.data.reportId} not found`);
    const chatId = job.data.chatId;
    const bot = this._bot.getBot();

    try {
      if (!job.data.progressMessageId) {
        const progressMessageId = await this._createProgressMessage(
          chatId,
          "در حال آماده سازی..."
        );
        await job.updateData({
          ...job.data,
          progressMessageId,
        });
      }
    } catch (error: TelegramError | any) {
      if (error instanceof TelegramError)
        if (
          error.response.description ===
            "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message" ||
          error.response.description ===
            "Bad Request: message to edit not found"
        )
          return;
      throw error;
    }

    // TODO: move to bot / report handler module
    this._bot
      .getBot()
      .action(`cancel_${job.data.progressMessageId}`, async (ctx) => {
        await job.discard();
        const token = job?.token;
        if (!token) throw new Error("token is undefined");
        // await job.moveToFailed(new Error("Job canceled"), token);
        // await job.moveToCompleted("Job canceled", token);
        // await job.remove()
        await job.updateData({
          ...job.data,
          isCancelled: true,
        });
        return await ctx.editMessageText("✅ لغو شد :)");
      });

    let step = job.data.step;
    while (step !== ReportJobSteps.Finish) {
      switch (step) {
        case ReportJobSteps.CreateHtmlReport:
          if (job.data.isCancelled) return;
          await job.updateProgress(30);
          await this._createHtmlReport(job);
          await job.updateProgress(50);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.CreatePdfReport,
          });
          step = ReportJobSteps.CreatePdfReport;
          break;
        case ReportJobSteps.CreatePdfReport:
          if (job.data.isCancelled) return;
          await this._createPdfReport(job);
          await job.updateProgress(70);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.SendPdfReport,
          });
          step = ReportJobSteps.SendPdfReport;
          break;
        case ReportJobSteps.SendPdfReport:
          if (job.data.isCancelled) return;
          await job.updateProgress(90);
          await bot.telegram.sendChatAction(chatId, "upload_document");
          await this._sendPdfReport(job);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.Finish,
          });
          step = ReportJobSteps.Finish;
          // await job.updateProgress(100);
          break;
        default:
          throw new Error(`Invalid step ${step}`);
      }
    }
  };

  private _createProgressMessage = async (
    chatId: number,
    message: string
  ): Promise<number> => {
    const bot = this._bot.getBot();
    await bot.telegram.sendChatAction(chatId, "typing");
    const progressMessage = await bot.telegram.sendMessage(chatId, message);
    return progressMessage.message_id;
  };

  private _updateProgressMessage = async (
    chatId: number,
    messageId: number,
    message: string
  ): Promise<void> => {
    const bot = this._bot.getBot();
    await bot.telegram.sendChatAction(chatId, "typing");
    try {
      await bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        message,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  callback_data: `cancel_${messageId}`,
                  text: "لغو",
                },
              ],
            ],
          },
        }
      );
    } catch (error: TelegramError | any) {
      if (error instanceof TelegramError)
        if (
          error.response.description ===
            "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message" ||
          error.response.description ===
            "Bad Request: message to edit not found"
        )
          return;
      throw error;
    }
  };

  private async _createHtmlReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId } = job.data;
    // const report = await this._reportService.findById(reportId);
    // if (!report)
    // throw new Error(`Report with id ${job.data.reportId} not found`);
    const reportHtml = await createReport(job.data.websiteUrl);
    this._setHtmlCache(reportId, reportHtml);
  }

  private async _createPdfReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId } = job.data;
    const pdfHtml = await this._getHtmlCache(reportId);
    const pdfBuffer = await convertFromHtml(pdfHtml);
    this._setPdfCache(reportId, pdfBuffer);
    this._unsetHtmlCache(reportId);
  }

  private async _sendPdfReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId, chatId, websiteUrl } = job.data;
    const pdfBuffer = await this._getPdfCache(reportId);
    await this._bot
      .getBot()
      .telegram.sendDocument(
        chatId,
        Input.fromBuffer(
          pdfBuffer,
          `report-${websiteUrl}-${new Date().toISOString()}.pdf`
        ),
        {
          reply_to_message_id: job.data.progressMessageId,
          caption: `Report for ${websiteUrl}`,
        }
      );
    await this._unsetPdfCache(reportId);
  }

  private async _setHtmlCache(reportId: string, data: string): Promise<void> {
    const key = `html-${reportId}`;
    await this._setCache(key, data);
  }

  private async _getHtmlCache(reportId: string): Promise<string> {
    const key = `html-${reportId}`;
    const data = await this._getCache(key);
    if (!data) throw new Error(`Html report not found in cache`);
    return data;
  }

  private async _setPdfCache(reportId: string, data: Buffer): Promise<void> {
    const key = `pdf-${reportId}`;
    await this._setCache(key, data.toString("base64"));
  }

  private async _getPdfCache(reportId: string): Promise<Buffer> {
    const key = `pdf-${reportId}`;
    const data = await this._getCache(key);
    if (!data) throw new Error(`Pdf report not found in cache`);
    const pefBuffer = Buffer.from(data, "base64");
    return pefBuffer;
  }

  private async _unsetHtmlCache(reportId: string): Promise<void> {
    const key = `html-${reportId}`;
    await this._unsetCache(key);
  }

  private async _unsetPdfCache(reportId: string): Promise<void> {
    const key = `pdf-${reportId}`;
    await this._unsetCache(key);
  }

  private async _setCache(key: string, data: string | Buffer): Promise<void> {
    const redisClient = await this._getRedisClient();
    const ONE_HOUR = 60 * 60 * 1000;
    await redisClient.set(key, data, "PX", ONE_HOUR);
  }

  private async _unsetCache(key: string): Promise<void> {
    const redisClient = await this._getRedisClient();
    await redisClient.del(key);
  }

  private _getRedisClient(): Promise<RedisClient> {
    return this._worker.client;
  }

  private async _getCache(key: string): Promise<string | null> {
    const redisClient = await this._getRedisClient();
    return await redisClient.get(key);
  }

  private async _handleFailedJob(
    job: Job<ReportJobData> | undefined,
    err: Error
  ): Promise<void> {
    console.error(
      `Job ${job?.id} failed with error ${err}\n ${JSON.stringify(err.stack)}`
    );

    if (!job) throw new Error("Job is undefined");

    if (err.message !== "Job expired") {
    }
  }

  private _handleCompletedJob = async (
    job: Job<ReportJobData> | undefined,
    result: any
  ): Promise<void> => {
    if (job?.data.isCancelled) {
      console.log(`Job ${job?.id} is cancelled`);
      this._handleCancelledJob(job);
    }
    console.log(`Job ${job?.id} completed with result ${result}`);
    // delete message
    const bot = this._bot.getBot();
    if (!job?.data?.progressMessageId)
      throw new Error("progress message is not defined");
    await bot.telegram.deleteMessage(
      job.data.chatId,
      job.data.progressMessageId
    );
  };

  private _handleCancelledJob = async (
    job: Job<ReportJobData>
  ): Promise<void> => {
    // unset all caches
    const { reportId } = job.data;
    await this._unsetHtmlCache(reportId);
    await this._unsetPdfCache(reportId);
  };

  private _handleProgressJob = async (
    job: Job<ReportJobData>,
    progress: number | object
  ): Promise<void> => {
    const { chatId, websiteUrl, progressMessageId, isCancelled } = job.data;
    if (isCancelled) return;
    if (!progressMessageId)
      throw new Error(`Progress message id is not defined`);
    if (typeof progress === "object")
      throw new Error(`Progress is not a number`);
    const progressMessages: { [key: number]: string } = {
      30: "در حال ساخت گزارش",
      50: "گزارش ساخته شد!",
      70: "گزارش PDF ساخته شد",
      90: "در حال ارسال گزارش",
      100: "✅ Done!",
    };
    const progressMessage = progressMessages[progress];
    if (progressMessage)
      await this._updateProgressMessage(
        chatId,
        progressMessageId,
        `${websiteUrl}\n${progressMessage} (${progress}%)`
      );
  };

  close(): Promise<void> {
    return this._worker.close();
  }
}

export default ReportConsumer;
