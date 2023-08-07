import { ObjectId } from "mongoose";
import { ReportJobSteps } from "../enums/reportEnums";

type ReportJobData = {
  reportId: string;
  isDailyReport: boolean;
  step?: ReportJobSteps;
  chatId: number;
  userId: string | ObjectId;
  websiteUrl: string;
  progressMessageId?: number;
  isCancelled?: boolean;
};

export { ReportJobData };
