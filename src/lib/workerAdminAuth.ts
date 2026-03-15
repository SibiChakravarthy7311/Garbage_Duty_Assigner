const ADMIN_COOKIE_NAME = "garbage_duty_admin";
const SESSION_PAYLOAD = "admin";

export interface WorkerAuthConfig {
  houseAddress: string;
  adminUsername: string;
  adminPassword: string;
}

function parseCookies(cookieHeader?: string | null): Record<string, string> {
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

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function createSignature(payload: string, config: WorkerAuthConfig): Promise<string> {
  const secret = `${config.houseAddress}:${config.adminUsername}:${config.adminPassword}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

async function createSessionToken(config: WorkerAuthConfig): Promise<string> {
  return `${SESSION_PAYLOAD}.${await createSignature(SESSION_PAYLOAD, config)}`;
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function isAdminAuthenticated(request: Request, config: WorkerAuthConfig): Promise<boolean> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[ADMIN_COOKIE_NAME];
  if (!token) {
    return false;
  }

  return safeEqual(token, await createSessionToken(config));
}

export function adminCredentialsMatch(
  username: string | undefined,
  password: string | undefined,
  config: WorkerAuthConfig
): boolean {
  if (!username || !password) {
    return false;
  }

  return safeEqual(username.trim(), config.adminUsername) && safeEqual(password, config.adminPassword);
}

export async function createAdminSessionCookie(config: WorkerAuthConfig): Promise<string> {
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(await createSessionToken(config))}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function clearAdminSessionCookie(): string {
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}
