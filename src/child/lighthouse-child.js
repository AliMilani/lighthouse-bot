const createReport = async (url,headlessEndpoint) => {
  const lighthouse = (await import("lighthouse")).default;
  const chromeLauncher = (await import("chrome-launcher"))

  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--headless',
    ]
  })

  const options = {
    logLevel: "info",
    output: "html",
    onlyCategories: ["performance"],
    port: chrome.port,
  };
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  // const page = await loadPage(headlessEndpoint)
  const runnerResult = await lighthouse(urlWithProtocol, options);

  if (!runnerResult?.report) throw new Error("Report is undefined");
  const reportHtml = runnerResult.report;

  chrome.kill();
  // await page.close()
  console.log("html done")
  return reportHtml.toString();
};


const loadPage = async ( headlessEndpoint) => { 
  const puppeteer = await import("puppeteer-core");
  const browserWSEndpoint = `wss://${headlessEndpoint}`
  // console.log({browserWSEndpoint})
  const browser = await puppeteer.default.connect({
    browserWSEndpoint,
    // defaultViewport: null,
    // ignoreHTTPSErrors: true,
  })
  const page = await browser.newPage();
  page.on("close", () => {
    console.log("page closed");
    // browser.close();
    browser.disconnect()
  });
  return page
}

process.on("message", async function ({ url, headlessEndpoint }) {
  try {
    console.log("Child process received:", url);
    const htmlReport = await createReport(url,headlessEndpoint);
    if (!process.send) throw new Error("process.send is undefined");
    process.send(htmlReport);
  } catch (error) {
    console.log("error", error);
    throw error
  }
});

