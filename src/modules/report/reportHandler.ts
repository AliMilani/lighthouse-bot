import UserService from "../user/userService";
import ReportPoducer from "./reportProducer";
import ReportService from "./reportService";

type createReportParams = {
  userId: string;
  websiteUrl: string;
};

type createDailyReportParams = {
  userId: string;
  websiteUrl: string;
  hour: number;
};

class ReportHandler {

  constructor(
    private _reportService: ReportService,
    private _userService: UserService,
    private _reportProducer: ReportPoducer
  ) {}

  public async createReportNow({ userId, websiteUrl }: createReportParams) {
    const user = await this._userService.findById(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    const report = await this._reportService.create({
      userId,
      websiteUrl,
    });
    const job = await this._reportProducer.addReportJob(report, user);
    if (!job.id) throw new Error("Job id is undefined");
    await this._reportService.updateJobId(report.id, job.id);
  }

  public async createDailyReport({
    userId,
    websiteUrl,
    hour,
  }: createDailyReportParams) {
    await this._verifyDailyReport({
      hour,
      userId,
      websiteUrl,
    });
    const user = await this._userService.findById(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    const report = await this._reportService.create({
      userId,
      websiteUrl,
      hour,
    });
    const job = await this._reportProducer.addReportJob(report, user);
    if (!job.id) throw new Error("Job id is undefined");
    await this._reportService.updateJobId(report.id, job.id);
  }

  private async _verifyDailyReport({
    websiteUrl,
    hour,
    userId,
  }: createDailyReportParams) {
    const userOtherReports = await this._reportService.findAllByUserId(userId);
    const isDuplicate = userOtherReports.some(
      (report) => report.websiteUrl === websiteUrl && report.hour === hour
    );
    if (isDuplicate) throw new Error("Duplicate daily report");
    const isReachingLimit =
      userOtherReports.filter((report) => report.websiteUrl === websiteUrl)
        .length >= 3;
    if (isReachingLimit) throw new Error("Reaching same website limit");
  }
}

export default ReportHandler;
