import { NextResponse } from 'next/server';
import mockData from '../../../data/mock.json';

export async function GET() {
  // Returns food stations for the iOS App
  return NextResponse.json(mockData.foodStations);
}
