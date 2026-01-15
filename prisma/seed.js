require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : "";
const adapter = dbUrl ? new PrismaPg({ connectionString: dbUrl }) : undefined;
const prisma = dbUrl ? new PrismaClient({ adapter }) : new PrismaClient();

const roles = ["Business Manager", "Cashier", "Admin", "Super Admin", "Employee"];

const locations = [
  { name: "Lahore-1", city: "Lahore" },
  { name: "Lahore-2", city: "Lahore" },
  { name: "Lahore-3", city: "Lahore" },
  { name: "Lahore-4", city: "Lahore" },
  { name: "Lahore-5", city: "Lahore" },
  { name: "Lahore-6", city: "Lahore" },
  { name: "Faisalabad-1", city: "Faisalabad" },
  { name: "Sialkot-1", city: "Sialkot" },
];

const monthlyPettyCashLimit = Number.parseFloat(
  process.env.MONTHLY_PETTY_CASH_LIMIT || "0"
);

const generatePassword = (length = 12) =>
  crypto.randomBytes(length).toString("base64url").slice(0, length);

const employees = [
  {
    id: "EMP001",
    employeeId: "EMP001",
    employeeName: "Employee EMP001",
    position: "Frontend Developer",
    department: "Engineering",
    email: "emp001@example.com",
    joinDate: "2023-05-01",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
    birthDate: "1990-04-15",
    address: "",
    emergencyContact: "",
    bloodGroup: "O+",
    employeeType: "Full-time",
    manager: "",
    salary: "PKR 95,000",
    skills: ["React", "TypeScript", "CSS", "HTML", "JavaScript"],
    education: [
      {
        degree: "BSc Computer Science",
        institution: "Stanford University",
        year: "2012",
      },
      {
        degree: "MSc Web Development",
        institution: "UC Berkeley",
        year: "2014",
      },
    ],
    documents: [
      { name: "Resume.pdf", uploadDate: "2023-05-01" },
      { name: "Contract.pdf", uploadDate: "2023-05-01" },
      { name: "ID.jpg", uploadDate: "2023-05-01" },
    ],
    reviews: [
      {
        title: "Annual Performance Review",
        rating: 4.5,
        comments: "Consistently delivering high-quality work.",
        reviewer: "",
        date: "2023-04-01",
      },
      {
        title: "Project Evaluation",
        rating: 4.8,
        comments: "Outstanding contribution to the website redesign project.",
        reviewer: "",
        date: "2023-02-15",
      },
    ],
    achievements: [
      {
        title: "Employee of the Month",
        description: "Recognized for outstanding performance and dedication.",
        date: "2023-03",
      },
      {
        title: "Project Excellence Award",
        description: "For exceptional contribution to the mobile app launch.",
        date: "2023-01",
      },
    ],
  },
  {
    id: "EMP002",
    employeeId: "EMP002",
    employeeName: "Employee EMP002",
    position: "Marketing Specialist",
    department: "Marketing",
    email: "emp002@example.com",
    joinDate: "2023-04-15",
    status: "On Leave",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP003",
    employeeId: "EMP003",
    employeeName: "Employee EMP003",
    position: "HR Manager",
    department: "Human Resources",
    email: "emp003@example.com",
    joinDate: "2023-04-10",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP004",
    employeeId: "EMP004",
    employeeName: "Employee EMP004",
    position: "Backend Developer",
    department: "Engineering",
    email: "emp004@example.com",
    joinDate: "2023-04-05",
    status: "Remote",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP005",
    employeeId: "EMP005",
    employeeName: "Employee EMP005",
    position: "UX Designer",
    department: "Design",
    email: "emp005@example.com",
    joinDate: "2023-03-20",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP006",
    employeeId: "EMP006",
    employeeName: "Employee EMP006",
    position: "Financial Analyst",
    department: "Finance",
    email: "emp006@example.com",
    joinDate: "2023-03-15",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP007",
    employeeId: "EMP007",
    employeeName: "Employee EMP007",
    position: "Sales Representative",
    department: "Sales",
    email: "emp007@example.com",
    joinDate: "2023-03-10",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP008",
    employeeId: "EMP008",
    employeeName: "Employee EMP008",
    position: "Operations Manager",
    department: "Operations",
    email: "emp008@example.com",
    joinDate: "2023-03-05",
    status: "On Leave",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP009",
    employeeId: "EMP009",
    employeeName: "Employee EMP009",
    position: "Content Writer",
    department: "Marketing",
    email: "emp009@example.com",
    joinDate: "2023-02-25",
    status: "Active",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "EMP010",
    employeeId: "EMP010",
    employeeName: "Employee EMP010",
    position: "DevOps Engineer",
    department: "Engineering",
    email: "emp010@example.com",
    joinDate: "2023-02-20",
    status: "Remote",
    avatar: "/placeholder.svg?height=40&width=40",
  },
];

