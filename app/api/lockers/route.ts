import { NextResponse } from "next/server";
import { addLocker, listLockers, setLockerArchived } from "@/lib/db";

export async function GET() {
  try {
    const lockers = await listLockers();
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
    const locker = await addLocker({
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const archived = Boolean(body.archived);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Locker id is required." },
        { status: 400 }
      );
    }

    const locker = await setLockerArchived(id, archived);
    return NextResponse.json({ success: true, data: locker });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}