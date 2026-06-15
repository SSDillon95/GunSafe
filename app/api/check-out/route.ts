import { NextResponse } from "next/server";
import { recordCheckOut } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const officerId = Number(body.officer_id);
    const lockerId = Number(body.locker_id);

    if (!officerId || !lockerId) {
      return NextResponse.json(
        { success: false, error: "Officer and locker are required." },
        { status: 400 }
      );
    }

    const event = recordCheckOut(officerId, lockerId);
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}