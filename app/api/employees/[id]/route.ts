import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { utapi, extractFileKey } from "@/lib/uploadthing-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json({ message: "Error fetching employee" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Fetch current employee to compare documents
    const currentEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!currentEmployee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Extract fields that shouldn't be passed directly to Prisma or need conversion
    const { 
      id: _id, 
      location: _location, 
      createdAt: _createdAt, 
      updatedAt: _updatedAt,
      cnicIssueDate,
      cnicExpiryDate,
      birthDate,
      joinDate,
      leaveDate,
      probationConfirmationDate,
      ...updateData 
    } = body;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        ...updateData,
        // Convert string dates to Date objects if they exist
        cnicIssueDate: cnicIssueDate ? new Date(cnicIssueDate) : undefined,
        cnicExpiryDate: cnicExpiryDate ? new Date(cnicExpiryDate) : undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        joinDate: joinDate ? new Date(joinDate) : undefined,
        leaveDate: leaveDate ? new Date(leaveDate) : undefined,
        probationConfirmationDate: probationConfirmationDate ? new Date(probationConfirmationDate) : undefined,
      },
    });

    // Cleanup old files from UploadThing
    const DOCUMENT_FIELDS = [
      "avatar", "cnicCopyUrl", "eduDocsUrl", "cvUrl", "guaranteeChequeUrl", 
      "guarantorChequeUrl", "guarantorCnicUrl", "stampPaperUrl", "utilityBillUrl", 
      "drivingLicenseUrl", "policeCertUrl", "clearanceLetterUrl"
    ];

    const keysToDelete: string[] = [];

    for (const field of DOCUMENT_FIELDS) {
      const oldUrl = currentEmployee[field as keyof typeof currentEmployee] as string | null;
      const newUrl = updatedEmployee[field as keyof typeof updatedEmployee] as string | null;

      // If URL changed and old URL exists, we delete the old file
      if (oldUrl && oldUrl !== newUrl) {
        const key = extractFileKey(oldUrl);
        if (key) keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      try {
        await utapi.deleteFiles(keysToDelete);
      } catch (err) {
        console.error("Failed to delete files from UploadThing:", err);
        // We don't fail the request if file deletion fails, as the DB is already updated
      }
    }

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json({ message: "Error updating employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    // Soft delete: Mark as inactive
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        status: "Inactive:Terminated", // Defaulting to one of the inactive statuses
      },
    });

    return NextResponse.json({ message: "Employee marked as inactive", employee });
  } catch (error) {
    console.error("Error marking employee inactive:", error);
    return NextResponse.json({ message: "Error marking employee inactive" }, { status: 500 });
  }
}
