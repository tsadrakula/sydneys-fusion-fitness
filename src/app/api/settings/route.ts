import { NextResponse } from 'next/server';
import { getScheduleConfig, saveScheduleConfig } from '@/lib/settings';

export async function GET() {
  try {
    const config = getScheduleConfig();
    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    saveScheduleConfig(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Invalid') || message.includes('must be') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
