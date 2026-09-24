// Auth.js endpoints: /api/auth/signin, /api/auth/callback/credentials, /api/auth/signout, /api/auth/session, /api/auth/ csrf ;
import { handlers } from "@/server/auth/config";
export const { GET, POST } = handlers;
