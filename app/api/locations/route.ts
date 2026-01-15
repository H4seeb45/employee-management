import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const locations = await prisma.location.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
}
