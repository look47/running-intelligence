import { cronAuthorized, unauthorized } from "@/lib/auth";
import { runSync } from "@/lib/sync";
export const maxDuration = 60;
export async function GET(req: Request) { return cronAuthorized(req) ? Response.json(await runSync()) : unauthorized(); }
