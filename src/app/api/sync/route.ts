import { apiAuthorized, unauthorized } from "@/lib/auth";
import { runSync } from "@/lib/sync";
export const maxDuration = 60;
export async function POST(req: Request) { return apiAuthorized(req) ? Response.json(await runSync()) : unauthorized(); }
