import { NextRequest } from 'next/server';
import { getPages, addPages } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getPages());
}

export async function POST(req: NextRequest) {
  const { page } = await req.json() as { page: string };
  if (page && page.trim()) await addPages([page.trim()]);
  return Response.json(await getPages());
}
