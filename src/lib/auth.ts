import { timingSafeEqual } from 'node:crypto';
const eq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function apiAuthorized(req: Request) {
  const s = process.env.SERVICE_API_SECRET?.trim(), k = req.headers.get('x-api-key')?.trim();
  return !!s && !!k && eq(k, s);
}
export function cronAuthorized(req: Request) {
  const s = process.env.CRON_SECRET?.trim(), h = req.headers.get('authorization')?.trim();
  return !!s && !!h && eq(h, `Bearer ${s}`);
}
export const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
