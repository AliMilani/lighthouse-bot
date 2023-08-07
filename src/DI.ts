import ReportHandler from "./modules/report/reportHandler";
import ReportProducer from "./modules/report/reportProducer";
import ReportService from "./modules/report/reportService";
import UserService from "./modules/user/userService";

const reportService = new ReportService();
const userService = new UserService();
const reportProducer = new ReportProducer();
const reportHandler = new ReportHandler(
  reportService,
  userService,
  reportProducer
);

export { reportService, userService, reportProducer, reportHandler };
