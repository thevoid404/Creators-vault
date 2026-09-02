/**
 * Promotes an existing user to the `admin` role.
 *
 * There is no way to become the first admin through the API — every admin
 * endpoint already requires the admin role — so the first one is granted here.
 * Sign in with Google once to create the account, then:
 *
 *   npx ts-node scripts/promote-admin.ts you@example.com
 */
import { PrismaClient, Role } from '@prisma/client';

async function main(): Promise<void> {
  const [, , email] = process.argv;
  if (!email) {
    console.error('Usage: ts-node scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      console.error(`No user with email ${email}. Sign in through the OAuth flow first.`);
      process.exit(1);
    }
    if (user.role === Role.admin) {
      console.log(`${email} is already an admin.`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: Role.admin } });
    console.log(`${email} is now an admin.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
