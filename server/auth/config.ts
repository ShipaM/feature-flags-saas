import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

// Login form
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// NextAuth config
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials provider works only with JWT sessions (a signed cookie, no sessions table)
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Called on login. Return a user object = success, return null = wrong email/password
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // Only the id goes into the token. Role and organization are read from the DB on every request;
        return { id: String(user.id), email: user.email };
      },
    }),
  ],
  callbacks: {
    // token.sub already holds user.id (Auth.js puts it there). Copy it into the session
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
