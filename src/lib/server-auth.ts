import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the current authenticated session (server-side).
 * Returns null if not authenticated.
 */
export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Require auth — throws a redirect-like error if not authenticated.
 * Use in API routes or server actions.
 */
export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
