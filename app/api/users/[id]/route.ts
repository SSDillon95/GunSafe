import { NextResponse } from "next/server";
import { deleteAppUser } from "@/lib/db";
import { requireMaster } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMaster();
    const { id } = await params;
    await deleteAppUser(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("Master access") ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}