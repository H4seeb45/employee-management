import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hashPassword } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const employeeIdValue = await Promise.resolve(params.id);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeIdValue },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found." }, { status: 404 });
    }

    if (employee.user) {
      return NextResponse.json({
        message: "Credentials already exist.",
        email: employee.user.email,
        password: "User already has an active password set previously."
      }, { status: 400 });
    }

    let role = await prisma.role.findUnique({ where: { name: "Employee" } });
    if (!role) {
      role = await prisma.role.create({ data: { name: "Employee" } });
    }

    const rawPassword = `${employee.employeeId}123!`;
    const encryptedPass = await hashPassword(rawPassword);
    
    // Generate a unique email
    const emailPrefix = employee.employeeId.toLowerCase();
    let uniqueEmail = `${emailPrefix}@sadiqtraders.com`;
    let exists = await prisma.user.findUnique({ where: { email: uniqueEmail }});
    let counter = 1;
    while(exists) {
       uniqueEmail = `${emailPrefix}${counter}@sadiqtraders.com`;
       exists = await prisma.user.findUnique({ where: { email: uniqueEmail }});
       counter++;
    }

    const newUser = await prisma.user.create({
      data: {
        email: uniqueEmail,
        passwordHash: encryptedPass,
        locationId: employee.locationId || user.locationId,
        roles: {
          create: { roleId: role.id }
        }
      }
    });

    await prisma.employee.update({
      where: { id: employeeIdValue },
      data: { userId: newUser.id }
    });

    return NextResponse.json({ 
      success: true, 
      email: uniqueEmail, 
      password: rawPassword 
    });
  } catch (error) {
    console.error("Credentials error:", error);
    return NextResponse.json({ message: "Error generating credentials" }, { status: 500 });
  }
}
