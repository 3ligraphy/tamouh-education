import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";

import prisma from "@/server/db";
/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      scope: "email",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        visitorId: { label: "VisitorId", type: "text" },
        deviceInfo: { label: "DeviceInfo", type: "text" },
        force: { label: "Force", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          !credentials?.visitorId
        ) {
          throw new Error("Please provide all required credentials");
        }

        const user = await prisma.User.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            activeSessions: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("No user found");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Incorrect password");
        }

        // Parse device info if provided
        let deviceInfo;

        try {
          deviceInfo = credentials.deviceInfo
            ? JSON.parse(credentials.deviceInfo)
            : {};
        } catch (e) {
          deviceInfo = {};
        }

        // Check for existing active sessions
        if (user.activeSessions.length > 0) {
          const existingSession = user.activeSessions[0];

          if (existingSession.visitorId === credentials.visitorId) {
            // Update existing session's last active time
            await prisma.activeSession.update({
              where: { id: existingSession.id },
              data: {
                lastActive: new Date(),
                deviceName: deviceInfo.deviceName,
                deviceLocation: deviceInfo.deviceLocation,
              },
            });
          } else {
            const forceLogin = credentials.force === "true";

            if (!forceLogin) {
              throw new Error("Account is already active on another device");
            }

            // If force login, delete all existing sessions first
            await prisma.activeSession.deleteMany({
              where: { userId: user.id },
            });

            // Create new session
            await prisma.activeSession.create({
              data: {
                userId: user.id,
                visitorId: credentials.visitorId,
                deviceName: deviceInfo.deviceName,
                deviceLocation: deviceInfo.deviceLocation,
              },
            });
          }
        } else {
          // Create new session
          await prisma.activeSession.create({
            data: {
              userId: user.id,
              visitorId: credentials.visitorId,
              deviceName: deviceInfo.deviceName,
              deviceLocation: deviceInfo.deviceLocation,
            },
          });
        }

        return user;
      },
    }),
  ],

  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.AUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user = {
          id: token.sub || token.id,
          name: token.name,
          email: token.email,
          role: token.role,
          image: token.picture,
          verified: token.verified,
          phone: token.phone,
          studentType: token.studentType,
        };
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const currentUser = await prisma.User.findFirst({
          where: {
            email: user.email,
          },
          include: {
            accounts: true,
            activeSessions: true,
          },
        });

        if (currentUser) {
          token.id = currentUser.id;
          token.name = currentUser.name;
          token.email = currentUser.email;
          token.picture = currentUser.image;
          token.role = currentUser.role;
          token.verified = currentUser.emailVerified;
          token.phone = currentUser.phone;
          token.studentType = currentUser.studentType;
        }
      }

      return token;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // Force a session update on sign in
      if (user) {
        const currentUser = await prisma.User.findFirst({
          where: { email: user.email },
        });

        if (currentUser) {
          user.role = currentUser.role;
        }
      }
    },
    async signOut({ token }) {
      // Clean up active sessions on sign out
      if (token?.id) {
        await prisma.activeSession.deleteMany({
          where: { userId: token.id },
        });
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
