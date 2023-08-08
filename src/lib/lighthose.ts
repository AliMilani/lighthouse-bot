import { fork } from "child_process";
import config from "config";

const createReport = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = fork("./src/child/lighthouse-child.js");
    child.on("message", (htmlPage: string) => {
      resolve(htmlPage);
    });
    child.on("error", (error) => {
      reject(error);
    });
    const headlessEndpoint = config.get<string>("headLessEndpoint");
    child.send({ url, headlessEndpoint });
    console.log("message sent");
  });
};

export { createReport };
