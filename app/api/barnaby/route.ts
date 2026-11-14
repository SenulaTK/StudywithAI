import { NextResponse } from 'next/server';
import { geminiRotator, type AskBarnabyParams } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskBarnabyParams;
    if (!body || typeof body.userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Missing required userMessage parameter' },
        { status: 400 }
      );
    }

    const result = await geminiRotator.executeWithRotator(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal Barnaby Socratic Engine Error',
      },
      { status: 500 }
    );
  }
}
