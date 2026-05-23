import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import type { LoginInput, RegisterInput } from "./auth.schema";

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
}) => {
  const existing = payload.supabaseId
    ? await prisma.user.findFirst({ where: { supabaseId: payload.supabaseId } })
    : await prisma.user.findUnique({ where: { email: payload.email } });

  if (existing) {
    const nextName = payload.name || existing.name;
    const nextPhoneNumber = payload.phoneNumber ?? existing.phoneNumber ?? null;

    if (
      nextName !== existing.name ||
      nextPhoneNumber !== existing.phoneNumber
    ) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          name: nextName,
          phoneNumber: nextPhoneNumber,
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
  const random = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(random, 10);

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
