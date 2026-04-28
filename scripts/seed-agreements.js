const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const agreements = [
  'ALL DOCTORS',
  'AMIL',
  'AWP BRASIL',
  'BRADESCO OPERADORA',
  'BRADESCO SAUDE',
  'CARTOES DESCONTOS',
  'CASSI',
  'CIS AMFRI',
  'CLIOMED',
  'COLEGIO',
  'EMPRESAS',
  'FUNCIONARIOS',
  'FUNSERVIR',
  'GEAP',
  'ITAPEMA SAUDE PREMIUM',
  'ITAPEMA SAUDE VOUCHER',
  'LABORATORIOS INFUSAO DE MEDICACAO',
  'MEDISERVICE',
  'MEDPREV',
  'NR SEGURANCA DO TRABALHO',
  'PARANA CLINICAS',
  'PARTICULAR',
  'PERMUTA',
  'PLADISA',
  'PREFEITURA BALNEARIO CAMBORIU',
  'PREFEITURA ITAPEMA',
  'PREFEITURA PORTO BELO',
  'PROFISSIONAIS',
  'PRUDENTIAL',
  'SAUDE CAIXA',
  'SC SAUDE',
  'SEGUROS NACIONAIS E INTERNACIONAIS',
  'SELECT',
  'SESI & FIESC',
  'SIDESC',
  'SIM SAUDE CABERGS',
  'UNIMED',
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const name of agreements) {
    const normalizedName = normalizeName(name);
    const code = normalizeCode(name);
    const current = await prisma.healthInsuranceProvider.findUnique({
      where: { code },
      select: { id: true },
    });

    await prisma.healthInsuranceProvider.upsert({
      where: { code },
      create: {
        name: normalizedName,
        code,
        active: true,
        notes: 'Convenio cadastrado a partir da lista operacional do hospital.',
      },
      update: {
        name: normalizedName,
        active: true,
      },
    });

    if (current) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(
    [
      'Cadastro de convenios finalizado.',
      `Total informado: ${agreements.length}`,
      `Criados: ${created}`,
      `Atualizados: ${updated}`,
    ].join('\n'),
  );
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeCode(value) {
  return normalizeName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
