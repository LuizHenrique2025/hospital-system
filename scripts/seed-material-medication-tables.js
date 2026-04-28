const { PrismaClient, PricingTableType } = require('@prisma/client');

const prisma = new PrismaClient();

const tables = [
  'BRASINDICE',
  'SC SAUDE MATERIAL',
  'SIMPRO',
  'SC SAUDE MEDICAMENTOS',
  'MEDICAMENTOS ESPECIAL',
  'OPME',
  'CASSI MEDICAMENTO',
  'UNIMED',
  'PLADISA',
  'CASSI SIMPRO',
  'FUNSERVIR MAT',
  'FUNSERVIR MED',
  'PARTICULAR',
  'BRADESCO MATERIAL',
  'MEDISERVICE MATERIAL',
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const name of tables) {
    const normalizedName = normalizeName(name);
    const code = normalizeCode(name);
    const current = await prisma.pricingTable.findFirst({
      where: { name: normalizedName, year: null },
      select: { id: true },
    });

    if (current) {
      await prisma.pricingTable.update({
        where: { id: current.id },
        data: {
          type: PricingTableType.MATERIAL_MEDICATION,
          code,
          description: 'Tabela de material/medicamento para estoque e farmacia.',
          active: true,
        },
      });
      updated += 1;
    } else {
      await prisma.pricingTable.create({
        data: {
          name: normalizedName,
          type: PricingTableType.MATERIAL_MEDICATION,
          code,
          description: 'Tabela de material/medicamento para estoque e farmacia.',
          active: true,
        },
      });
      created += 1;
    }
  }

  console.log(
    [
      'Cadastro de tabelas de material/medicamento finalizado.',
      `Total informado: ${tables.length}`,
      `Criadas: ${created}`,
      `Atualizadas: ${updated}`,
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
