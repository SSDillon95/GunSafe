import { NextResponse } from "next/server";
import { enrollOfficer, listOfficers, setOfficerArchived } from "@/lib/db";

export async function GET() {
  try {
    const officers = await listOfficers();
    return NextResponse.json({ success: true, data: officers });
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
    const officer = await enrollOfficer({
      badge_number: body.badge_number ?? "",
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      department: body.department,
    });
    return NextResponse.json({ success: true, data: officer }, { status: 201 });
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
        { success: false, error: "Officer id is required." },
        { status: 400 }
      );
    }

    const officer = await setOfficerArchived(id, archived);
    return NextResponse.json({ success: true, data: officer });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}