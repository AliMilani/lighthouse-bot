import { fork } from "child_process";
import path from "path";

const createReport = async (url: string): Promise<string> => {
  console.log("start creating report", url);
  console.log(__dirname);
  console.log(path.resolve(__dirname, "../child/lighthouse-child.js"));
  return new Promise((resolve, reject) => {
    // const child = fork(path.resolve(__dirname, "../child/lighthouse-child.js"));
    const child = fork("./src/child/lighthouse-child.js");
    child.on("message", (htmlPage: string) => {
      resolve(htmlPage);
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.send(url);
    console.log("message sent");
  });
};

export { createReport };
