import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: { include: { employee: true } } },
    });
    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (
      !isAdmin &&
      !project.members.some(
        (member) => member.employee?.locationId === user.locationId
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
    const body = await req.json();
    const { members, ...rest } = body;
    if (!isAdmin) {
      const existing = await prisma.project.findUnique({
        where: { id },
        include: { members: { include: { employee: true } } },
      });
      if (
        !existing ||
        !existing.members.some(
          (member) => member.employee?.locationId === user.locationId
        )
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (Array.isArray(members) && members.length > 0) {
        const memberEmployees = await prisma.employee.findMany({
          where: { id: { in: members } },
          select: { id: true, locationId: true },
        });
        const invalidMember = memberEmployees.some(
          (emp) => emp.locationId !== user.locationId
        );
        if (invalidMember || memberEmployees.length !== members.length) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }
    const updated = await prisma.project.update({ where: { id }, data: rest });
    if (members && Array.isArray(members)) {
      // replace members
      await prisma.projectMember.deleteMany({ where: { projectId: id } });
      await Promise.all(
        members.map((empId: string) =>
          prisma.projectMember.create({
            data: { projectId: id, employeeId: empId },
          })
        )
      );
    }
    const result = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = isAdminUser(user);
    const { id } = (await params) as { id: string };
    if (!isAdmin) {
      const existing = await prisma.project.findUnique({
        where: { id },
        include: { members: { include: { employee: true } } },
      });
      if (
        !existing ||
        !existing.members.some(
          (member) => member.employee?.locationId === user.locationId
        )
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
