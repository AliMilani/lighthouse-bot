import mongoose from "mongoose";
import IReport from "../interfaces/iReport";

const reportSchema = new mongoose.Schema<IReport>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hour: {
    type: Number,
    min: 0,
    max: 23,
  },
  websiteUrl: {
    type: String,
    required: true,
  },
  jobId: {
    type: String,
  },
});

export default mongoose.model("Report", reportSchema);
