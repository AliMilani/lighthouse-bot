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
