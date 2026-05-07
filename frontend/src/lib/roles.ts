import type { Role } from './types';

export type PermissionPreviewOption = {
  checked: boolean;
  description: string;
  label: string;
  value: string;
};

export const roleOptions: Role[] = [
  'ADMIN',
  'ATENDENTE',
  'MEDICO',
  'ENFERMEIRO',
  'FARMACIA',
  'ESTOQUE',
  'FATURAMENTO',
];

export const userParameterOptions: PermissionPreviewOption[] = [
  {
    value: 'unique_login',
    label: 'Login unico obrigatorio',
    description: 'Impede duplicidade de acesso e conflito entre usuarios.',
    checked: true,
  },
  {
    value: 'admin_only',
    label: 'Cadastro restrito ao administrador',
    description: 'Somente ADMIN cria ou libera novos acessos do sistema.',
    checked: true,
  },
  {
    value: 'sector_profile',
    label: 'Perfil separado por setor',
    description: 'A navegacao mostra apenas modulos relacionados ao cargo.',
    checked: true,
  },
  {
    value: 'audit_ready',
    label: 'Pronto para auditoria futura',
    description:
      'Base preparada para registrar permissoes granulares por acao.',
    checked: false,
  },
];

export function getRolePermissionOptions(role: Role): PermissionPreviewOption[] {
  return [
    {
      value: 'administrative_access',
      label: 'Acesso administrativo completo',
      description:
        'Libera usuarios, cadastros estruturais e todos os ambientes.',
      checked: role === 'ADMIN',
    },
    {
      value: 'front_desk_access',
      label: 'Recepcao, pacientes e agenda',
      description:
        'Permite localizar paciente, cadastrar passagem e operar agenda.',
      checked: hasRoleAccess(role, ['ATENDENTE']),
    },
    {
      value: 'medical_access',
      label: 'Consultorio e rotina medica',
      description:
        'Libera atendimento medico, pedidos, laudos e evolucao clinica.',
      checked: hasRoleAccess(role, ['MEDICO']),
    },
    {
      value: 'nursing_access',
      label: 'Enfermagem e triagem',
      description:
        'Permite sinais vitais, classificacao e apoio ao atendimento.',
      checked: hasRoleAccess(role, ['ENFERMEIRO']),
    },
    {
      value: 'pharmacy_stock_access',
      label: 'Farmacia e estoque',
      description: 'Libera dispensacao, produtos, lotes e medicamentos.',
      checked: hasRoleAccess(role, ['FARMACIA', 'ESTOQUE']),
    },
    {
      value: 'billing_access',
      label: 'Faturamento, guias e tabelas',
      description: 'Permite contas, NF, glosas, convenios e tabelas de preco.',
      checked: hasRoleAccess(role, ['FATURAMENTO']),
    },
    {
      value: 'cbhpm_reference_access',
      label: 'Consulta CBHPM e procedimentos',
      description: 'Permite consultar codigos, portes e valores de referencia.',
      checked: hasRoleAccess(role, [
        'ATENDENTE',
        'MEDICO',
        'ENFERMEIRO',
        'FATURAMENTO',
      ]),
    },
  ];
}

export function hasRoleAccess(role: Role, allowedRoles: Role[]) {
  return role === 'ADMIN' || allowedRoles.includes(role);
}

export function roleLabel(role: Role) {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'MEDICO':
      return 'Medico';
    case 'ENFERMEIRO':
      return 'Enfermagem';
    case 'FARMACIA':
      return 'Farmacia';
    case 'ESTOQUE':
      return 'Estoque';
    case 'FATURAMENTO':
      return 'Faturamento';
    default:
      return 'Atendente';
  }
}
