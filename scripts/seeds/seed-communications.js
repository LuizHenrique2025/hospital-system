const { CommunicationType, PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const communicationEntries = [
  {
    type: CommunicationType.UPDATE,
    tag: 'Sistema',
    title: 'Aba Principal liberada para todos',
    description:
      'Tela inicial dedicada a comunicados, datas, avisos e emails internos.',
  },
  {
    type: CommunicationType.UPDATE,
    tag: 'Operacao',
    title: 'Fluxo de perfis em validacao',
    description:
      'Cada usuario acessa os modulos de acordo com o cargo cadastrado.',
  },
  {
    type: CommunicationType.UPDATE,
    tag: 'Proximo passo',
    title: 'Comunicacao interna conectada ao banco',
    description:
      'A estrutura visual ja esta pronta para receber mensagens reais depois.',
  },
  {
    type: CommunicationType.NOTICE,
    title: 'Reuniao de alinhamento',
    description:
      'Direcao e coordenadores revisam pendencias da semana as 15h.',
  },
  {
    type: CommunicationType.NOTICE,
    title: 'Manutencao preventiva',
    description:
      'TI fara verificacao dos terminais da recepcao no fim do expediente.',
  },
  {
    type: CommunicationType.NOTICE,
    title: 'Conferencia de estoque',
    description:
      'Farmacia e estoque devem revisar itens criticos antes do fechamento.',
  },
  {
    type: CommunicationType.HOLIDAY,
    title: 'Dia do Trabalhador',
    description: 'Feriado nacional. Conferir escala de plantao.',
    dateLabel: '01/05',
  },
  {
    type: CommunicationType.HOLIDAY,
    title: 'Dia da Enfermagem',
    description: 'Data de reconhecimento da equipe assistencial.',
    dateLabel: '12/05',
  },
  {
    type: CommunicationType.HOLIDAY,
    title: 'Dia do Hospital',
    description: 'Marco para comunicados institucionais e campanhas internas.',
    dateLabel: '02/07',
  },
];

const internalEmails = [
  {
    sender: 'Diretoria',
    subject: 'Comunicado geral da semana',
    preview: 'Resumo dos alinhamentos e prioridades dos setores.',
    timeLabel: '08:20',
    unread: true,
  },
  {
    sender: 'Farmacia',
    subject: 'Itens em atencao',
    preview: 'Lista inicial para conferencia de dispensacao e reposicao.',
    timeLabel: '09:05',
    unread: true,
  },
  {
    sender: 'Recepcao',
    subject: 'Agenda do dia',
    preview: 'Observacoes sobre fluxo de pacientes e encaixes.',
    timeLabel: '10:10',
    unread: false,
  },
  {
    sender: 'TI Hospitalar',
    subject: 'Ambiente de testes',
    preview: 'Sistema local validado para novas telas e modulos.',
    timeLabel: '11:00',
    unread: false,
  },
];

async function main() {
  for (const entry of communicationEntries) {
    await prisma.communicationEntry.upsert({
      where: {
        type_title: {
          type: entry.type,
          title: entry.title,
        },
      },
      update: entry,
      create: entry,
    });
  }

  for (const email of internalEmails) {
    await prisma.internalEmail.upsert({
      where: {
        sender_subject: {
          sender: email.sender,
          subject: email.subject,
        },
      },
      update: email,
      create: email,
    });
  }

  console.log('Comunicacao interna sincronizada.');
  console.log(`- Comunicados: ${communicationEntries.length}`);
  console.log(`- Emails: ${internalEmails.length}`);
}

main()
  .catch((error) => {
    console.error('Falha ao sincronizar comunicacao interna.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
