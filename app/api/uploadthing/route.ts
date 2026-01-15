import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "./core";

const handler = createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
  },
});

const isUploadthingConfigured = () => Boolean(process.env.UPLOADTHING_TOKEN);

export async function GET(request: NextRequest) {
  if (!isUploadthingConfigured()) {
    return NextResponse.json(
      {
        message:
          "UploadThing is not configured. Set UPLOADTHING_TOKEN in the environment.",
      },
      { status: 500 }
    );
  }
  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isUploadthingConfigured()) {
    return NextResponse.json(
      {
        message:
          "UploadThing is not configured. Set UPLOADTHING_TOKEN in the environment.",
      },
      { status: 500 }
    );
  }
  return handler.POST(request);
}
