const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const { filePath, editionYear } = parseArguments(process.argv.slice(2));

  if (!filePath) {
    throw new Error(
      'Informe o CSV: npm run import:cbhpm -- "C:\\\\caminho\\\\cbhpm.csv"',
    );
  }

  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo nao encontrado: ${absolutePath}`);
  }

  const csvText = fs.readFileSync(absolutePath, 'utf8');
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error('CSV sem linhas para importar.');
  }

  const headers = rows[0].map(normalizeHeader);
  const columnIndex = resolveColumns(headers);
  const sourceFile = path.basename(absolutePath);
  const detectedEditionYear = editionYear ?? detectEditionYear(sourceFile);

  if (!detectedEditionYear) {
    throw new Error(
      'Nao foi possivel detectar o ano da edicao. Use --edition=2005, por exemplo.',
    );
  }

  const records = rows.slice(1).map((row, index) =>
    mapCsvRow(row, columnIndex, {
      editionYear: detectedEditionYear,
      lineNumber: index + 2,
      sourceFile,
    }),
  );
  const validRecords = records.filter(Boolean);

  if (validRecords.length === 0) {
    throw new Error('Nenhum registro valido encontrado no CSV.');
  }

  const { uniqueRecords, duplicateCount } = deduplicateRecords(validRecords);
  const existingCodes = new Set(
    (
      await prisma.cbhpmProcedure.findMany({
        where: {
          editionYear: detectedEditionYear,
          codigo: { in: uniqueRecords.map((record) => record.codigo) },
        },
        select: { codigo: true, editionYear: true },
      })
    ).map((record) => `${record.codigo}:${record.editionYear}`),
  );
  let created = 0;
  let updated = 0;

  for (const record of uniqueRecords) {
    await prisma.cbhpmProcedure.upsert({
      where: {
        codigo_editionYear: {
          codigo: record.codigo,
          editionYear: record.editionYear,
        },
      },
      create: record,
      update: {
        procedimento: record.procedimento,
        porte: record.porte,
        fracaoPorte: record.fracaoPorte,
        valorPorteCents: record.valorPorteCents,
        totalPorteCents: record.totalPorteCents,
        incidencias: record.incidencias,
        filme: record.filme,
        totalFilmeCents: record.totalFilmeCents,
        uco: record.uco,
        totalUcoCents: record.totalUcoCents,
        porteAnestesico: record.porteAnestesico,
        valorPorteAnestesicoCents: record.valorPorteAnestesicoCents,
        totalPorteAnestesicoCents: record.totalPorteAnestesicoCents,
        numeroAuxiliares: record.numeroAuxiliares,
        totalAuxiliaresCents: record.totalAuxiliaresCents,
        totalPrimeiroAuxiliarCents: record.totalPrimeiroAuxiliarCents,
        totalSegundoAuxiliarCents: record.totalSegundoAuxiliarCents,
        totalTerceiroAuxiliarCents: record.totalTerceiroAuxiliarCents,
        totalQuartoAuxiliarCents: record.totalQuartoAuxiliarCents,
        adicionaisCents: record.adicionaisCents,
        subtotalCents: record.subtotalCents,
        editionYear: record.editionYear,
        sourceFile: record.sourceFile,
        importedAt: new Date(),
      },
    });

    if (existingCodes.has(`${record.codigo}:${record.editionYear}`)) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(
    [
      'Importacao CBHPM finalizada.',
      `Arquivo: ${absolutePath}`,
      `Ano/edicao: ${detectedEditionYear ?? 'nao informado'}`,
      `Registros validos: ${validRecords.length}`,
      `Registros importados: ${uniqueRecords.length}`,
      `Criados: ${created}`,
      `Atualizados: ${updated}`,
      `Duplicados no CSV: ${duplicateCount}`,
      `Ignorados: ${records.length - validRecords.length}`,
    ].join('\n'),
  );
}

function parseArguments(args) {
  const parsed = {
    filePath: null,
    editionYear: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--edition=')) {
      parsed.editionYear = Number(arg.replace('--edition=', ''));
      continue;
    }

    if (!parsed.filePath) {
      parsed.filePath = arg;
    }
  }

  if (parsed.editionYear && Number.isNaN(parsed.editionYear)) {
    throw new Error('Valor invalido em --edition. Use algo como --edition=2005.');
  }

  return parsed;
}

function resolveColumns(headers) {
  return {
    codigo: findRequiredColumn(headers, ['codigo', 'code']),
    procedimento: findRequiredColumn(headers, ['procedimento', 'descricao']),
    porte: findOptionalColumn(headers, ['porte']),
    fracaoPorte: findPorteFractionColumn(headers),
    valorPorte: findRequiredColumn(headers, ['valor porte', 'valorporte']),
    totalPorte: findRequiredColumn(headers, ['total porte', 'totalporte']),
    incidencias: findOptionalColumn(headers, ['incidencias']),
    filme: findOptionalColumn(headers, ['filme']),
    totalFilme: findOptionalColumn(headers, ['total filme', 'totalfilme']),
    uco: findOptionalColumn(headers, ['uco']),
    totalUco: findOptionalColumn(headers, ['total uco', 'totaluco']),
    porteAnestesico: findOptionalColumn(headers, [
      'porte anestesico',
      'porte anestesico',
    ]),
    valorPorteAnestesico: findOptionalColumn(headers, [
      'valor porte anestesico',
      'valorporte anestesico',
    ]),
    totalPorteAnestesico: findOptionalColumn(headers, [
      'total porte anestesico',
      'totalporte anestesico',
    ]),
    numeroAuxiliares: findAuxiliaryNumberColumn(headers),
    totalAuxiliares: findOptionalColumn(headers, [
      'total auxiliares',
      'totalauxiliares',
    ]),
    totalPrimeiroAuxiliar: findAuxiliaryTotalColumn(headers, '1'),
    totalSegundoAuxiliar: findAuxiliaryTotalColumn(headers, '2'),
    totalTerceiroAuxiliar: findAuxiliaryTotalColumn(headers, '3'),
    totalQuartoAuxiliar: findAuxiliaryTotalColumn(headers, '4'),
    subtotal: findOptionalColumn(headers, ['subtotal']),
  };
}

function findRequiredColumn(headers, aliases) {
  const index = findOptionalColumn(headers, aliases);

  if (index === -1) {
    throw new Error(`Coluna obrigatoria nao encontrada: ${aliases.join(' ou ')}`);
  }

  return index;
}

function findOptionalColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

function findPorteFractionColumn(headers) {
  const directMatch = findOptionalColumn(headers, [
    'fracao porte',
    'fracao port',
    'fracaoporte',
  ]);

  if (directMatch !== -1) {
    return directMatch;
  }

  return headers.findIndex(
    (header) => header.startsWith('fra') && header.includes('porte'),
  );
}

function findAuxiliaryNumberColumn(headers) {
  const directMatch = findOptionalColumn(headers, [
    'numero de auxiliares',
    'numero auxiliares',
  ]);

  if (directMatch !== -1) {
    return directMatch;
  }

  return headers.findIndex(
    (header) => header.startsWith('n') && header.includes('auxiliares'),
  );
}

function findAuxiliaryTotalColumn(headers, ordinal) {
  return headers.findIndex(
    (header) =>
      header.includes('total') &&
      header.includes(ordinal) &&
      header.includes('auxiliar'),
  );
}

function mapCsvRow(row, columnIndex, metadata) {
  const codigo = normalizeCodigo(row[columnIndex.codigo]);
  const procedimento = cleanCell(row[columnIndex.procedimento]);

  if (!codigo || !procedimento) {
    return null;
  }

  const totalPorteCents = parseMoneyToCents(row[columnIndex.totalPorte]);
  const totalFilmeCents = parseMoneyToCents(getOptionalCell(row, columnIndex.totalFilme));
  const totalUcoCents = parseMoneyToCents(getOptionalCell(row, columnIndex.totalUco));
  const totalPorteAnestesicoCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalPorteAnestesico),
  );
  const totalAuxiliaresCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalAuxiliares),
  );
  const totalPrimeiroAuxiliarCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalPrimeiroAuxiliar),
  );
  const totalSegundoAuxiliarCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalSegundoAuxiliar),
  );
  const totalTerceiroAuxiliarCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalTerceiroAuxiliar),
  );
  const totalQuartoAuxiliarCents = parseMoneyToCents(
    getOptionalCell(row, columnIndex.totalQuartoAuxiliar),
  );
  const subtotalCents = parseMoneyToCents(getOptionalCell(row, columnIndex.subtotal));

  return {
    codigo,
    procedimento,
    porte: cleanCell(row[columnIndex.porte]) || null,
    fracaoPorte:
      columnIndex.fracaoPorte === -1
        ? null
        : parseDecimalToString(row[columnIndex.fracaoPorte]),
    valorPorteCents: parseMoneyToCents(row[columnIndex.valorPorte]),
    totalPorteCents,
    incidencias: normalizeOptionalText(getOptionalCell(row, columnIndex.incidencias)),
    filme: parseDecimalToString(getOptionalCell(row, columnIndex.filme)),
    totalFilmeCents,
    uco: parseDecimalToString(getOptionalCell(row, columnIndex.uco)),
    totalUcoCents,
    porteAnestesico: normalizeOptionalText(
      getOptionalCell(row, columnIndex.porteAnestesico),
    ),
    valorPorteAnestesicoCents: parseMoneyToCents(
      getOptionalCell(row, columnIndex.valorPorteAnestesico),
    ),
    totalPorteAnestesicoCents,
    numeroAuxiliares: parseInteger(getOptionalCell(row, columnIndex.numeroAuxiliares)),
    totalAuxiliaresCents,
    totalPrimeiroAuxiliarCents,
    totalSegundoAuxiliarCents,
    totalTerceiroAuxiliarCents,
    totalQuartoAuxiliarCents,
    adicionaisCents: calculateAdditionalCents({
      subtotalCents,
      totalAuxiliaresCents,
      totalFilmeCents,
      totalPorteAnestesicoCents,
      totalPorteCents,
      totalUcoCents,
    }),
    subtotalCents,
    editionYear: metadata.editionYear,
    sourceFile: metadata.sourceFile,
    importedAt: new Date(),
  };
}

function deduplicateRecords(records) {
  const registry = new Map();
  let duplicateCount = 0;

  for (const record of records) {
    const key = `${record.codigo}:${record.editionYear}`;

    if (registry.has(key)) {
      duplicateCount += 1;
    }

    registry.set(key, record);
  }

  return {
    duplicateCount,
    uniqueRecords: Array.from(registry.values()),
  };
}

function normalizeCodigo(value) {
  return cleanCell(value).replace(/\D/g, '');
}

function getOptionalCell(row, index) {
  return index === -1 ? '' : row[index];
}

function normalizeOptionalText(value) {
  const text = cleanCell(value);

  if (!text || text === '-') {
    return null;
  }

  return text;
}

function cleanCell(value) {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function parseInteger(value) {
  const cleanValue = cleanCell(value).replace(/\D/g, '');

  if (!cleanValue) {
    return null;
  }

  const parsedValue = Number(cleanValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function calculateAdditionalCents({
  subtotalCents,
  totalAuxiliaresCents,
  totalFilmeCents,
  totalPorteAnestesicoCents,
  totalPorteCents,
  totalUcoCents,
}) {
  if (
    typeof subtotalCents === 'number' &&
    typeof totalPorteCents === 'number'
  ) {
    return subtotalCents - totalPorteCents;
  }

  const extras = [
    totalFilmeCents,
    totalUcoCents,
    totalPorteAnestesicoCents,
    totalAuxiliaresCents,
  ].filter((value) => typeof value === 'number');

  if (extras.length === 0) {
    return null;
  }

  return extras.reduce((total, value) => total + value, 0);
}

function parseMoneyToCents(value) {
  const cleanValue = cleanCell(value);

  if (!cleanValue || cleanValue === '-') {
    return null;
  }

  const normalized = cleanValue
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!normalized || normalized === '-') {
    return null;
  }

  const decimalValue = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const isNegative = decimalValue.startsWith('-');
  const unsignedValue = decimalValue.replace('-', '');
  const [integerPart, decimalPart = ''] = unsignedValue.split('.');
  const cents =
    Number(integerPart || '0') * 100 +
    Number(decimalPart.padEnd(2, '0').slice(0, 2));

  if (Number.isNaN(cents)) {
    return null;
  }

  return isNegative ? cents * -1 : cents;
}

function parseDecimalToString(value) {
  const cleanValue = cleanCell(value);

  if (!cleanValue || cleanValue === '-') {
    return null;
  }

  const normalized = cleanValue
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!normalized || normalized === '-') {
    return null;
  }

  const decimalValue = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const parsedValue = Number(decimalValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue.toFixed(4);
}

function detectEditionYear(fileName) {
  const years = fileName.match(/\b(19|20)\d{2}\b/g);

  if (!years || years.length === 0) {
    return null;
  }

  return Number(years[years.length - 1]);
}

function normalizeHeader(value) {
  return cleanCell(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let isInsideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (isInsideQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        isInsideQuotes = !isInsideQuotes;
      }
      continue;
    }

    if (char === ',' && !isInsideQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !isInsideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(cell);
      pushRow(rows, row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  pushRow(rows, row);

  return rows;
}

function pushRow(rows, row) {
  if (row.some((cell) => cleanCell(cell).length > 0)) {
    rows.push(row);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
