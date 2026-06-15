import { NextResponse } from "next/server";
import { addLocker, listLockers } from "@/lib/db";

export async function GET() {
  try {
    const lockers = listLockers();
    return NextResponse.json({ success: true, data: lockers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locker = addLocker({
      locker_number: body.locker_number ?? "",
      location: body.location,
    });
    return NextResponse.json({ success: true, data: locker }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}