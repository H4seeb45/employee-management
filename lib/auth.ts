import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_ALG = "HS256";

const getAuthSecret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export const generatePassword = (length = 12) =>
  crypto.randomBytes(length).toString("base64url").slice(0, length);

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, 10);

export const verifyPassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

type SessionPayload = {
  userId: string;
};

export const createSessionToken = async (payload: SessionPayload) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: SESSION_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getAuthSecret());

export const verifySessionToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
};

export const getSessionToken = (request: NextRequest) =>
  request.cookies.get(SESSION_COOKIE_NAME)?.value;

export const getCurrentUser = async (request: NextRequest) => {
  const token = getSessionToken(request);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      location: true,
      roles: { include: { role: true } },
    },
  });
};

export const isSuperAdminUser = (
  user: Awaited<ReturnType<typeof getCurrentUser>>
) =>
  Boolean(
    user?.roles?.some((userRole) => userRole.role.name === "Super Admin")
  );

export const isAdminUser = (user: Awaited<ReturnType<typeof getCurrentUser>>) =>
  Boolean(
    user?.roles?.some((userRole) =>
      ["Admin", "Super Admin"].includes(userRole.role.name)
    )
  );

export const hasRole = (
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  roleName: string
) => Boolean(user?.roles?.some((userRole) => userRole.role.name === roleName));
