import type { Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.ts";
import type {
  RegisterBody,
  LoginBody,
  RefreshTokenBody,
} from "../validators/auth.validator.ts";

const ACCESS_TOKEN_LIFETIME = 15 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000;

const createTokens = async (userId: number) => {
  const accessToken = jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_LIFETIME / 1000 },
  );

  const refreshToken = jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: { userId },
    }),
    prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
      },
    }),
  ]);

  return { accessToken, refreshToken };
};

export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  const { username, email, password, name } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name,
    },
  });

  const tokens = await createTokens(user.id);

  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = await createTokens(user.id);

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
};

export const refresh = async (
  req: Request<{}, {}, RefreshTokenBody>,
  res: Response,
) => {
  const refreshToken = req.body?.refreshToken;

  if (!refreshToken) {
    throw createHttpError(401, "Refresh token not provided");
  }

  let payload;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    payload = decoded as jwt.JwtPayload;
  } catch {
    throw createHttpError(401, "Invalid or expired refresh token");
  }

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      userId: Number(payload.sub),
    },
  });

  if (!storedToken) {
    throw createHttpError(401, "Invalid refresh token");
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw createHttpError(401, "Refresh token expired");
  }

  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });

  const tokens = await createTokens(storedToken.userId);

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
};

export const logout = async (req: Request, res: Response) => {
  await prisma.refreshToken.deleteMany({
    where: { userId: Number(req.user!.sub) },
  });

  res.status(204).end();
};

export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user!.sub) },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  res.status(200).json(user);
};