const attendance = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "Employee EMP001",
    date: "2023-05-01",
    checkIn: "09:00 AM",
    checkOut: "06:00 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "9.0",
    status: "Present",
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "Employee EMP002",
    date: "2023-05-01",
    checkIn: "09:30 AM",
    checkOut: "05:30 PM",
    checkInStatus: "late",
    checkOutStatus: "on-time",
    workingHours: "8.0",
    status: "Present",
  },
  {
    id: "3",
    employeeId: "EMP003",
    employeeName: "Employee EMP003",
    date: "2023-05-01",
    checkIn: "08:45 AM",
    checkOut: "05:45 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "9.0",
    status: "Present",
  },
  {
    id: "4",
    employeeId: "EMP004",
    employeeName: "Employee EMP004",
    date: "2023-05-01",
    checkIn: "09:15 AM",
    checkOut: "04:30 PM",
    checkInStatus: "on-time",
    checkOutStatus: "early",
    workingHours: "7.25",
    status: "Present",
  },
  {
    id: "5",
    employeeId: "EMP005",
    employeeName: "Employee EMP005",
    date: "2023-05-01",
    checkIn: "",
    checkOut: "",
    checkInStatus: "",
    checkOutStatus: "",
    workingHours: "0",
    status: "Absent",
  },
  {
    id: "6",
    employeeId: "EMP001",
    employeeName: "Employee EMP001",
    date: "2023-04-30",
    checkIn: "08:55 AM",
    checkOut: "06:05 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "9.17",
    status: "Present",
  },
  {
    id: "7",
    employeeId: "EMP002",
    employeeName: "Employee EMP002",
    date: "2023-04-30",
    checkIn: "09:00 AM",
    checkOut: "01:00 PM",
    checkInStatus: "on-time",
    checkOutStatus: "early",
    workingHours: "4.0",
    status: "Half Day",
  },
  {
    id: "8",
    employeeId: "EMP003",
    employeeName: "Employee EMP003",
    date: "2023-04-30",
    checkIn: "08:50 AM",
    checkOut: "05:50 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "9.0",
    status: "Present",
  },
  {
    id: "9",
    employeeId: "EMP004",
    employeeName: "Employee EMP004",
    date: "2023-04-30",
    checkIn: "09:10 AM",
    checkOut: "06:10 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "9.0",
    status: "Present",
  },
  {
    id: "10",
    employeeId: "EMP005",
    employeeName: "Employee EMP005",
    date: "2023-04-30",
    checkIn: "09:05 AM",
    checkOut: "06:00 PM",
    checkInStatus: "on-time",
    checkOutStatus: "on-time",
    workingHours: "8.92",
    status: "Present",
  },
];

