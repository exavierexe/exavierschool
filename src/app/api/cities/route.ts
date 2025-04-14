import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'worldcities.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving cities file:', error);
    return new NextResponse('Error serving cities file', { status: 500 });
  }
} 