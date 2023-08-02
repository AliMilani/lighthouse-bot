import ReportProducer from "./modules/report/reportProducer.ts";
import ReportService from "./modules/report/reportService.ts";
import UserService from "./modules/user/userService.ts";

const reportService = new ReportService();
const userService = new UserService();
const reportProducer = new ReportProducer();

export { reportService, userService, reportProducer };
