import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function kvExec(cmd: unknown[]): Promise<any> {
  const res = await fetch(`${BASE}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([cmd]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const data = await res.json();
  return data[0]?.result ?? null;
}

export async function GET(req: NextRequest) {
  if (!BASE || !TOKEN) return NextResponse.json(null, { status: 503 });

  const userId = req.headers.get('x-user-id');
  if (!userId || userId === 'default') return NextResponse.json(null, { status: 401 });

  try {
    const raw = await kvExec(['GET', `xtz:${userId}`]);
    if (!raw) return NextResponse.json(null);
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE || !TOKEN) return NextResponse.json({ ok: false }, { status: 503 });

  const userId = req.headers.get('x-user-id');
  if (!userId || userId === 'default') return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const body = await req.json();
    await kvExec(['SET', `xtz:${userId}`, JSON.stringify(body)]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
