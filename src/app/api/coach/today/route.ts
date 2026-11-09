import { apiAuthorized, unauthorized } from "@/lib/auth";
import { buildContext } from "@/lib/context";
import { runSync } from "@/lib/sync";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!apiAuthorized(req)) return unauthorized();
  const sync = await runSync(undefined, 2); // sync first; failures are reported, not hidden
  return Response.json({ sync, ...(await buildContext()) });
}
