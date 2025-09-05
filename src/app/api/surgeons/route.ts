
import { NextResponse } from 'next/server';
import { getAllSurgeons, addSurgeon } from '@/lib/local-data';

export async function GET(request: Request) {
  try {
    const surgeons = await getAllSurgeons();
    return NextResponse.json(surgeons);
  } catch (error) {
    console.error('Failed to fetch surgeons:', error);
    return NextResponse.json({ error: 'Failed to fetch surgeons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const newSurgeon = await addSurgeon(name);
    return NextResponse.json(newSurgeon, { status: 201 });
  } catch (error) {
    console.error('Failed to add surgeon:', error);
    return NextResponse.json({ error: 'Failed to add surgeon' }, { status: 500 });
  }
}
