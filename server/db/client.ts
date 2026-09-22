import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

// This will hold our one connection to the database.
let connection: Sql;

if (process.env.NODE_ENV === "production") {
  // In production, the file loads only one time. So we make a new connection here.
  connection = postgres(process.env.DATABASE_URL!);
} else {
  // In development, Next.js reloads this file many times (hot reload).
  // We use "global" to keep the same connection every time. This stops us from making too many connections.
  const globalConnection = global as typeof globalThis & {
    connection?: Sql;
  };

  if (!globalConnection.connection) {
    globalConnection.connection = postgres(process.env.DATABASE_URL!);
  }

  connection = globalConnection.connection;
}

// This makes the "db" object. We use it to talk to the database in the app.
export const db = drizzle({
  client: connection,
  // Show SQL queries in the console, but only in development. Not in production.
  logger: process.env.NODE_ENV !== "production",
});
