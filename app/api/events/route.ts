import { NextResponse } from "next/server";
import { listActiveSessions, listCheckEvents } from "@/lib/db";

export async function GET() {
  try {
    const events = await listCheckEvents();
    const active = await listActiveSessions();
    return NextResponse.json({
      success: true,
      data: { events, active },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}