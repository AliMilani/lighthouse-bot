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

  private _isValidHour(hour: number): boolean {
    return hour === 0 || hour < 24 || hour > 0;
  }

  public async getDailyReports(
    userId: string
  ): Promise<{ websiteUrl: string; hour: number; id: string }[]> {
    const reports = await this._reportService.findAllByUserId(userId);
    if (reports.length === 0) throw new Error("No reports found");
    const reportsList = reports
      .filter(
        (report) => report.hour !== undefined && this._isValidHour(report.hour)
      )
      .map(({ websiteUrl, hour, _id }) => ({
        websiteUrl,
        hour: hour as number,
        id: _id.toString(),
      }));
    if (reportsList.length === 0) throw new Error("No reports found");
    return reportsList;
  }

  public async removeDailyReport(
    reportId: string,
    userId: string
  ): Promise<void> {
    const report = await this._reportService.findById(reportId);
    if (!report) throw new Error(`Report id not found in database`);
    console.log(report.userId, userId);
    if (report.userId.toString() !== userId.toString())
      throw new Error("You are not allowed to remove this report");
    await this._reportProducer.removeReportJob(report._id.toString());
    await this._reportService.deleteById(reportId);
  }
}

export default ReportHandler;
