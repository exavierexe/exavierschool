import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'cities.json');
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving cities file:', error);
    return new NextResponse('Error serving cities file', { status: 500 });
  }
} 