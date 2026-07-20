import { NextResponse } from 'next/server';
import mockData from '../../../data/mock.json';

export const runtime = 'edge';

export async function GET() {
  // Returns food stations for the iOS App
  return NextResponse.json(mockData.foodStations);
}
