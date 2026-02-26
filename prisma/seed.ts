import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "superadmin@metromarqo.lk" },
  });

  if (!existing) {
    const hashed = await bcrypt.hash("Admin@1234", 10);
    await prisma.user.create({
      data: {
        email: "superadmin@metromarqo.lk",
        name: "Super Admin",
        password: hashed,
        role: "SuperAdmin",
      },
    });
    console.log("✅ SuperAdmin seeded — email: superadmin@metromarqo.lk, password: Admin@1234");
  } else {
    console.log("ℹ️  SuperAdmin already exists, skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
