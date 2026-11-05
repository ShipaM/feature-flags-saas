import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";

// Prints the SQL text but NOT the parameter values (they can hold tokens, emails, hashes).
export class SafeWriter implements LogWriter {
  write(message: string) {
    console.log(message.split(" -- params:")[0]);
  }
}
export const safeQueryLogger = () =>
  new DefaultLogger({ writer: new SafeWriter() });
