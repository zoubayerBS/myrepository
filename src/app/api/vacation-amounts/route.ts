// src/app/api/vacation-amounts/route.ts
import { NextResponse } from 'next/server';
import { getVacationAmounts, updateVacationAmounts } from '@/lib/local-data';

export async function GET() {
  try {
    const amounts = await getVacationAmounts();
    return NextResponse.json(amounts);
  } catch (error) {
    console.error('Failed to get vacation amounts:', error);
    return NextResponse.json({ error: 'Failed to get vacation amounts' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const amounts = await request.json();
    await updateVacationAmounts(amounts);
    return NextResponse.json({ message: 'Amounts updated successfully' });
  } catch (error) {
    console.error('Failed to update vacation amounts:', error);
    return NextResponse.json({ error: 'Failed to update vacation amounts' }, { status: 500 });
  }
}