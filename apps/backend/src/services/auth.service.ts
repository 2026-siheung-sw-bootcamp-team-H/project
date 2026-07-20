import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";

type AdminTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export async function loginAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.", 401, "INVALID_CREDENTIALS");
  }

  const payload: AdminTokenPayload = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
    issuer: "siheung-security-platform",
    audience: "siheung-admin"
  });

  return { token, name: user.name, email: user.email, expiresIn: env.jwtExpiresIn };
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: "siheung-security-platform",
      audience: "siheung-admin"
    });

    if (
      typeof payload === "string" ||
      !payload.sub ||
      typeof payload.email !== "string" ||
      payload.role !== UserRole.ADMIN
    ) {
      throw new Error("Invalid token payload");
    }

    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    throw new AppError("유효하지 않거나 만료된 인증 토큰입니다.", 401, "INVALID_TOKEN");
  }
}
