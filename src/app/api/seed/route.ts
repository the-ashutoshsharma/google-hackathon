import { NextResponse } from 'next/server';
import { seedDatabase } from '../../../../prisma/seed';

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: 'Demo dataset populated successfully.',
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during seeding',
      },
      { status: 500 }
    );
  }
}
