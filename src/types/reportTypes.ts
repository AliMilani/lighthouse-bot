import { ObjectId } from "mongoose";
import { ReportJobSteps } from "../enums/reportEnums.ts";

type ReportJobData = {
  reportId: string;
  isDailyReport: boolean;
  step?: ReportJobSteps;
  chatId: number;
  userId: string | ObjectId;
  websiteUrl: string;
};

export { ReportJobData };
