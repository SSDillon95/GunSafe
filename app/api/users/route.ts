import { NextResponse } from "next/server";
import { createAppUser, listAppUsers } from "@/lib/db";
import { requireMaster } from "@/lib/session";

export async function GET() {
  try {
    await requireMaster();
    const users = await listAppUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("Master") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireMaster();
    const body = await request.json();
    const user = await createAppUser({
      username: body.username ?? "",
      password: body.password ?? "",
    });
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("Master") ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}