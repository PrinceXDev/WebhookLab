import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(
  ({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    if (stack) {
      msg += `\n${stack}`;
    }

    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
  },
);

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), winston.format.json()),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), winston.format.json()),
    }),
  ],
});

// Create a stream object for Morgan
export const morganStream = {
  write: (message: string) => {
    // Remove trailing newline that Morgan adds
    logger.http(message.trim());
  },
};
