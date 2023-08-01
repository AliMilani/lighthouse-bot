import { Worker, Job, RedisClient, WorkerOptions } from "bullmq";
import { Input } from "telegraf";
import config from "config";
import { ReportJobData } from "../../types/reportTypes.ts";
import ReportService from "./reportService.ts";
import { ReportJobSteps } from "../../enums/reportEnums.ts";
import { createReport } from "../../lib/lighthose.ts";
// import FileCache from "../../lib/fileCache.ts";
import { convertFromHtml } from "../../utils/pdfUtil.ts";
import Bot from "../bot/bot.ts";

class ReportConsumer {
  private _worker: Worker;
  private _reportService: ReportService;
  private _bot: Bot;
  private readonly _queueName = "reportQueue";
  private _workerOptions: WorkerOptions = {
    concurrency: 1,
    connection: {
      host: config.get<string>("redis.host"),
      port: config.get<number>("redis.port"),
    },
  };
  // private _redisClientGetter: Promise<RedisClient>;
  // private fileCache: FileCache
  constructor(reportService: ReportService, bot: Bot) {
    this._bot = bot;
    this._reportService = reportService;
    this._worker = new Worker(
      this._queueName,
      this._reportProcessor,
      this._workerOptions
    );

    this._worker.on("failed", this._handleFailedJob);
    this._worker.on("completed", this._handleCompletedJob);
    // this.fileCache = new FileCache(this._worker.client);
    // this._redisClientGetter = this._worker.client;
  }

  private async _reportProcessor(job: Job<ReportJobData>): Promise<void> {
    const report = await this._reportService.findById(job.data.reportId);
    if (!report)
      throw new Error(`Report with id ${job.data.reportId} not found`);
    let step = job.data.step;
    while (step !== ReportJobSteps.Finish) {
      switch (step) {
        case ReportJobSteps.CreateHtmlReport:
          await this._createHtmlReport(job);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.CreatePdfReport,
          });
          step = ReportJobSteps.CreatePdfReport;
          await job.updateProgress(50);
          break;
        case ReportJobSteps.CreatePdfReport:
          await this._createPdfReport(job);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.SendPdfReport,
          });
          step = ReportJobSteps.SendPdfReport;
          await job.updateProgress(75);
          break;
        case ReportJobSteps.SendPdfReport:
          await this._sendPdfReport(job);
          await job.updateData({
            ...job.data,
            step: ReportJobSteps.Finish,
          });
          step = ReportJobSteps.Finish;
          await job.updateProgress(100);
          break;
        default:
          throw new Error(`Invalid step ${step}`);
      }
    }
  }

  private async _createHtmlReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId } = job.data;
    const report = await this._reportService.findById(reportId);
    if (!report)
      throw new Error(`Report with id ${job.data.reportId} not found`);
    const reportHtml = await createReport(report.websiteUrl);
    this._setHtmlCache(reportId, reportHtml);
  }

  private async _createPdfReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId } = job.data;
    const pdfHtml = await this._getHtmlCache(reportId);
    const pdfBuffer = await convertFromHtml(pdfHtml);
    this._setPdfCache(reportId, pdfBuffer);
  }

  private async _sendPdfReport(job: Job<ReportJobData>): Promise<void> {
    const { reportId, chatId } = job.data;
    const pdfBuffer = await this._getPdfCache(reportId);
    this._bot
      .getBot()
      .telegram.sendDocument(chatId, Input.fromBuffer(pdfBuffer));
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

  private async _setPdfCache(
    reportId: string,
    data: string | Buffer
  ): Promise<void> {
    const key = `pdf-${reportId}`;
    await this._setCache(key, data);
  }

  private async _getPdfCache(reportId: string): Promise<Buffer> {
    const key = `pdf-${reportId}`;
    const data = await this._getCache(key);
    if (!data) throw new Error(`Pdf report not found in cache`);
    return Buffer.from(data);
  }

  private async _setCache(key: string, data: string | Buffer): Promise<void> {
    const redisClient = await this._getRedisClient();
    const ONE_HOUR = 60 * 60 * 1000;
    await redisClient.set(key, data, "PX", ONE_HOUR);
  }

  private _getRedisClient(): Promise<RedisClient> {
    return this._worker.client;
  }

  private async _getCache(key: string): Promise<string | null> {
    const redisClient = await this._getRedisClient();
    return await redisClient.get(key);
  }

  private _handleFailedJob(
    job: Job<ReportJobData> | undefined,
    err: Error
  ): void {
    console.error(`Job ${job?.id} failed with error ${err}`);
  }

  private _handleCompletedJob(
    job: Job<ReportJobData> | undefined,
    result: any
  ): void {
    console.log(`Job ${job?.id} completed with result ${result}`);
  }

  close(): Promise<void> {
    return this._worker.close();
  }
}

export default ReportConsumer;
