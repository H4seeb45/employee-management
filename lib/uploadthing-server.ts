import { UTApi } from "uploadthing/server";
import { isLocalHost } from "./utils";

export const utapi = new UTApi({token: process.env.UPLOADTHING_SECRET_STAGING});

/**
 * Extracts the file key from an UploadThing URL.
 * Standard format: https://utfs.io/f/FILE_KEY
 * Older format: https://uploadthing.com/f/FILE_KEY
 */
export function extractFileKey(url: string): string | null {
  if (!url) return null;
  
  if (url.includes("utfs.io/f/")) {
    return url.split("utfs.io/f/")[1];
  }
  
  if (url.includes("uploadthing.com/f/")) {
    return url.split("uploadthing.com/f/")[1];
  }

  // Handle cases where the URL might have query params
  const key = url.split("/").pop();
  return key || null;
}
