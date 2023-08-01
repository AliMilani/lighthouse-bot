import { Job, JobData, Queue, QueueOptions } from "bullmq";
import config from "config";
import { HydratedDocument } from "mongoose";
import { ReportJobData } from "../../types/reportTypes.ts";
import { ReportJobSteps } from "../../enums/reportEnums.ts";
import IReport from "../../interfaces/iReport.ts";
import IUser from "../../interfaces/IUser.ts";

class ReportPoducer {
  private _queue: Queue;
  private readonly _queueName = "reportQueue";
  private readonly _queueOptions: QueueOptions = {
    connection: {
      host: config.get<string>("redis.host"),
      port: config.get<number>("redis.port"),
    },
  };

  constructor() {
    this._queue = new Queue(this._queueName, this._queueOptions);
  }

  async addReportJob(
    report: HydratedDocument<IReport>,
    user: HydratedDocument<IUser>
  ): Promise<Job<JobData>> {
    const reportData: ReportJobData = {
      reportId: report._id.toString(),
      isDailyReport: true,
      step: ReportJobSteps.CreateHtmlReport,
      chatId: user.chatId,
      userId: user._id.toString(),
      websiteUrl: report.websiteUrl,
    };
    if (this._isDailyReport(report))
      return await this._addDailyReportJob(reportData, report.hour as number);
    else return await this._addRegularReportJob(reportData);
  }

  private _isDailyReport(report: any): boolean {
    return report.hour === 0 || report.hour < 24;
  }

  private async _addDailyReportJob(
    reportData: ReportJobData,
    hour: number
  ): Promise<Job> {
    const cronHour = this._getCronHour(hour);

    return await this._queue.add("report", reportData, {
      repeat: {
        pattern: cronHour,
      },
      priority: 2,
    });
  }

  private async _addRegularReportJob(reportData: ReportJobData): Promise<Job> {
    return await this._queue.add(`report`, reportData, {
      priority: 1,
    });
  }

  private _getCronHour(hour: number): string {
    if (hour < 0 || hour > 23) throw new Error("Invalid hour");
    return `0 ${hour} * * *`;
  }

  async removeReportJob(jobId: string): Promise<void> {
    const job: Job | undefined = await this._queue.getJob(jobId);
    if (!job) throw new Error("job not found");
    await job.remove();
  }

  stop(): Promise<void> {
    return this._queue.close();
  }
}

export default ReportPoducer;
