import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = (await params) as { id: string };
    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = (await params) as { id: string };
    const body = await req.json();
    const { members, ...rest } = body;
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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = (await params) as { id: string };
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
