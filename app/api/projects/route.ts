import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, isAdminUser, isSuperAdminUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAdmin = isAdminUser(user)
    const isSuperAdmin = isSuperAdminUser(user)
    const { searchParams } = new URL(request.url)
    const locationId = isSuperAdmin ? searchParams.get("locationId") : null
    const projects = await prisma.project.findMany({
      include: { members: true },
      where: isAdmin
        ? locationId
          ? { members: { some: { employee: { locationId } } } }
          : undefined
        : { members: { some: { employee: { locationId: user.locationId } } } },
    })
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const isAdmin = isAdminUser(user)
    const body = await req.json()
    // create project and members if provided
    const { members, ...rest } = body
    if (!isAdmin && Array.isArray(members) && members.length > 0) {
      const memberEmployees = await prisma.employee.findMany({
        where: { id: { in: members } },
        select: { id: true, locationId: true },
      })
      const invalidMember = memberEmployees.some(
        (emp) => emp.locationId !== user.locationId
      )
      if (invalidMember || memberEmployees.length !== members.length) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
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
