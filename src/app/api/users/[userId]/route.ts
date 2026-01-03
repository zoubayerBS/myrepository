import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/local-data';

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    await deleteUser(userId);
    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
