// import { Flags } from "lighthouse/types/externs";

// import lighthouse from "lighthouse";
// import * as chromelauncher from "chrome-launcher";
// import { writeFileSync } from "fs";

// const lighthouse = require("lighthouse");
// const chromelauncher = require("chrome-launcher");
// const { writeFileSync } = require("fs");
// const { Flags } = require("lighthouse/types/externs");

const createReport = async (url) => {
  const lighthouse = (await import("lighthouse")).default;
  // const chromelauncher = await import("chrome-launcher");
  const path = await import("path");
  console.log("createReport", url);
  // const chromePath = path.join(__dirname, "../chrome-linux/chrome");
  // const chrome = await chromelauncher.launch({
  //   // chromeFlags: ["--headless"],
  //   // envVars: { TOKEN: "alimm" },
  //   // chromePath: chromePath,
  //   // hostname: "chrm.iran.liara.run",
  //   port: 443,
  //   envVars: { TOKEN: "alimm" },
  // });
  /**
   * @type {Flags}
   */
  const options = {
    logLevel: "info",
    output: "html",
    onlyCategories: ["performance"],
    // hostname: devToolsHost,
    hostname: "134.209.89.233",
    port:3000
    // port: ,

    // port: chrome.port,
  };
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  const runnerResult = await lighthouse(urlWithProtocol, options);

  if (!runnerResult?.report) throw new Error("Report is undefined");
  const reportHtml = runnerResult.report;

  // chrome.kill();
  return reportHtml.toString();
};

process.on("message", async function (url) {
  try {
    console.log("Child process received:", url);
    const htmlReport = await createReport(url);
    if (!process.send) throw new Error("process.send is undefined");
    process.send(htmlReport);
  } catch (error) {
    console.log("error", error);
    throw error
  }
});

// export default createReport;
