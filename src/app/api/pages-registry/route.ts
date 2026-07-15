import { NextRequest } from 'next/server';
import { getPages, addPages } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getPages());
}

export async function POST(req: NextRequest) {
  let page: unknown;
  try {
    ({ page } = await req.json() as { page?: unknown });
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof page !== 'string' || !page.trim()) {
    return Response.json({ error: 'page must be a non-empty string' }, { status: 400 });
  }
  await addPages([page.trim()]);
  return Response.json(await getPages());
}
