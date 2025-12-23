import { NextResponse } from 'next/server';
import { getVacationReasons } from '@/lib/local-data';

export async function GET() {
  try {
    const uniqueReasons = await getVacationReasons();
    return NextResponse.json(uniqueReasons);
  } catch (error) {
    console.error('[VACATION_REASONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
