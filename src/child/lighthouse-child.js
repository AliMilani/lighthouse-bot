const createReport = async (url,headlessEndpoint) => {
  const lighthouse = (await import("lighthouse")).default;
  
  const options = {
    logLevel: "info",
    output: "html",
    onlyCategories: ["performance"],
  };
  const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
  const page = await loadPage(headlessEndpoint)
  const runnerResult = await lighthouse(urlWithProtocol, options,undefined, page);

  if (!runnerResult?.report) throw new Error("Report is undefined");
  const reportHtml = runnerResult.report;

  // chrome.kill();
  await page.close()
  console.log("html done")
  return reportHtml.toString();
};


const loadPage = async ( headlessEndpoint) => { 
  const puppeteer = await import("puppeteer-core");
  const browserWSEndpoint = `wss://${headlessEndpoint}`
  console.log({browserWSEndpoint})
  const browser = await puppeteer.default.connect({
    browserWSEndpoint,
    // defaultViewport: null,
    // ignoreHTTPSErrors: true,
  })
  const page = await browser.newPage();
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

