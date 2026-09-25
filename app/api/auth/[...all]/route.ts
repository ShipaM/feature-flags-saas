// Better Auth endpoints: /api/auth/sign-in/email, /api/auth/sign-out, /api/auth/get-session ...
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/config";

export const { GET, POST } = toNextJsHandler(auth);
