import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { appBaseUrl, escapeHtml, sendMail } from "../../lib/email";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import type {
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schema";

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  phoneNumber?: string | null;
};

const createToken = (user: SafeUser): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
};

export const register = async (payload: RegisterInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber || null,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
    },
  });

  return {
    user,
    token: createToken(user),
  };
};

export const login = async (payload: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (typeof user.passwordHash !== "string" || user.passwordHash.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValidPassword = await bcrypt.compare(
    payload.password,
    user.passwordHash,
  );
  if (!isValidPassword) {
    throw new AppError("Invalid email or password", 401);
  }

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
  };

  return {
    user: safeUser,
    token: createToken(safeUser),
  };
};

export const createFromSupabase = async (payload: {
  supabaseId?: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  password?: string;
}) => {
  const existing = payload.supabaseId
    ? await prisma.user.findFirst({ where: { supabaseId: payload.supabaseId } })
    : await prisma.user.findUnique({ where: { email: payload.email } });

  if (existing) {
    const nextName = payload.name || existing.name;
    const nextPhoneNumber = payload.phoneNumber ?? existing.phoneNumber ?? null;
    const nextPasswordHash = payload.password
      ? await bcrypt.hash(payload.password, 10)
      : null;

    if (
      nextName !== existing.name ||
      nextPhoneNumber !== existing.phoneNumber ||
      nextPasswordHash
    ) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          name: nextName,
          phoneNumber: nextPhoneNumber,
          ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
        },
      });
    }

    return existing;
  }

  // Create a random password hash so the DB field is populated.
  const passwordSource =
    payload.password ?? crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(passwordSource, 10);

  const user = await prisma.user.create({
    data: {
      name: payload.name || "",
      email: payload.email,
      supabaseId: payload.supabaseId,
      phoneNumber: payload.phoneNumber || null,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
    },
  });

  return user;
};


// --- Password reset -------------------------------------------------------
//
// Reset tokens are JWTs signed with JWT_SECRET combined with the user's current
// password hash. Changing the password changes the hash, so a token stops
// verifying the moment it has been used: single-use without a DB table. They
// also cannot be confused with session tokens, which are signed with
// JWT_SECRET alone.

const RESET_TOKEN_TTL = "30m";
const RESET_PURPOSE = "password-reset";
const INVALID_RESET_MESSAGE = "This reset link is invalid or has expired";

const resetSecretFor = (passwordHash: string) =>
  `${env.JWT_SECRET}:${passwordHash}`;

export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

  // Respond identically whether or not the account exists.
  if (!user) return;

  const token = jwt.sign(
    { sub: user.id, purpose: RESET_PURPOSE },
    resetSecretFor(user.passwordHash),
    { expiresIn: RESET_TOKEN_TTL },
  );

  // The token goes in the URL fragment so it is never sent to a server or
  // leaked through the Referer header.
  const link = `${appBaseUrl()}/auth?mode=reset#token=${encodeURIComponent(token)}`;
  const displayName = user.name || "there";

  await sendMail({
    to: user.email,
    subject: "Reset your Secure Study Hub password",
    html: `<p>Hi ${escapeHtml(displayName)},</p>
<p>We received a request to reset your password. This link is valid for 30 minutes and can be used once:</p>
<p><a href="${link}">Reset my password</a></p>
<p>If you didn't request this, you can ignore this email. Your password won't change.</p>`,
    text: `Hi ${displayName},\n\nReset your password (valid for 30 minutes, single use):\n${link}\n\nIf you didn't request this, ignore this email.`,
  });
};

export const resetPassword = async (payload: ResetPasswordInput) => {
  const decoded = jwt.decode(payload.token) as {
    sub?: string;
    purpose?: string;
  } | null;

  if (!decoded?.sub || decoded.purpose !== RESET_PURPOSE) {
    throw new AppError(INVALID_RESET_MESSAGE, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) {
    throw new AppError(INVALID_RESET_MESSAGE, 400);
  }

  try {
    jwt.verify(payload.token, resetSecretFor(user.passwordHash), {
      algorithms: ["HS256"],
    });
  } catch {
    throw new AppError(INVALID_RESET_MESSAGE, 400);
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
};
