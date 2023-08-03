import lighthouse from "lighthouse";
import { Flags } from "lighthouse/types/externs";
import * as chromelauncher from "chrome-launcher";

const createReport = async (url: string): Promise<string> => {
  // const headlessChromeURL = "chrm.iran.liara.run";
  const chrome = await chromelauncher.launch({
    chromeFlags: ["--headless"],
  });
  // const chrome = await chromelauncher.launch({ chromeFlags: ["--headless"] });
  const options: Flags = {
    logLevel: "error",
    output: "html",
    onlyCategories: ["performance"],
    // hostname: headlessChromeURL,
    // port: 80,
    port: chrome.port,
  };
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  const runnerResult = await lighthouse(urlWithProtocol, options);

  // `.report` is the HTML report as a string
  if (!runnerResult?.report) throw new Error("Report is undefined");
  const reportHtml = runnerResult.report;

  // `.lhr` is the Lighthouse Result as a JS object
  //   console.log("Report is done for", runnerResult.lhr.finalDisplayedUrl);
  //   const score = runnerResult?.lhr?.categories?.performance?.score;
  //   if (score) console.log("Performance score was", score * 100);

  await chrome.kill();
  return reportHtml.toString();
};

process.on("message", async function (url) {
  console.log("Child process received:", url);
  const htmlReport = await createReport(url as string);
  if (!process.send) throw new Error("process.send is undefined");
  process.send(htmlReport);
});
