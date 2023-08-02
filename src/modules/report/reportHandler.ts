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
  //dependencies:
  //userService
  //reportService
  //ReportProducer
  // handlers:
  // create report (add to db, handler erros, add to queue, etc)
  // cancel report (remove job from queue)

  constructor(
    private _reportService: ReportService,
    private _userService: UserService,
    private _reportProducer: ReportPoducer
  ) {}

  public async createReport({ userId, websiteUrl }: createReportParams) {
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
}

export default ReportHandler;
