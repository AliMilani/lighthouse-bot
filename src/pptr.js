const run = async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://134.209.89.233:3000`,
  });

  browser.newPage().then(async (page) => {
    await page.goto("https://www.google.com");
    await page.screenshot({ path: "google.png" });
    await browser.close();
  }).catch((error) => {
    console.log("error", error);
  })
};
run().catch((error) => {
    console.log("error", error);
});
