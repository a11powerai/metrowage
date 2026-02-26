import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const OLD_DOMAIN = "@metrowage.com";
  const NEW_DOMAIN = "@metromarqo.lk";

  // 1. Migrate ALL existing users with the old domain
  const usersToUpdate = await prisma.user.findMany({
    where: {
      email: { endsWith: OLD_DOMAIN },
    },
  });

  if (usersToUpdate.length > 0) {
    console.log(`🚀 Migrating ${usersToUpdate.length} users to the new domain...`);
    for (const user of usersToUpdate) {
      const newEmail = user.email.replace(OLD_DOMAIN, NEW_DOMAIN);
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });
      console.log(`✅ Updated ${user.email} -> ${newEmail}`);
    }
  }

  // 2. Ensure SuperAdmin exists on the new domain
  const superAdminEmail = `superadmin${NEW_DOMAIN}`;
  const existing = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existing) {
    const hashed = await bcrypt.hash("Admin@1234", 10);
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: "Super Admin",
        password: hashed,
        role: "SuperAdmin",
      },
    });
    console.log(`✅ SuperAdmin seeded — email: ${superAdminEmail}, password: Admin@1234`);
  } else {
    console.log(`ℹ️  SuperAdmin (${superAdminEmail}) already exists.`);
  }
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
