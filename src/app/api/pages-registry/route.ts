import { NextRequest } from 'next/server';
import { getPages, savePages } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getPages());
}

export async function POST(req: NextRequest) {
  const { page } = await req.json() as { page: string };
  const pages = getPages();
  if (!pages.includes(page)) {
    pages.push(page);
    savePages(pages);
  }
  return Response.json(pages);
}
