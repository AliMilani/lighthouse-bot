import ReportHandler from "./modules/report/reportHandler.ts";
import ReportProducer from "./modules/report/reportProducer.ts";
import ReportService from "./modules/report/reportService.ts";
import UserService from "./modules/user/userService.ts";

const reportService = new ReportService();
const userService = new UserService();
const reportProducer = new ReportProducer();
const reportHandler = new ReportHandler(
  reportService,
  userService,
  reportProducer
);

export { reportService, userService, reportProducer, reportHandler };
