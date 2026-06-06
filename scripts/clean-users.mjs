import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const sessions = await prisma.session.deleteMany({});
console.log("Deleted sessions:", sessions.count);

const accounts = await prisma.account.deleteMany({});
console.log("Deleted accounts:", accounts.count);

const users = await prisma.user.deleteMany({});
console.log("Deleted users:", users.count);

await prisma.$disconnect();
console.log("Done — database is clean.");
