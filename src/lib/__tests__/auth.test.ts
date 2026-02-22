// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const mockSet = vi.fn();
const mockCookies = vi.fn().mockResolvedValue({ set: mockSet });

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

import { createSession } from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an httpOnly cookie with a valid JWT", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [name, token, options] = mockSet.mock.calls[0];

  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession produces a JWT containing userId and email", async () => {
  await createSession("user-456", "alice@example.com");

  const token = mockSet.mock.calls[0][1];
  const secret = new TextEncoder().encode("development-secret-key");
  const { payload } = await jwtVerify(token, secret);

  expect(payload.userId).toBe("user-456");
  expect(payload.email).toBe("alice@example.com");
});

test("createSession sets cookie expiry to 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-789", "bob@example.com");
  const after = Date.now();

  const options = mockSet.mock.calls[0][2];
  const expiresMs = options.expires.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDays);
});

test("createSession sets secure flag based on NODE_ENV", async () => {
  await createSession("user-1", "test@example.com");

  const options = mockSet.mock.calls[0][2];
  // In test environment NODE_ENV is "test", not "production"
  expect(options.secure).toBe(false);
});
