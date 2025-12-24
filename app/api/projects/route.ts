import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ include: { members: true } })
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // create project and members if provided
    const { members, ...rest } = body
    const project = await prisma.project.create({ data: rest })
    if (members && Array.isArray(members)) {
      await Promise.all(
        members.map((empId: string) =>
          prisma.projectMember.create({ data: { projectId: project.id, employeeId: empId } })
        )
      )
    }
    const created = await prisma.project.findUnique({ where: { id: project.id }, include: { members: true } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
