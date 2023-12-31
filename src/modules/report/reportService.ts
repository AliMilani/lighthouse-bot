import ReportModel from "../../models/reportModel";
import IReport from "../../interfaces/iReport";

class ReportService {
  findById(id: string) {
    return ReportModel.findById(id);
  }

  create(report: IReport) {
    return ReportModel.create(report);
  }

  findAllByUserId(userId: string) {
    return ReportModel.find({ userId });
  }

  deleteById(id: string) {
    return ReportModel.findByIdAndDelete(id);
  }

  updateJobId(reportId: string, jobId: string) {
    return ReportModel.findByIdAndUpdate(reportId, { jobId });
  }
}

export default ReportService;
