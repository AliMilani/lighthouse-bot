import puppeteer from "puppeteer-core";
import { ConnectOptions } from "puppeteer-core";
import config from "config";

type HeadLessEndpointConfig = {
  token: string;
  endpoint: string;
};

const { endpoint, token }: HeadLessEndpointConfig =
  config.get<HeadLessEndpointConfig>("headLessBrowser");

const _browserConnectionOptions: ConnectOptions = {
  browserWSEndpoint: `wss://${endpoint}?token=${token}`,
};

const convertFromHtml = async (html: string) => {
  const browser = await puppeteer.connect(_browserConnectionOptions);
  const page = await browser.newPage();
  await page.setContent(html);

  await page.evaluate(() => {
    document.querySelectorAll(".lh-expandable-details").forEach((el) => {
      // add open attribute to all expandable details
      el.setAttribute("open", "");
    });
    document.querySelectorAll(".lh-clump--passed").forEach((el) => {
      // add open attribute to all expandable details
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
