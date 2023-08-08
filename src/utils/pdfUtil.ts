import puppeteer from "puppeteer-core";
import { ConnectOptions } from "puppeteer-core";
import config from "config";

const _browserConnectionOptions: ConnectOptions = {
  browserWSEndpoint: config.get<string>("headLessEndpoint"),
};

const convertFromHtml = async (html: string) => {
  const browser = await puppeteer.connect(_browserConnectionOptions);
  const page = await browser.newPage();
  await page.setContent(html);

  await page.evaluate(() => {
    document.querySelectorAll(".lh-expandable-details").forEach((el) => {
      el.setAttribute("open", "");
    });
    document.querySelectorAll(".lh-clump--passed").forEach((el) => {
      el.setAttribute("open", "");
    });
  });

  const pagepdf = await page.pdf({
    // path: "lhreport.pdf",
    format: "A4",
    printBackground: true,
    margin: {
      top: "20px",
      bottom: "40px",
      left: "20px",
      right: "20px",
    },
  });

  await browser.close();
  return pagepdf;
};

export { convertFromHtml };
