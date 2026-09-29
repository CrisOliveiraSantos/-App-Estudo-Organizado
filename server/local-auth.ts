import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

export const LOCAL_SESSION_COOKIE = "cris_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiration() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function readSessionToken(req: Request) {
  const header = req.headers.cookie ?? "";
  const pair = header.split(";").map(value => value.trim()).find(value => value.startsWith(`${LOCAL_SESSION_COOKIE}=`));
  return pair ? decodeURIComponent(pair.slice(LOCAL_SESSION_COOKIE.length + 1)) : undefined;
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(LOCAL_SESSION_COOKIE, token, { ...getSessionCookieOptions(req), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie(LOCAL_SESSION_COOKIE, getSessionCookieOptions(req));
}
