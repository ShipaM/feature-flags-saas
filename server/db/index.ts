// This stops browser code from using this file. It is for the server only.
// Note: scripts outside Next.js (like seed.ts) should import "./client" directly,
// because this guard throws when it runs outside the Next.js build.
import "server-only";

export { db } from "./client";
