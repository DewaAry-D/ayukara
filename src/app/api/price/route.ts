import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Price API endpoint (Fase 4)' });
}
