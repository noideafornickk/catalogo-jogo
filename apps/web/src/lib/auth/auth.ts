import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? ""
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const mutableToken = token as typeof token & { googleSub?: string };

      if (account?.provider === "google") {
        const googleProfile = profile as { sub?: string } | undefined;
        if (googleProfile?.sub) {
          mutableToken.googleSub = googleProfile.sub;
        }
      }

      if (!mutableToken.googleSub && typeof token.sub === "string") {
        mutableToken.googleSub = token.sub;
      }

      if (user?.name) {
        token.name = user.name;
      }

      if (user?.image) {
        token.picture = user.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const mutableUser = session.user as typeof session.user & { googleSub?: string };
        const extendedToken = token as typeof token & { googleSub?: string };

        mutableUser.googleSub = extendedToken.googleSub ?? token.sub ?? undefined;

        if (typeof token.name === "string") {
          mutableUser.name = token.name;
        }

        if (typeof token.picture === "string") {
          mutableUser.image = token.picture;
        }
      }

      return session;
    }
  }
};
