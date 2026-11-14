import { NextResponse, connection } from 'next/server';
import {
  geminiRotator,
  GeminiConfigError,
  type AskBarnabyParams,
} from '@/lib/gemini';

export async function GET() {
  await connection();
  const telemetry = geminiRotator.getTelemetry();
  return NextResponse.json({
    anyConfigured: telemetry.anyConfigured,
    nextSlot: telemetry.nextSlot,
    slots: telemetry.slots.map((s) => ({
      id: s.id,
      envName: s.envName,
      configured: s.configured,
      requestCount: s.requestCount,
      lastStatus: s.lastStatus,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskBarnabyParams;

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { code: 'INVALID_BODY', error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    if (typeof body.userMessage !== 'string') {
      return NextResponse.json(
        {
          code: 'MISSING_MESSAGE',
          error: 'Missing required userMessage parameter',
        },
        { status: 400 }
      );
    }

    const result = await geminiRotator.executeWithRotator(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        code: 'GEMINI_REQUEST_FAILED',
        error:
          error instanceof Error
            ? error.message
            : 'Internal Barnaby Socratic Engine Error',
      },
      { status: 500 }
    );
  }
}
