const { PrismaClient, PricingTableType, ProcedureType } = require('@prisma/client');

const prisma = new PrismaClient();
const batchSize = 200;

async function main() {
  const cbhpmRecords = await prisma.cbhpmProcedure.findMany({
    orderBy: [{ editionYear: 'asc' }, { codigo: 'asc' }],
    select: {
      codigo: true,
      procedimento: true,
      porte: true,
      fracaoPorte: true,
      valorPorteCents: true,
      totalPorteCents: true,
      adicionaisCents: true,
      subtotalCents: true,
      editionYear: true,
      sourceFile: true,
    },
  });

  if (cbhpmRecords.length === 0) {
    throw new Error('Nenhuma CBHPM importada para sincronizar.');
  }

  const years = Array.from(
    new Set(cbhpmRecords.map((record) => record.editionYear)),
  ).sort((left, right) => left - right);
  const latestByCode = resolveLatestProcedureByCode(cbhpmRecords);
  const procedureCodes = Array.from(latestByCode.keys());
  const existingProcedures = await prisma.procedure.findMany({
    where: { code: { in: procedureCodes } },
    select: { code: true, id: true },
  });
  const existingProcedureCodes = new Set(
    existingProcedures.map((procedure) => procedure.code),
  );
  const pricingTableByYear = await upsertPricingTables(years);
  const procedureSync = await upsertProcedures(latestByCode, existingProcedureCodes);
  const procedureByCode = await loadProceduresByCode(procedureCodes);
  const priceSync = await upsertProcedurePrices(
    cbhpmRecords,
    procedureByCode,
    pricingTableByYear,
  );

  console.log(
    [
      'Sincronizacao CBHPM -> Procedimentos finalizada.',
      `Registros CBHPM analisados: ${cbhpmRecords.length}`,
      `Procedimentos unicos: ${procedureCodes.length}`,
      `Procedimentos criados: ${procedureSync.created}`,
      `Procedimentos atualizados: ${procedureSync.updated}`,
      `Tabelas CBHPM vinculadas: ${pricingTableByYear.size}`,
      `Valores de tabela sincronizados: ${priceSync.synced}`,
      `Valores sem preco ignorados: ${priceSync.skipped}`,
    ].join('\n'),
  );
}

async function upsertPricingTables(years) {
  const tableByYear = new Map();

  for (const year of years) {
    const table = await prisma.pricingTable.upsert({
      where: {
        name_year: {
          name: `CBHPM ${year}`,
          year,
        },
      },
      create: {
        name: `CBHPM ${year}`,
        type: PricingTableType.CBHPM,
        year,
        code: `CBHPM-${year}`,
        description: `Tabela CBHPM ${year} sincronizada da base importada`,
        active: true,
      },
      update: {
        type: PricingTableType.CBHPM,
        code: `CBHPM-${year}`,
        description: `Tabela CBHPM ${year} sincronizada da base importada`,
        active: true,
      },
      select: { id: true, year: true },
    });

    tableByYear.set(year, table.id);
  }

  return tableByYear;
}

async function upsertProcedures(latestByCode, existingProcedureCodes) {
  let created = 0;
  let updated = 0;
  const entries = Array.from(latestByCode.entries());

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);

    await prisma.$transaction(
      batch.map(([code, record]) => {
        const priceCents = resolveProcedurePrice(record);

        return prisma.procedure.upsert({
          where: { code },
          create: {
            code,
            description: normalizeProcedureDescription(record.procedimento),
            type: ProcedureType.PROCEDURE,
            tableCode: 'CBHPM',
            groupName: buildProcedureGroup(record),
            unit: 'UN',
            referencePriceCents: priceCents,
            requiresAuthorization: false,
            requiresReport: false,
            billable: priceCents !== null,
            active: true,
            notes: buildProcedureNotes(record),
          },
          update: {
            description: normalizeProcedureDescription(record.procedimento),
            tableCode: 'CBHPM',
            groupName: buildProcedureGroup(record),
            unit: 'UN',
            referencePriceCents: priceCents,
            billable: priceCents !== null,
            active: true,
            notes: buildProcedureNotes(record),
          },
        });
      }),
    );

    for (const [code] of batch) {
      if (existingProcedureCodes.has(code)) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    console.log(`Procedimentos sincronizados: ${Math.min(index + batch.length, entries.length)}/${entries.length}`);
  }

  return { created, updated };
}

async function loadProceduresByCode(codes) {
  const procedures = await prisma.procedure.findMany({
    where: { code: { in: codes } },
    select: { code: true, id: true },
  });

  return new Map(procedures.map((procedure) => [procedure.code, procedure.id]));
}

async function upsertProcedurePrices(records, procedureByCode, pricingTableByYear) {
  let synced = 0;
  let skipped = 0;
  const priceOperations = [];

  for (const record of records) {
    const procedureId = procedureByCode.get(record.codigo);
    const pricingTableId = pricingTableByYear.get(record.editionYear);
    const priceCents = resolveProcedurePrice(record);

    if (!procedureId || !pricingTableId || priceCents === null) {
      skipped += 1;
      continue;
    }

    priceOperations.push(
      prisma.procedurePrice.upsert({
        where: {
          procedureId_pricingTableId: {
            procedureId,
            pricingTableId,
          },
        },
        create: {
          procedureId,
          pricingTableId,
          priceCents,
          operationalCostCents: record.adicionaisCents,
          billingUnit: buildBillingUnit(record),
          active: true,
          notes: buildPriceNotes(record),
        },
        update: {
          priceCents,
          operationalCostCents: record.adicionaisCents,
          billingUnit: buildBillingUnit(record),
          active: true,
          notes: buildPriceNotes(record),
        },
      }),
    );
  }

  for (let index = 0; index < priceOperations.length; index += batchSize) {
    const batch = priceOperations.slice(index, index + batchSize);
    await prisma.$transaction(batch);
    synced += batch.length;
    console.log(`Valores sincronizados: ${synced}/${priceOperations.length}`);
  }

  return { skipped, synced };
}

function resolveLatestProcedureByCode(records) {
  const latestByCode = new Map();

  for (const record of records) {
    const current = latestByCode.get(record.codigo);

    if (!current || record.editionYear >= current.editionYear) {
      latestByCode.set(record.codigo, record);
    }
  }

  return latestByCode;
}

function normalizeProcedureDescription(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function resolveProcedurePrice(record) {
  return (
    record.subtotalCents ??
    record.totalPorteCents ??
    record.valorPorteCents ??
    null
  );
}

function buildProcedureGroup(record) {
  return record.porte ? `PORTE ${record.porte}` : 'CBHPM SEM PORTE';
}

function buildBillingUnit(record) {
  const parts = [];

  if (record.porte) {
    parts.push(`Porte ${record.porte}`);
  }

  if (record.fracaoPorte) {
    parts.push(`Fracao ${record.fracaoPorte.toString()}`);
  }

  return parts.join(' | ') || 'CBHPM';
}

function buildProcedureNotes(record) {
  return [
    `Sincronizado da CBHPM ${record.editionYear}.`,
    `Descricao original: ${record.procedimento}.`,
    record.sourceFile ? `Arquivo: ${record.sourceFile}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildPriceNotes(record) {
  return [
    `Valor importado da CBHPM ${record.editionYear}.`,
    record.adicionaisCents
      ? `Inclui adicionais de ${formatCents(record.adicionaisCents)}.`
      : '',
    record.sourceFile ? `Arquivo: ${record.sourceFile}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function formatCents(value) {
  return `R$ ${(value / 100).toFixed(2)}`;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
