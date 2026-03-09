import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── All system permissions ─────────────────────────────────
const PERMISSIONS = [
  { key: "dashboard.view", module: "Dashboard", label: "View Dashboard" },
  { key: "workers.view", module: "Workers", label: "View Workers" },
  { key: "workers.manage", module: "Workers", label: "Add/Edit/Delete Workers" },
  { key: "products.view", module: "Products", label: "View Products" },
  { key: "products.manage", module: "Products", label: "Add/Edit/Delete Products" },
  { key: "production.view", module: "Production", label: "View Production" },
  { key: "production.manage", module: "Production", label: "Manage Production Days" },
  { key: "attendance.view", module: "Attendance", label: "View Attendance" },
  { key: "attendance.log", module: "Attendance", label: "Log Attendance" },
  { key: "leave.view", module: "Leave", label: "View Leave Requests" },
  { key: "leave.apply", module: "Leave", label: "Apply for Leave" },
  { key: "payroll.view", module: "Payroll", label: "View Payroll/Salary Data" },
  { key: "payroll.manage", module: "Payroll", label: "Run/Edit/Delete Payroll" },
  { key: "reports.view", module: "Reports", label: "View Reports" },
  { key: "calendar.view", module: "Calendar", label: "View Calendar" },
  { key: "locations.manage", module: "Locations", label: "Manage Locations" },
  { key: "admin.users", module: "Admin", label: "Manage Users" },
  { key: "admin.roles", module: "Admin", label: "Manage Roles & Permissions" },
  { key: "ai.use", module: "AI Assistant", label: "Use AI Assistant" },
];

// ─── Default roles + their permission keys ──────────────────
const ROLES = [
  {
    name: "SuperAdmin",
    description: "Full system access",
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key), // ALL
  },
  {
    name: "Admin",
    description: "Full access except role management",
    isSystem: true,
    permissions: PERMISSIONS.filter((p) => p.key !== "admin.roles").map((p) => p.key),
  },
  {
    name: "Manager",
    description: "Location-scoped management",
    isSystem: false,
    permissions: [
      "dashboard.view", "workers.view", "workers.manage",
      "production.view", "production.manage",
      "attendance.view", "attendance.log",
      "leave.view", "leave.apply",
      "payroll.view",
      "reports.view", "calendar.view",
    ],
  },
  {
    name: "Supervisor",
    description: "Production & attendance access",
    isSystem: false,
    permissions: [
      "dashboard.view",
      "production.view", "production.manage",
      "attendance.view", "attendance.log",
      "leave.view", "leave.apply",
      "calendar.view",
    ],
  },
];

async function main() {
  const OLD_DOMAIN = "@metrowage.com";
  const NEW_DOMAIN = "@metromarqo.lk";

  // 1. Migrate old domain emails
  const usersToUpdate = await prisma.user.findMany({
    where: { email: { endsWith: OLD_DOMAIN } },
  });
  for (const user of usersToUpdate) {
    const newEmail = user.email.replace(OLD_DOMAIN, NEW_DOMAIN);
    await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
    console.log(`✅ Migrated ${user.email} -> ${newEmail}`);
  }

  // 2. Seed Locations
  const locations = [
    { name: "Colombo West", address: "123 Main St, Colombo" },
    { name: "Kandy Central", address: "456 Hill Road, Kandy" },
  ];
  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: locations.indexOf(loc) + 1 },
      update: {},
      create: loc,
    });
  }
  console.log("✅ Locations seeded.");

  // 3. Seed ALL permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { module: perm.module, label: perm.label },
      create: perm,
    });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded.`);

  // 4. Seed default roles + assign permissions
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: roleDef.isSystem },
      create: { name: roleDef.name, description: roleDef.description, isSystem: roleDef.isSystem },
    });

    // Get permission IDs for this role
    const perms = await prisma.permission.findMany({
      where: { key: { in: roleDef.permissions } },
    });

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`✅ Role "${role.name}" seeded with ${perms.length} permissions.`);
  }

  // 5. Seed SuperAdmin user
  const hashedDefault = await bcrypt.hash("Admin@1234", 10);
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SuperAdmin" } });
  const superAdminEmail = `superadmin${NEW_DOMAIN}`;

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { roleId: superAdminRole!.id },
    create: {
      email: superAdminEmail,
      name: "Super Admin",
      password: hashedDefault,
      role: "SuperAdmin",
      roleId: superAdminRole!.id,
    },
  });
  console.log(`✅ SuperAdmin seeded — ${superAdminEmail}`);

  // 6. Seed Manager user (Location 1)
  const managerRole = await prisma.role.findUnique({ where: { name: "Manager" } });
  const managerEmail = `manager${NEW_DOMAIN}`;

  await prisma.user.upsert({
    where: { email: managerEmail },
    update: { roleId: managerRole!.id },
    create: {
      email: managerEmail,
      name: "Colombo Manager",
      password: hashedDefault,
      role: "Manager",
      roleId: managerRole!.id,
      locationId: 1,
    },
  });
  console.log(`✅ Manager seeded — ${managerEmail} (Location 1)`);

  // 7. Assign roleId to any existing users that don't have one
  const unassigned = await prisma.user.findMany({ where: { roleId: null } });
  for (const user of unassigned) {
    const matchedRole = await prisma.role.findUnique({ where: { name: user.role } });
    if (matchedRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: matchedRole.id },
      });
      console.log(`✅ Assigned role "${matchedRole.name}" to user "${user.name}"`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
