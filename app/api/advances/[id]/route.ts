import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasRole } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { status, principalAmount, dueAt, notes } = body;
    const isAdmin = isAdminUser(user);
    const isCashier = hasRole(user, "Cashier") || hasRole(user, "Accountant");
    const isBusinessManager = hasRole(user, "Business Manager");
    const id = await Promise.resolve(params.id);

    if (!isAdmin && !isCashier && !isBusinessManager) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const advance = await prisma.advance.findUnique({ where: { id } });
    if (!advance) {
      return NextResponse.json({ error: "Advance not found" }, { status: 404 });
    }

    let updateData: any = {};

    if (status) {
      if (status === "Approved" || status === "Rejected") {
        if (!isAdmin) {
           return NextResponse.json({ error: "Only admins can approve or reject advances." }, { status: 403 });
        }
      }

      if (status === "Disbursed") {
        if (!isCashier && !isAdmin) {
           return NextResponse.json({ error: "Only cashiers or admins can disburse advances." }, { status: 403 });
        }
        if (advance.status !== "Approved" && advance.status !== "Disbursed") {
           return NextResponse.json({ error: "Advance must be approved before disbursal." }, { status: 400 });
        }
      }
      updateData.status = status;
    }

    if (principalAmount !== undefined || dueAt !== undefined || notes !== undefined) {
      if (advance.status !== "Submitted") {
         return NextResponse.json({ error: "Only submitted advances can be edited." }, { status: 400 });
      }
      if (!isAdmin && !isBusinessManager) {
         return NextResponse.json({ error: "Only admins or business managers can edit advances." }, { status: 403 });
      }
      
      if (principalAmount !== undefined) {
         updateData.principalAmount = parseFloat(principalAmount);
         updateData.balance = parseFloat(principalAmount);
      }
      if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
      if (notes !== undefined) updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(advance);
    }

    const updated = await prisma.advance.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update advance status" }, { status: 500 });
  }
}
