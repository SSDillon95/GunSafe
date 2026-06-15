import { NextResponse } from "next/server";
import { listActiveSessions, listCheckEvents } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const active = await listActiveSessions();

    if (session.role !== "master") {
      return NextResponse.json({
        success: true,
        data: { events: [], active },
      });
    }

    const events = await listCheckEvents();
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