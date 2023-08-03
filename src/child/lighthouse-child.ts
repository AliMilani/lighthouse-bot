import lighthouse from "lighthouse";
import { Flags } from "lighthouse/types/externs";
import * as chromelauncher from "chrome-launcher";

const createReport = async (url: string): Promise<string> => {
  const chrome = await chromelauncher.launch({
    chromeFlags: ["--headless"],
  });
  const options: Flags = {
    logLevel: "error",
    output: "html",
    onlyCategories: ["performance"],
    // hostname: devToolsHost,
    port: chrome.port,
  };
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  const runnerResult = await lighthouse(urlWithProtocol, options);

  if (!runnerResult?.report) throw new Error("Report is undefined");
  const reportHtml = runnerResult.report;

  chrome.kill();
  return reportHtml.toString();
};

process.on("message", async function (url) {
  console.log("Child process received:", url);
  const htmlReport = await createReport(url as string);
  if (!process.send) throw new Error("process.send is undefined");
  process.send(htmlReport);
});
