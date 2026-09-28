import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.test" });

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.slice(1);

url.pathname = "/postgres";
const admin = postgres(url.toString(), { max: 1 });

const [{ exists }] = await admin`
  SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${dbName}) AS exists
`;

if (exists) {
  console.log(`Database "${dbName}" is already exists, skipping.`);
} else {
  await admin.unsafe(`CREATE DATABASE "${dbName}"`);
  console.log(`Database "${dbName}" created.`);
}

await admin.end();
