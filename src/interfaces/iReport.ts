import { ObjectId } from "mongoose";

interface IReport {
  userId: string | ObjectId;
  websiteUrl: string;
  hour?: number;
  jobId?: string;
}

export default IReport;
