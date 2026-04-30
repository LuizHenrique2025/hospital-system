const fs = require('fs');
const path = require('path');

const outputPath = path.join(
  __dirname,
  '..',
  'docs',
  'guia-athena-dicom-estudante.pdf',
);

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const contentWidth = pageWidth - margin * 2;

const pages = [];

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7e]/g, (char) => {
      const map = {
        a: 'a',
        A: 'A',
        e: 'e',
        E: 'E',
        i: 'i',
        I: 'I',
        o: 'o',
        O: 'O',
        u: 'u',
        U: 'U',
        c: 'c',
        C: 'C',
      };

      return map[char.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? '';
    });
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;

    if (nextLine.length > maxChars && line) {
      lines.push(line);
      line = word;
      return;
    }

    line = nextLine;
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function createPage() {
  const commands = [];

  pages.push(commands);
  return {
    commands,
    y: pageHeight - margin,
  };
}

function addText(page, text, x, y, size = 11, font = 'F1', color = '0 0 0') {
  page.commands.push(
    'BT',
    `/${font} ${size} Tf`,
    `${color} rg`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${escapePdfText(text)}) Tj`,
    'ET',
  );
}

function addWrappedText(page, text, x, y, size = 11, maxChars = 75, lineGap = 16) {
  const lines = wrapText(text, maxChars);
  let cursorY = y;

  lines.forEach((line) => {
    addText(page, line, x, cursorY, size);
    cursorY -= lineGap;
  });

  return cursorY;
}

function addRule(page, y) {
  page.commands.push(
    '0.78 0.82 0.88 RG',
    '1 w',
    `${margin} ${y.toFixed(2)} m`,
    `${(pageWidth - margin).toFixed(2)} ${y.toFixed(2)} l`,
    'S',
  );
}

function addRoundedBox(page, x, y, width, height, fill = '0.96 0.97 0.98') {
  page.commands.push(
    `${fill} rg`,
    '0.78 0.82 0.88 RG',
    '1 w',
    `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`,
    'B',
  );
}

function addStep(page, number, title, body) {
  if (page.y < 150) {
    page = createPage();
    addHeader(page);
  }

  addRoundedBox(page, margin, page.y - 72, contentWidth, 64, '0.98 0.99 1');
  addText(page, String(number).padStart(2, '0'), margin + 14, page.y - 34, 18, 'F2', '0.06 0.33 0.31');
  addText(page, title, margin + 62, page.y - 28, 13, 'F2', '0.07 0.09 0.13');
  addWrappedText(page, body, margin + 62, page.y - 46, 10, 68, 13);
  page.y -= 84;

  return page;
}

function addHeader(page) {
  addText(page, 'Athena DICOM Expert', margin, pageHeight - 36, 10, 'F2', '0.06 0.33 0.31');
  addText(page, 'Guia rapido para estudantes', pageWidth - margin - 156, pageHeight - 36, 10, 'F1', '0.39 0.45 0.53');
  addRule(page, pageHeight - 48);
  page.y = pageHeight - 74;
}

function addScreenshotBlock(page, index, title, description) {
  if (page.y < 220) {
    page = createPage();
    addHeader(page);
  }

  addRoundedBox(page, margin, page.y - 134, contentWidth, 124, '0.94 0.96 0.98');
  addText(page, `Print ${index}`, margin + 18, page.y - 34, 16, 'F2', '0.06 0.33 0.31');
  addText(page, title, margin + 92, page.y - 31, 13, 'F2', '0.07 0.09 0.13');
  addWrappedText(page, description, margin + 92, page.y - 52, 10, 68, 13);
  addText(page, 'Referencia visual recebida na conversa.', margin + 92, page.y - 112, 9, 'F1', '0.39 0.45 0.53');
  page.y -= 148;

  return page;
}

let page = createPage();

addText(page, 'GUIA DE IMPORTACAO', margin, 760, 14, 'F2', '0.06 0.33 0.31');
addText(page, 'Athena DICOM Expert', margin, 724, 34, 'F2', '0.07 0.09 0.13');
addText(page, 'Fluxo para abrir exame PACS recebido pelo WhatsApp', margin, 696, 15, 'F1', '0.39 0.45 0.53');
addRule(page, 666);
addWrappedText(
  page,
  'Material de apoio para o aluno baixar o arquivo ZIP recebido, abrir o aplicativo Athena DICOM Expert, entrar com perfil de estudante, adicionar o paciente e abrir o exame importado.',
  margin,
  632,
  12,
  78,
  17,
);

addRoundedBox(page, margin, 438, contentWidth, 118, '0.94 0.98 0.97');
addText(page, 'Resumo do caminho', margin + 18, 522, 15, 'F2', '0.06 0.33 0.31');
addWrappedText(
  page,
  'WhatsApp > baixar TESTE PACS.zip > abrir Athena DICOM Expert > login como Estudante > Adic. Paciente > selecionar pasta baixada > abrir paciente com botao direito.',
  margin + 18,
  498,
  12,
  72,
  16,
);

addText(page, 'Passo a passo', margin, 386, 20, 'F2', '0.07 0.09 0.13');
page.y = 354;
page = addStep(page, 1, 'Baixar o arquivo do WhatsApp', 'No WhatsApp, clique no arquivo TESTE PACS.zip e aguarde o download terminar.');
page = addStep(page, 2, 'Abrir o aplicativo', 'No Windows, pesquise e abra o aplicativo Athena DICOM Expert.');
page = addStep(page, 3, 'Entrar como estudante', 'Faça o login usando o cargo ou perfil Estudante.');

page = createPage();
addHeader(page);
page = addStep(page, 4, 'Adicionar paciente', 'Com o sistema aberto, clique na aba Adic. Paciente no menu lateral esquerdo.');
page = addStep(page, 5, 'Selecionar o documento baixado', 'Na janela de selecao, entre em Downloads e selecione a pasta ou arquivo extraido do ZIP baixado.');
page = addStep(page, 6, 'Aguardar a importacao', 'Depois de selecionar a pasta, aguarde ate o paciente aparecer na lista de pacientes.');
page = addStep(page, 7, 'Abrir o paciente', 'Clique com o botao direito sobre o paciente importado e escolha a opcao Abrir Paciente.');

addText(page, 'Texto pronto para envio', margin, page.y - 8, 18, 'F2', '0.07 0.09 0.13');
page.y -= 38;
addRoundedBox(page, margin, page.y - 112, contentWidth, 104, '1 1 1');
addWrappedText(
  page,
  'Ao receber o arquivo pelo WhatsApp, baixe o ZIP. Em seguida, abra o aplicativo Athena DICOM Expert e faca login com o cargo Estudante. No app, acesse Adic. Paciente, selecione o documento baixado em Downloads e aguarde carregar. Depois que o paciente aparecer na lista, clique com o botao direito sobre ele e selecione Abrir Paciente.',
  margin + 16,
  page.y - 30,
  10,
  76,
  13,
);

page = createPage();
addHeader(page);
addText(page, 'Imagens usadas como referencia', margin, page.y, 20, 'F2', '0.07 0.09 0.13');
page.y -= 30;
page = addScreenshotBlock(page, 1, 'Arquivo recebido no WhatsApp', 'Mostra o arquivo TESTE PACS.zip, em formato ZIP, recebido na conversa do WhatsApp.');
page = addScreenshotBlock(page, 2, 'Aplicativo no Windows', 'Mostra o aplicativo Athena DICOM Expert aparecendo na busca/menu do Windows.');
page = addScreenshotBlock(page, 3, 'Tela inicial de pacientes', 'Mostra o Athena DICOM Expert aberto na tela Pacientes, com a opcao Adic. Paciente no menu lateral.');
page = addScreenshotBlock(page, 4, 'Selecao da pasta em Downloads', 'Mostra a janela Selecionar pasta dentro de Downloads, com a pasta do exame selecionada.');
page = addScreenshotBlock(page, 5, 'Abrir paciente importado', 'Mostra o paciente carregado na lista e o menu de contexto com a opcao Abrir Paciente.');

const objects = [];

function addObject(content) {
  objects.push(content);
  return objects.length;
}

const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
const pageObjectIds = [];

pages.forEach((commands) => {
  const stream = commands.join('\n');
  const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
  const pageId = addObject(
    `<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
  pageObjectIds.push(pageId);
});

const pagesId = addObject(
  `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`,
);
const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

const finalObjects = objects.map((object) =>
  object.replace(/PAGES_REF/g, String(pagesId)),
);

let pdf = '%PDF-1.4\n';
const offsets = [0];

finalObjects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
});

const xrefOffset = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${finalObjects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (let index = 1; index <= finalObjects.length; index += 1) {
  pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${finalObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, Buffer.from(pdf, 'latin1'));
console.log(outputPath);
