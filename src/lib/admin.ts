import { createHash } from "crypto";

export function isModerationEnabled(): boolean {
  return Boolean(process.env.MODERATION_SECRET);
}

export function moderationSecretHash(): string | null {
  const secret = process.env.MODERATION_SECRET;
  if (!secret) {
    return null;
  }
  return createHash("sha256").update(secret).digest("hex");
}

export function hashModerationSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isAdminTokenValid(token: string | undefined): boolean {
  const expected = moderationSecretHash();
  if (!token || !expected) {
    return false;
  }
  return token === expected;
}
