import type { Role } from '../lib/types';

export type EnvironmentId =
  | 'administrativo'
  | 'hospitalar'
  | 'pronto-atendimento'
  | 'consultorio'
  | 'farmacia'
  | 'faturamento';

export type NavigationEnvironment = {
  id: EnvironmentId;
  label: string;
  hint: string;
  symbol: string;
  toneClass: string;
  modulePaths: string[];
  roadmap: string[];
};

export type ModuleItem = {
  path: string;
  label: string;
  hint: string;
  roles?: Role[];
};

export type AdministrativeModuleGroup = {
  hint: string;
  label: string;
  paths: string[];
};

export const environmentStorageKey = 'hospital-system.environment';

export const activeModules: ModuleItem[] = [
  { path: '/central', label: 'Principal', hint: 'Comunicacao interna' },
  {
    path: '/cadastros',
    label: 'Cadastros',
    hint: 'Base operacional',
    roles: ['ADMIN', 'ATENDENTE'],
  },
  {
    path: '/convenios',
    label: 'Convênios',
    hint: 'Operadoras e contratos',
    roles: ['ADMIN', 'ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/configuracoes',
    label: 'Configuracoes',
    hint: 'Admin, permissoes e parametros',
    roles: ['ADMIN'],
  },
  {
    path: '/pacientes',
    label: 'Pacientes',
    hint: 'Cadastro e busca',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO', 'FATURAMENTO'],
  },
  {
    path: '/procedimentos',
    label: 'Procedimentos',
    hint: 'Tabelas e exames',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO', 'FATURAMENTO'],
  },
  {
    path: '/tabelas-precos',
    label: 'Tabela Proc.',
    hint: 'CBHPM e valores',
    roles: ['ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/orcamentos',
    label: 'Orcamentos',
    hint: 'Calculadora hospitalar',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO', 'FATURAMENTO'],
  },
  {
    path: '/cbhpm',
    label: 'CBHPM',
    hint: 'Importacoes e consulta',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO', 'FATURAMENTO'],
  },
  {
    path: '/agendamento',
    label: 'Agendamento',
    hint: 'Agenda e triagem',
    roles: ['ATENDENTE', 'ENFERMEIRO'],
  },
  {
    path: '/atender',
    label: 'Atender',
    hint: 'Atendimento eletivo',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pedidos-exames',
    label: 'Pedidos Exames',
    hint: 'Solicitacoes ambulatoriais',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/laudos',
    label: 'Laudos',
    hint: 'Resultados e modelos',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/recibo-nfse',
    label: 'Rec./NFS-e',
    hint: 'Recibos e notas',
    roles: ['ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/autorizacao',
    label: 'Autorizacao',
    hint: 'Senhas e liberacoes',
    roles: ['ATENDENTE', 'FATURAMENTO'],
  },
  {
    path: '/mapa-cirurgia',
    label: 'Mapa Cirurgia',
    hint: 'Salas e agenda cirurgica',
    roles: ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/leitos',
    label: 'Leitos',
    hint: 'Ocupacao e movimentacao',
    roles: ['ADMIN', 'ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pronto-atendimento',
    label: 'Pronto Atendimento',
    hint: 'Triagem e fila PA',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/pa-recepcao',
    label: 'Recepcao PA',
    hint: 'Abrir pronto atendimento',
    roles: ['ATENDENTE', 'ENFERMEIRO'],
  },
  {
    path: '/pa-enfermagem',
    label: 'Enfermagem PA',
    hint: 'Triagem e sinais',
    roles: ['ENFERMEIRO', 'MEDICO', 'ATENDENTE'],
  },
  {
    path: '/pa-dispensacao-medica',
    label: 'Disp. Medica',
    hint: 'Medicacao no PA',
    roles: ['MEDICO', 'ENFERMEIRO', 'FARMACIA'],
  },
  {
    path: '/pa-imagem',
    label: 'Imagem PA',
    hint: 'Exames de imagem',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/pa-exames-ambulatoriais',
    label: 'Exames Amb.',
    hint: 'Coletas e ambulatorio',
    roles: ['MEDICO', 'ENFERMEIRO', 'ATENDENTE'],
  },
  {
    path: '/consultorio',
    label: 'Consultorio',
    hint: 'Atendimento medico',
    roles: ['MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/equipe',
    label: 'Equipe',
    hint: 'Medicos e suporte',
    roles: ['ATENDENTE', 'MEDICO', 'ENFERMEIRO'],
  },
  {
    path: '/farmacia',
    label: 'Farmacia',
    hint: 'Dispensacao',
    roles: ['FARMACIA', 'ESTOQUE', 'ENFERMEIRO'],
  },
  {
    path: '/estoque-produtos',
    label: 'Produtos',
    hint: 'Cadastro de itens',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/estoque-lotes',
    label: 'Lotes',
    hint: 'Lotes e validade',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/medicamentos',
    label: 'Medicamentos',
    hint: 'Base medicamentosa',
    roles: ['FARMACIA', 'ESTOQUE'],
  },
  {
    path: '/faturamento',
    label: 'Faturamento',
    hint: 'Contas e notas',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/guias',
    label: 'Guias',
    hint: 'Controle de guias',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/contas',
    label: 'Contas',
    hint: 'Contas hospitalares',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/notas-fiscais',
    label: 'NF',
    hint: 'Notas fiscais',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/glosas',
    label: 'Glosas',
    hint: 'Recursos e perdas',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/importacao-xml',
    label: 'Importar XML',
    hint: 'Entrada de XML',
    roles: ['FATURAMENTO'],
  },
  {
    path: '/movimentacao-guias',
    label: 'Mov. Guias',
    hint: 'Movimentacao de guias',
    roles: ['FATURAMENTO'],
  },
];

export const administrativeModuleGroups: AdministrativeModuleGroup[] = [
  {
    label: 'Base administrativa',
    hint: 'Configuracao, usuarios e cadastros principais',
    paths: [
      '/central',
      '/cadastros',
      '/convenios',
      '/configuracoes',
      '/equipe',
      '/pacientes',
      '/procedimentos',
      '/tabelas-precos',
      '/orcamentos',
      '/cbhpm',
    ],
  },
  {
    label: 'Hospitalar',
    hint: 'Eletivos, agenda, exames, leitos e cirurgia',
    paths: [
      '/agendamento',
      '/atender',
      '/procedimentos',
      '/tabelas-precos',
      '/orcamentos',
      '/cbhpm',
      '/pedidos-exames',
      '/laudos',
      '/recibo-nfse',
      '/autorizacao',
      '/mapa-cirurgia',
      '/leitos',
    ],
  },
  {
    label: 'Pronto Atendimento',
    hint: 'Recepcao PA, triagem, exames e dispensacao',
    paths: [
      '/pa-recepcao',
      '/pronto-atendimento',
      '/pa-enfermagem',
      '/pa-dispensacao-medica',
      '/pa-imagem',
      '/pa-exames-ambulatoriais',
    ],
  },
  {
    label: 'Consultorio',
    hint: 'Atendimento medico',
    paths: ['/consultorio'],
  },
  {
    label: 'Farmacia e Estoque',
    hint: 'Dispensacao, produtos, lotes e medicamentos',
    paths: [
      '/farmacia',
      '/estoque-produtos',
      '/estoque-lotes',
      '/medicamentos',
    ],
  },
  {
    label: 'Faturamento',
    hint: 'Guias, contas, NF, glosas e XML',
    paths: [
      '/cbhpm',
      '/faturamento',
      '/guias',
      '/contas',
      '/notas-fiscais',
      '/glosas',
      '/importacao-xml',
      '/movimentacao-guias',
    ],
  },
];

export const navigationEnvironments: NavigationEnvironment[] = [
  {
    id: 'administrativo',
    label: 'Administrativo',
    hint: 'Visao completa de todos os ambientes e cadastros',
    symbol: 'AD',
    toneClass: 'env-admin',
    modulePaths: activeModules.map((moduleItem) => moduleItem.path),
    roadmap: ['Tudo visivel', 'Configuracoes', 'Cadastros', 'Auditoria'],
  },
  {
    id: 'hospitalar',
    label: 'Hospitalar',
    hint: 'Fluxos eletivos, agenda e rotina hospitalar',
    symbol: 'HP',
    toneClass: 'env-hospital',
    modulePaths: [
      '/central',
      '/agendamento',
      '/atender',
      '/orcamentos',
      '/pedidos-exames',
      '/laudos',
      '/recibo-nfse',
      '/autorizacao',
      '/mapa-cirurgia',
      '/leitos',
      '/pacientes',
    ],
    roadmap: ['Eletivos', 'Leitos', 'Cirurgias', 'Autorizacoes'],
  },
  {
    id: 'pronto-atendimento',
    label: 'Pronto Atendimento',
    hint: 'Recepcao propria, enfermagem, exames e dispensacao PA',
    symbol: 'PA',
    toneClass: 'env-pa',
    modulePaths: [
      '/central',
      '/pa-recepcao',
      '/pronto-atendimento',
      '/pa-enfermagem',
      '/pa-dispensacao-medica',
      '/pa-imagem',
      '/pa-exames-ambulatoriais',
    ],
    roadmap: ['Recepcao PA', 'Triagem', 'Imagem', 'Dispensacao'],
  },
  {
    id: 'consultorio',
    label: 'Consultorio',
    hint: 'Atendimento medico e rotina ambulatorial',
    symbol: 'CO',
    toneClass: 'env-office',
    modulePaths: ['/central', '/consultorio'],
    roadmap: ['Evolucao', 'Prescricao', 'Pedidos', 'Retornos'],
  },
  {
    id: 'farmacia',
    label: 'Farmacia / Estoque',
    hint: 'Dispensacao, produtos, lotes e medicamentos',
    symbol: 'FE',
    toneClass: 'env-pharmacy',
    modulePaths: [
      '/central',
      '/farmacia',
      '/estoque-produtos',
      '/estoque-lotes',
      '/medicamentos',
    ],
    roadmap: ['Dispensacao', 'Produtos', 'Lotes', 'Medicamentos'],
  },
  {
    id: 'faturamento',
    label: 'Faturamento',
    hint: 'Guias, contas, NF, glosas, XML e movimentacoes',
    symbol: 'FT',
    toneClass: 'env-billing',
    modulePaths: [
      '/central',
      '/procedimentos',
      '/tabelas-precos',
      '/orcamentos',
      '/cbhpm',
      '/convenios',
      '/faturamento',
      '/guias',
      '/contas',
      '/notas-fiscais',
      '/glosas',
      '/importacao-xml',
      '/movimentacao-guias',
    ],
    roadmap: ['Guias', 'Contas', 'Glosas', 'XML'],
  },
];

export function isEnvironmentId(value: string | null): value is EnvironmentId {
  return navigationEnvironments.some((environment) => environment.id === value);
}

export function getNavigationEnvironment(environmentId: EnvironmentId) {
  return (
    navigationEnvironments.find(
      (environment) => environment.id === environmentId,
    ) ?? navigationEnvironments[0]!
  );
}

export function matchModuleSearch(
  values: Array<string | undefined>,
  query: string,
) {
  if (!query) {
    return true;
  }

  return values.filter(Boolean).join(' ').toLowerCase().includes(query);
}

export function moduleInitials(label: string) {
  const normalized = label
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (normalized.length === 0) {
    return 'MD';
  }

  if (normalized.length === 1) {
    return normalized[0].slice(0, 2).toUpperCase();
  }

  return `${normalized[0][0]}${normalized[1][0]}`.toUpperCase();
}

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'US';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
