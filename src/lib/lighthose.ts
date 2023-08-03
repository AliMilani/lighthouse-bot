// import lighthouse from "lighthouse";
// import { Flags } from "lighthouse/types/externs";
// import * as chromelauncher from "chrome-launcher";

// const createReport = async (url: string): Promise<string> => {
//   // const headlessChromeURL = "chrm.iran.liara.run";
//   const chrome = await chromelauncher.launch({
//     // chromeFlags: ["--headless"],
//   });
//   // const chrome = await chromelauncher.launch({ chromeFlags: ["--headless"] });
//   const options: Flags = {
//     logLevel: "error",
//     output: "html",
//     onlyCategories: ["performance"],
//     // hostname: headlessChromeURL,
//     // port: 80,
//     port: chrome.port,
//   };
//   const urlWithProtocol = url.startsWith("http") ? url : `http://${url}`;
//   const runnerResult = await lighthouse(urlWithProtocol, options);

//   // `.report` is the HTML report as a string
//   if (!runnerResult?.report) throw new Error("Report is undefined");
//   const reportHtml = runnerResult.report;

//   // `.lhr` is the Lighthouse Result as a JS object
//   //   console.log("Report is done for", runnerResult.lhr.finalDisplayedUrl);
//   //   const score = runnerResult?.lhr?.categories?.performance?.score;
//   //   if (score) console.log("Performance score was", score * 100);

//   await chrome.kill();
//   return reportHtml.toString();
// };

import { fork } from "child_process";

const createReport = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = fork("./src/child/lighthouse-child.ts");
    child.on("message", (htmlPage: string) => {
      resolve(htmlPage);
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.send(url);
  });
};

export { createReport };