const leaveRequests = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "Employee EMP001",
    leaveType: "Vacation",
    startDate: "2023-05-10",
    endDate: "2023-05-15",
    days: 6,
    reason: "Family vacation",
    status: "Pending",
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "Employee EMP002",
    leaveType: "Sick Leave",
    startDate: "2023-05-03",
    endDate: "2023-05-04",
    days: 2,
    reason: "Not feeling well",
    status: "Approved",
  },
  {
    id: "3",
    employeeId: "EMP003",
    employeeName: "Employee EMP003",
    leaveType: "Personal",
    startDate: "2023-05-08",
    endDate: "2023-05-08",
    days: 1,
    reason: "Personal appointment",
    status: "Approved",
  },
  {
    id: "4",
    employeeId: "EMP004",
    employeeName: "Employee EMP004",
    leaveType: "Vacation",
    startDate: "2023-05-20",
    endDate: "2023-05-27",
    days: 8,
    reason: "Summer vacation",
    status: "Pending",
  },
  {
    id: "5",
    employeeId: "EMP005",
    employeeName: "Employee EMP005",
    leaveType: "Unpaid Leave",
    startDate: "2023-05-15",
    endDate: "2023-05-19",
    days: 5,
    reason: "Family emergency",
    status: "Rejected",
  },
  {
    id: "6",
    employeeId: "EMP006",
    employeeName: "Employee EMP006",
    leaveType: "Sick Leave",
    startDate: "2023-05-05",
    endDate: "2023-05-05",
    days: 1,
    reason: "Doctor's appointment",
    status: "Approved",
  },
  {
    id: "7",
    employeeId: "EMP007",
    employeeName: "Employee EMP007",
    leaveType: "Personal",
    startDate: "2023-05-12",
    endDate: "2023-05-12",
    days: 1,
    reason: "Personal reasons",
    status: "Pending",
  },
  {
    id: "8",
    employeeId: "EMP008",
    employeeName: "Employee EMP008",
    leaveType: "Vacation",
    startDate: "2023-05-01",
    endDate: "2023-05-05",
    days: 5,
    reason: "Spring break",
    status: "Approved",
  },
  {
    id: "9",
    employeeId: "EMP009",
    employeeName: "Employee EMP009",
    leaveType: "Sick Leave",
    startDate: "2023-05-02",
    endDate: "2023-05-03",
    days: 2,
    reason: "Feeling unwell",
    status: "Approved",
  },
  {
    id: "10",
    employeeId: "EMP010",
    employeeName: "Employee EMP010",
    leaveType: "Personal",
    startDate: "2023-05-18",
    endDate: "2023-05-19",
    days: 2,
    reason: "Family event",
    status: "Pending",
  },
];

const projects = [
  {
    id: "1",
    name: "Website Redesign",
    client: "Acme Corporation",
    startDate: "2023-04-01",
    deadline: "2023-06-30",
    team: ["EMP001", "EMP004", "EMP005"],
    progress: 65,
    status: "In Progress",
  },
  {
    id: "2",
    name: "Mobile App Development",
    client: "TechStart Inc.",
    startDate: "2023-03-15",
    deadline: "2023-07-15",
    team: ["EMP004", "EMP010"],
    progress: 40,
    status: "In Progress",
  },
  {
    id: "3",
    name: "Marketing Campaign",
    client: "GreenLife Products",
    startDate: "2023-04-10",
    deadline: "2023-05-10",
    team: ["EMP002", "EMP009", "EMP007"],
    progress: 85,
    status: "In Progress",
  },
  {
    id: "4",
    name: "HR System Implementation",
    client: "Internal",
    startDate: "2023-02-01",
    deadline: "2023-04-30",
    team: ["EMP003", "EMP008"],
    progress: 100,
    status: "Completed",
  },
  {
    id: "5",
    name: "Financial Reporting Tool",
    client: "Global Finance Ltd.",
    startDate: "2023-03-01",
    deadline: "2023-05-31",
    team: ["EMP006", "EMP001"],
    progress: 75,
    status: "In Progress",
  },
  {
    id: "6",
    name: "E-commerce Platform",
    client: "ShopEasy",
    startDate: "2023-01-15",
    deadline: "2023-04-15",
    team: ["EMP001", "EMP004", "EMP005", "EMP010"],
    progress: 100,
    status: "Completed",
  },
  {
    id: "7",
    name: "CRM Integration",
    client: "SalesForce Pro",
    startDate: "2023-04-05",
    deadline: "2023-06-05",
    team: ["EMP007", "EMP002"],
    progress: 30,
    status: "In Progress",
  },
  {
    id: "8",
    name: "Data Migration",
    client: "DataSafe Inc.",
    startDate: "2023-03-20",
    deadline: "2023-05-20",
    team: ["EMP010", "EMP004"],
    progress: 50,
    status: "On Hold",
  },
  {
    id: "9",
    name: "Social Media Strategy",
    client: "BrandBoost",
    startDate: "2023-04-15",
    deadline: "2023-05-15",
    team: ["EMP009", "EMP002"],
    progress: 60,
    status: "In Progress",
  },
  {
    id: "10",
    name: "Office Relocation",
    client: "Internal",
    startDate: "2023-02-15",
    deadline: "2023-03-31",
    team: ["EMP008", "EMP003", "EMP006"],
    progress: 100,
    status: "Completed",
  },
];

