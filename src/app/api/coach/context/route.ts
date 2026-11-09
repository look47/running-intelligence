import { apiAuthorized, unauthorized } from "@/lib/auth";
import { buildContext } from "@/lib/context";
export async function GET(req: Request) { return apiAuthorized(req) ? Response.json(await buildContext()) : unauthorized(); }
