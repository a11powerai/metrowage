import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
    session: { strategy: "jwt" as const },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                    include: {
                        roleRef: {
                            include: {
                                permissions: {
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                });

                if (!user || !user.active) return null;

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!passwordMatch) return null;

                // Extract permission keys from role
                const permissions = user.roleRef?.permissions.map(
                    (rp) => rp.permission.key
                ) ?? [];

                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.name,
                    role: user.roleRef?.name ?? user.role,
                    roleId: user.roleId,
                    locationId: user.locationId,
                    permissions,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.roleId = user.roleId;
                token.id = user.id;
                token.locationId = user.locationId;
                token.permissions = user.permissions;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role;
                session.user.roleId = token.roleId;
                session.user.id = token.id;
                session.user.locationId = token.locationId;
                session.user.permissions = token.permissions;
            }
            return session;
        },
    },
};

export default NextAuth(authOptions);
