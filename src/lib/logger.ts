import fs from "fs";
import path from "path";
import { config } from "../config";

if (!fs.existsSync(config.paths.logs)) {
  fs.mkdirSync(config.paths.logs, { recursive: true });
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.system.logLevel.toLowerCase() as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;

export function createLogger(name: string) {
  const isCore = name === "core";
  const fileName = isCore 
    ? `server-${new Date().toISOString().split("T")[0]}.log` 
    : `plugin-${name}-${new Date().toISOString().split("T")[0]}.log`;
  
  const logFile = path.join(config.paths.logs, fileName);

  function writeLog(levelName: string, levelValue: number, message: any, ...args: any[]) {
    if (levelValue < currentLevel) return;

    const timestamp = new Date().toISOString();
    
    let formattedMessage = typeof message === "object" ? JSON.stringify(message) : message;
    if (args.length > 0) {
      formattedMessage += " " + args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ");
    }

    const logLine = `[${timestamp}] [${levelName}] [${name}] ${formattedMessage}\n`;
    
    if (levelName === "ERROR") {
      console.error(`[${timestamp}] [ERROR] [${name}]`, message, ...args);
    } else if (levelName === "WARN") {
      console.warn(`[${timestamp}] [WARN] [${name}]`, message, ...args);
    } else {
      console.log(`[${timestamp}] [${levelName}] [${name}]`, message, ...args);
    }

    fs.appendFileSync(logFile, logLine, "utf8");
  }

  return {
    debug: (msg: any, ...args: any[]) => writeLog("DEBUG", LOG_LEVELS.debug, msg, ...args),
    info: (msg: any, ...args: any[]) => writeLog("INFO", LOG_LEVELS.info, msg, ...args),
    warn: (msg: any, ...args: any[]) => writeLog("WARN", LOG_LEVELS.warn, msg, ...args),
    error: (msg: any, ...args: any[]) => writeLog("ERROR", LOG_LEVELS.error, msg, ...args),
  };
}

export const logger = createLogger("core");
