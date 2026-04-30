const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sectors = [
  {
    name: 'Pronto Atendimento',
    code: 'PA',
    description: 'Triagem, recepcao rapida e atendimento imediato.',
  },
  {
    name: 'Consultorio',
    code: 'CONS',
    description: 'Atendimentos medicos eletivos e acompanhamento clinico.',
  },
  {
    name: 'Farmacia',
    code: 'FARM',
    description: 'Dispensacao de medicamentos vinculada ao estoque.',
  },
  {
    name: 'Estoque',
    code: 'EST',
    description: 'Controle de insumos, lotes e movimentacoes.',
  },
  {
    name: 'Faturamento',
    code: 'FAT',
    description: 'Contas, repasses, recibos e notas fiscais.',
  },
  {
    name: 'Administrativo',
    code: 'ADM',
    description: 'Gestao interna, cadastros e apoio operacional.',
  },
];

async function main() {
  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { code: sector.code },
      update: sector,
      create: sector,
    });
  }

  console.log(`Setores base sincronizados: ${sectors.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
