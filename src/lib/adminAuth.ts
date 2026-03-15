import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RuntimeConfig } from "../config.js";

const ADMIN_COOKIE_NAME = "garbage_duty_admin";
const SESSION_PAYLOAD = "admin";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function createSignature(payload: string, config: RuntimeConfig): string {
  return createHmac("sha256", `${config.houseAddress}:${config.adminUsername}:${config.adminPassword}`)
    .update(payload)
    .digest("hex");
}

function createSessionToken(config: RuntimeConfig): string {
  return `${SESSION_PAYLOAD}.${createSignature(SESSION_PAYLOAD, config)}`;
}

export function isAdminAuthenticated(request: FastifyRequest, config: RuntimeConfig): boolean {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[ADMIN_COOKIE_NAME];
  if (!token) {
    return false;
  }

  return safeEqual(token, createSessionToken(config));
}

export function adminCredentialsMatch(username: string | undefined, password: string | undefined, config: RuntimeConfig): boolean {
  if (!username || !password) {
    return false;
  }

  return safeEqual(username.trim(), config.adminUsername) && safeEqual(password, config.adminPassword);
}

export function setAdminSession(reply: FastifyReply, config: RuntimeConfig): void {
  reply.header(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(createSessionToken(config))}; Path=/; HttpOnly; SameSite=Lax`
  );
}

export function clearAdminSession(reply: FastifyReply): void {
  reply.header(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}
