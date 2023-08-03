import config from "config";
import { createLogger, transports, format, Logger } from "winston";
const { combine, timestamp, printf, colorize } = format;

const myFormat = printf(({ level, message, timestamp, file, method }) => {
  const methodPath = `${file || ""}${method ? `=>${method}(): ` : ""}`;
  return `${timestamp}-  ${level}: ${methodPath}${message}`;
});

const logger: Logger = createLogger({
  transports: [
    new transports.Console({
      level: config.get<string>("log.consoleLevel"),
      format: combine(
        colorize({
          colors: { info: "blue", error: "red", warn: "yellow" },
        }),
        timestamp(),
        myFormat
      ),
      handleExceptions: true,
      handleRejections: true,
    }),
    new transports.File({
      filename: "logs/errors.log",
      level: "error",
      // format: combine(timestamp(), myFormat),
      handleExceptions: true,
      handleRejections: true,
    }),
    new transports.File({
      filename: "logs/combined.log",
      level: config.get("log.fileLevel"),
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  format: combine(timestamp(), format.json()),
});

export default logger;