async function main() {
  console.log("Seeding database...");

  const locationRecords = [];
  for (const location of locations) {
    const record = await prisma.location.upsert({
      where: { name_city: { name: location.name, city: location.city } },
      update: {
        name: location.name,
        city: location.city,
        monthlyPettyCashLimit,
      },
      create: {
        name: location.name,
        city: location.city,
        monthlyPettyCashLimit,
      },
    });
    locationRecords.push(record);
  }

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { name: roleName },
      create: { name: roleName },
    });
  }

  const adminLocation = locationRecords[0];

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || generatePassword(12);
  const adminRole = await prisma.role.findUnique({
    where: { name: "Admin" },
  });
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });
  if (!existingAdmin && adminRole && adminLocation) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        locationId: adminLocation.id,
        roles: { create: [{ roleId: adminRole.id }] },
      },
    });
    console.log("Admin user created:", adminUser.email);
    if (!process.env.ADMIN_PASSWORD) {
      console.log("Admin password:", adminPassword);
    }
  }

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD || generatePassword(14);
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "Super Admin" },
  });
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail.toLowerCase() },
  });
  if (!existingSuperAdmin && superAdminRole && adminLocation) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);
    const superAdminUser = await prisma.user.create({
      data: {
        email: superAdminEmail.toLowerCase(),
        passwordHash,
        locationId: adminLocation.id,
        roles: { create: [{ roleId: superAdminRole.id }] },
      },
    });
    console.log("Super admin user created:", superAdminUser.email);
    if (!process.env.SUPER_ADMIN_PASSWORD) {
      console.log("Super admin password:", superAdminPassword);
    }
  }

  for (const e of employees) {
    const locationIndex = employees.indexOf(e) % locationRecords.length;
    const location = locationRecords[locationIndex];
    const data = {
      id: e.id,
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      position: e.position || null,
      department: e.department || null,
      email: e.email || null,
      phone: e.phone || null,
      joinDate: e.joinDate ? new Date(e.joinDate) : null,
      status: e.status || null,
      avatar: e.avatar || null,
      birthDate: e.birthDate ? new Date(e.birthDate) : null,
      address: e.address || null,
      emergencyContact: e.emergencyContact || null,
      bloodGroup: e.bloodGroup || null,
      employeeType: e.employeeType || null,
      manager: e.manager || null,
      locationId: location ? location.id : null,
      salary: e.salary || null,
      skills: e.skills || [],
      education: e.education || [],
      documents: e.documents || [],
      reviews: e.reviews || [],
      achievements: e.achievements || [],
    };

    await prisma.employee.upsert({
      where: { employeeId: data.employeeId },
      update: data,
      create: data,
    });
  }

  for (const p of projects) {
    const projData = {
      id: p.id,
      name: p.name,
      client: p.client || null,
      startDate: p.startDate ? new Date(p.startDate) : null,
      deadline: p.deadline ? new Date(p.deadline) : null,
      progress: p.progress ?? null,
      status: p.status || null,
    };

    await prisma.project.upsert({
      where: { id: projData.id },
      update: projData,
      create: projData,
    });

    // project members
    if (Array.isArray(p.team)) {
      for (const memberId of p.team) {
        // create ProjectMember if not exists
        const exists = await prisma.projectMember.findFirst({
          where: { projectId: p.id, employeeId: memberId },
        });
        if (!exists) {
          try {
            await prisma.projectMember.create({
              data: { projectId: p.id, employeeId: memberId },
            });
          } catch (err) {
            console.warn(
              "Failed to create project member",
              p.id,
              memberId,
              err.message
            );
          }
        }
      }
    }
  }

  for (const a of attendance) {
    const attData = {
      id: a.id,
      employeeId: a.employeeId,
      date: a.date ? new Date(a.date) : null,
      checkIn: a.checkIn || null,
      checkOut: a.checkOut || null,
      checkInStatus: a.checkInStatus || null,
      checkOutStatus: a.checkOutStatus || null,
      workingHours: a.workingHours ? parseFloat(a.workingHours) : null,
      status: a.status || null,
    };

    await prisma.attendance.upsert({
      where: { id: attData.id },
      update: attData,
      create: attData,
    });
  }

  for (const l of leaveRequests) {
    const leaveData = {
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employeeName || null,
      leaveType: l.leaveType || null,
      startDate: l.startDate ? new Date(l.startDate) : null,
      endDate: l.endDate ? new Date(l.endDate) : null,
      days: l.days ?? null,
      reason: l.reason || null,
      status: l.status || null,
    };

    await prisma.leaveRequest.upsert({
      where: { id: leaveData.id },
      update: leaveData,
      create: leaveData,
    });
  }

  console.log("Seeding completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
