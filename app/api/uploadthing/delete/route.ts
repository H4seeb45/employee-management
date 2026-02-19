import { NextResponse, type NextRequest } from "next/server";
import { utapi, extractFileKey } from "@/lib/uploadthing-server";
import { getCurrentUser, isAdminUser, hasRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user || (!isAdminUser(user) && !hasRole(user, "Business Manager"))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    const key = extractFileKey(url);
    if (!key) {
      return NextResponse.json({ message: "Invalid file URL" }, { status: 400 });
    }

    const response = await utapi.deleteFiles([key]);
    console.log("key", key);
    console.log("UploadThing delete response:", response);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file from UploadThing:", error);
    return NextResponse.json({ message: "Error deleting file" }, { status: 500 });
  }
}
