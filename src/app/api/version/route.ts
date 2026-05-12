import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
    return NextResponse.json({ version: buildId });
  } catch (error) {
    return NextResponse.json({ version: 'development' });
  }
}
