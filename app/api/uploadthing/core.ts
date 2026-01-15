import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser, hasRole } from "@/lib/auth";

const f = createUploadthing();

export const uploadRouter = {
  expenseAttachment: f({
    "application/pdf": { maxFileSize: "5MB" },
    "application/msword": { maxFileSize: "5MB" },
    // "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    //   maxFileSize: "5MB",
    // },
    image: { maxFileSize: "5MB" },
  })
    .middleware(async ({ req }) => {
      const user = await getCurrentUser(req);
      if (!user || !hasRole(user, "Business Manager")) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: user.id, locationId: user.locationId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        locationId: metadata.locationId,
        fileUrl: file.url,
        fileKey: file.key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };
    }),
};

export type UploadRouter = typeof uploadRouter;
