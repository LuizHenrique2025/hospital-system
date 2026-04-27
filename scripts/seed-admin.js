const bcrypt = require('bcrypt');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminName = process.env.ADMIN_NAME || 'Administrador do Sistema';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hospital.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
    },
  });

  console.log('Usuario ADMIN pronto para uso:');
  console.log(`- ID: ${admin.id}`);
  console.log(`- Nome: ${admin.name}`);
  console.log(`- Login: ${admin.username}`);
  console.log(`- Email: ${admin.email}`);
  console.log(`- Role: ${admin.role}`);
  console.log(`- Senha: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error('Falha ao criar o usuario ADMIN.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
