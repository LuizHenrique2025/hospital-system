import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { OperationalModal } from '../components/ui/OperationalModal';
import type { Appointment } from '../lib/types';

export type BillingWorkspaceView =
  | 'overview'
  | 'guides'
  | 'accounts'
  | 'invoices'
  | 'denials'
  | 'xml'
  | 'movements';

type BillingWorkspacePageProps = {
  appointments: Appointment[];
  patientTotal: number;
  view?: BillingWorkspaceView;
};

type BillingDenial = {
  id: string;
  guide: string;
  provider: string;
  patient: string;
  reason: string;
  valueCents: number;
  status: string;
  deadline: string;
  owner: string;
  risk: 'Alto' | 'Medio' | 'Baixo';
  nextAction: string;
};

const billingNavigation: Array<{
  label: string;
  path: string;
  view: BillingWorkspaceView;
}> = [
  { label: 'Painel', path: '/faturamento', view: 'overview' },
  { label: 'Guias', path: '/guias', view: 'guides' },
  { label: 'Contas', path: '/contas', view: 'accounts' },
  { label: 'NF', path: '/notas-fiscais', view: 'invoices' },
  { label: 'Glosas', path: '/glosas', view: 'denials' },
  { label: 'XML', path: '/importacao-xml', view: 'xml' },
  { label: 'Mov. Guias', path: '/movimentacao-guias', view: 'movements' },
];

const billingViewCopy: Record<
  BillingWorkspaceView,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: 'Faturamento hospitalar',
    title: 'Central de receita e risco',
    description:
      'Visao executiva de contas, guias, notas, XML e glosas para acelerar fechamento e reduzir perda financeira.',
  },
  guides: {
    eyebrow: 'Controle de guias',
    title: 'Guias por convenio e atendimento',
    description:
      'Acompanhe criacao, envio, retorno e pendencias antes de fechar a conta.',
  },
  accounts: {
    eyebrow: 'Contas hospitalares',
    title: 'Conferencia e fechamento de contas',
    description:
      'Localize atendimentos realizados para conferir itens, valores, convenio e documentacao.',
  },
  invoices: {
    eyebrow: 'Notas fiscais',
    title: 'Fila fiscal e recibos',
    description:
      'Organize documentos prontos para emissao, rejeicoes e pendencias de cadastro fiscal.',
  },
  denials: {
    eyebrow: 'Gestao de glosas',
    title: 'Glosas, recursos e perdas',
    description:
      'Priorize glosas por risco, prazo, convenio e valor para proteger a receita hospitalar.',
  },
  xml: {
    eyebrow: 'Importacao XML',
    title: 'Conferencia de XML e nota',
    description:
      'Monitore arquivos recebidos, divergencias fiscais e vinculo com contas hospitalares.',
  },
  movements: {
    eyebrow: 'Movimentacao de guias',
    title: 'Historico e rastreabilidade',
    description:
      'Veja cada etapa da guia desde abertura, envio e retorno ate recurso ou fechamento.',
  },
};

const denialRecords: BillingDenial[] = [
  {
    id: 'GLO-2026-0184',
    guide: 'HDR-351909',
    provider: 'SC SAUDE',
    patient: 'Ingrid Alves Pereira',
    reason: 'Divergencia entre porte CBHPM e procedimento autorizado.',
    valueCents: 184320,
    status: 'Em recurso',
    deadline: 'Hoje, 16:00',
    owner: 'Faturamento',
    risk: 'Alto',
    nextAction: 'Anexar justificativa medica e memoria de calculo CBHPM.',
  },
  {
    id: 'GLO-2026-0172',
    guide: 'PRD-351953',
    provider: 'UNIMED',
    patient: 'Jessica Daiane da Silva Goncalves',
    reason: 'Item sem autorizacao vinculada na guia principal.',
    valueCents: 92750,
    status: 'Aguardando documento',
    deadline: '1 dia util',
    owner: 'Recepcao / Faturamento',
    risk: 'Medio',
    nextAction: 'Solicitar senha complementar e reenviar conta revisada.',
  },
  {
    id: 'GLO-2026-0168',
    guide: 'AMB-351925',
    provider: 'BRADESCO SAUDE',
    patient: 'Antilton Subtil de Oliveira',
    reason: 'Taxa operacional recusada por regra contratual.',
    valueCents: 38490,
    status: 'Analise interna',
    deadline: '3 dias uteis',
    owner: 'Auditoria de contas',
    risk: 'Baixo',
    nextAction: 'Validar contrato e decidir recurso ou baixa operacional.',
  },
];

const guideMovements = [
  {
    guide: 'HDR-351909',
    provider: 'SC SAUDE',
    patient: 'Ingrid Alves Pereira',
    stage: 'Retorno com glosa',
    updatedAt: '30/04/2026 08:41',
  },
  {
    guide: 'PRD-351953',
    provider: 'SC SAUDE',
    patient: 'Jessica Daiane da Silva Goncalves',
    stage: 'Conta em conferencia',
    updatedAt: '30/04/2026 08:31',
  },
  {
    guide: 'AMB-351925',
    provider: 'UNIMED',
    patient: 'Antilton Subtil de Oliveira',
    stage: 'Aguardando envio',
    updatedAt: '30/04/2026 08:06',
  },
];

const invoiceQueue = [
  {
    document: 'NF-000184',
    account: 'CTA-351909',
    provider: 'SC SAUDE',
    status: 'Pendente conferencia',
    valueCents: 284760,
  },
  {
    document: 'REC-000912',
    account: 'CTA-351953',
    provider: 'PARTICULAR',
    status: 'Pronto para emissao',
    valueCents: 45500,
  },
  {
    document: 'NF-000185',
    account: 'CTA-351925',
    provider: 'UNIMED',
    status: 'Aguardando XML',
    valueCents: 127940,
  },
];

const xmlImports = [
  {
    file: 'lote_sc_saude_30042026.xml',
    status: 'Com divergencia',
    linkedAccounts: 18,
    issues: 3,
  },
  {
    file: 'unimed_retorno_abril.xml',
    status: 'Importado',
    linkedAccounts: 24,
    issues: 0,
  },
  {
    file: 'bradesco_material_med.xml',
    status: 'Em validacao',
    linkedAccounts: 9,
    issues: 1,
  },
];

export function BillingWorkspacePage({
  appointments,
  patientTotal,
  view = 'overview',
}: BillingWorkspacePageProps) {
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDenial, setSelectedDenial] = useState<BillingDenial | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearch = search.trim().length >= 2;
  const viewCopy = billingViewCopy[view];
  const billableSource = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => appointment.status === 'REALIZADA')
        .sort(sortByAppointmentDate),
    [appointments],
  );
  const billableAppointments = hasSearched
    ? billableSource.filter((appointment) =>
        matchAppointment(appointment, deferredSearch),
      )
    : [];
  const openAccounts = appointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const cancelledOrMissing = appointments.filter((appointment) =>
    ['CANCELADA', 'NAO_COMPARECEU'].includes(appointment.status),
  ).length;
  const expectedRevenueCents = billableSource.length * 18500;
  const denialRiskCents = denialRecords.reduce(
    (total, denial) => total + denial.valueCents,
    0,
  );

  function searchBilling(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearch) {
      setHasSearched(true);
    }
  }

  function clearBillingSearch() {
    setSearch('');
    setHasSearched(false);
  }

  return (
    <>
      <section className="billing-hero panel">
        <div className="billing-hero-copy">
          <p className="eyebrow">{viewCopy.eyebrow}</p>
          <h2>{viewCopy.title}</h2>
          <p>{viewCopy.description}</p>
        </div>

        <div className="billing-hero-actions">
          <span className="inline-badge">Competencia Abril/2026</span>
          <strong>{formatCurrencyFromCents(expectedRevenueCents)}</strong>
          <small>previsao tecnica baseada em contas realizadas</small>
        </div>
      </section>

      <nav className="billing-tabs" aria-label="Navegacao do faturamento">
        {billingNavigation.map((item) => (
          <NavLink
            className={({ isActive }) =>
              isActive || item.view === view ? 'is-active' : undefined
            }
            key={item.path}
            to={item.path}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <section className="billing-metric-grid">
        <BillingMetric
          label="Contas faturaveis"
          value={billableSource.length}
          description="atendimentos realizados"
        />
        <BillingMetric
          label="Contas abertas"
          value={openAccounts}
          description="aguardando fechamento"
        />
        <BillingMetric
          label="Risco em glosas"
          value={formatCurrencyFromCents(denialRiskCents)}
          description={`${denialRecords.length} recursos em acompanhamento`}
          tone="risk"
        />
        <BillingMetric
          label="Excecoes"
          value={cancelledOrMissing}
          description="cancelados ou ausentes"
        />
        <BillingMetric
          label="Base pacientes"
          value={patientTotal}
          description="origem dos cadastros"
        />
      </section>

      <section className="billing-workspace-grid">
        <article className="panel billing-main-panel">
          <BillingSearchPanel
            canSearch={canSearch}
            hasSearched={hasSearched}
            onClear={clearBillingSearch}
            onSearch={searchBilling}
            resultCount={billableAppointments.length}
            search={search}
            setSearch={setSearch}
            view={view}
          />

          {view === 'overview' ? (
            <BillingOverview
              billableAppointments={billableAppointments}
              hasSearched={hasSearched}
              onOpenDenial={setSelectedDenial}
            />
          ) : null}

          {view === 'guides' ? <GuidesPanel /> : null}
          {view === 'accounts' ? (
            <AccountsPanel
              billableAppointments={billableAppointments}
              hasSearched={hasSearched}
            />
          ) : null}
          {view === 'invoices' ? <InvoicesPanel /> : null}
          {view === 'denials' ? (
            <DenialsPanel onOpenDenial={setSelectedDenial} />
          ) : null}
          {view === 'xml' ? <XmlPanel /> : null}
          {view === 'movements' ? <GuideMovementsPanel /> : null}
        </article>

        <aside className="billing-side-stack">
          <article className="panel billing-denial-radar">
            <div className="page-header">
              <div>
                <p className="eyebrow">Glosas criticas</p>
                <h2>Radar de perda</h2>
              </div>
              <span className="inline-badge">prioridade alta</span>
            </div>

            <div className="billing-radar-list">
              {denialRecords.map((denial) => (
                <button
                  className="billing-radar-card"
                  key={denial.id}
                  onClick={() => setSelectedDenial(denial)}
                  type="button"
                >
                  <span className={`billing-risk-dot ${riskClass(denial.risk)}`} />
                  <div>
                    <strong>{denial.provider}</strong>
                    <small>{denial.reason}</small>
                  </div>
                  <b>{formatCurrencyFromCents(denial.valueCents)}</b>
                </button>
              ))}
            </div>
          </article>

          <article className="panel billing-checklist">
            <p className="eyebrow">Fechamento seguro</p>
            <h2>Checklist operacional</h2>
            <ul>
              <li>Guia vinculada ao atendimento e convenio.</li>
              <li>Procedimentos conferidos com tabela vigente.</li>
              <li>Materiais, medicamentos e taxas conciliados.</li>
              <li>Glosas com prazo, responsavel e recurso rastreado.</li>
            </ul>
          </article>
        </aside>
      </section>

      <OperationalModal
        eyebrow="Analise de glosa"
        isOpen={Boolean(selectedDenial)}
        onClose={() => setSelectedDenial(null)}
        size="wide"
        title={selectedDenial?.id ?? 'Glosa'}
        toneLabel={selectedDenial?.status}
      >
        {selectedDenial ? (
          <div className="billing-denial-modal">
            <div className="billing-denial-summary">
              <Detail label="Convenio" value={selectedDenial.provider} />
              <Detail label="Guia" value={selectedDenial.guide} />
              <Detail label="Paciente" value={selectedDenial.patient} />
              <Detail
                label="Valor em risco"
                value={formatCurrencyFromCents(selectedDenial.valueCents)}
              />
            </div>

            <div className="billing-modal-section">
              <span>Motivo informado</span>
              <p>{selectedDenial.reason}</p>
            </div>

            <div className="billing-modal-section">
              <span>Proxima acao sugerida</span>
              <p>{selectedDenial.nextAction}</p>
            </div>

            <div className="billing-denial-summary">
              <Detail label="Responsavel" value={selectedDenial.owner} />
              <Detail label="Prazo" value={selectedDenial.deadline} />
              <Detail label="Risco" value={selectedDenial.risk} />
              <Detail label="Status" value={selectedDenial.status} />
            </div>
          </div>
        ) : null}
      </OperationalModal>
    </>
  );
}

function BillingMetric({
  description,
  label,
  tone,
  value,
}: {
  description: string;
  label: string;
  tone?: 'risk';
  value: number | string;
}) {
  return (
    <article className={tone === 'risk' ? 'billing-metric risk' : 'billing-metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function BillingSearchPanel({
  canSearch,
  hasSearched,
  onClear,
  onSearch,
  resultCount,
  search,
  setSearch,
  view,
}: {
  canSearch: boolean;
  hasSearched: boolean;
  onClear: () => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  resultCount: number;
  search: string;
  setSearch: (value: string) => void;
  view: BillingWorkspaceView;
}) {
  const title =
    view === 'denials'
      ? 'Busque por guia, convenio, paciente ou motivo da glosa.'
      : 'Localize antes de abrir conta, guia ou documento fiscal.';

  return (
    <form className="billing-search-panel" onSubmit={onSearch}>
      <div>
        <p className="eyebrow">Consulta parametrizada</p>
        <h3>{title}</h3>
        <small>
          A busca evita carregar grandes volumes e ajuda a auditar cada abertura
          de conta.
        </small>
      </div>

      <div className="billing-search-control">
        <svg viewBox="0 0 30 30" aria-hidden="true">
          <path d="M13 3C7.489 3 3 7.489 3 13s4.489 10 10 10a9.95 9.95 0 0 0 6.322-2.264l5.971 5.971a1 1 0 1 0 1.414-1.414l-5.97-5.97A9.95 9.95 0 0 0 23 13c0-5.511-4.489-10-10-10m0 2c4.43 0 8 3.57 8 8s-3.57 8-8 8-8-3.57-8-8 3.57-8 8-8" />
        </svg>
        <input
          placeholder="Paciente, guia, convenio, medico ou status"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button disabled={!canSearch} type="submit">
          Buscar
        </button>
        <button className="ghost-button" onClick={onClear} type="button">
          Limpar
        </button>
      </div>

      {hasSearched ? (
        <span className="billing-search-result">
          {resultCount} registro(s) encontrados
        </span>
      ) : null}
    </form>
  );
}

function BillingOverview({
  billableAppointments,
  hasSearched,
  onOpenDenial,
}: {
  billableAppointments: Appointment[];
  hasSearched: boolean;
  onOpenDenial: (denial: BillingDenial) => void;
}) {
  return (
    <div className="billing-overview-grid">
      <section className="billing-stage-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Esteira operacional</p>
            <h2>Da conta ao recebimento</h2>
          </div>
        </div>

        <div className="billing-stage-flow">
          {[
            ['01', 'Atendimento realizado', 'origem assistencial validada'],
            ['02', 'Conta conferida', 'procedimentos, taxas e materiais'],
            ['03', 'Guia enviada', 'lote por convenio e competencia'],
            ['04', 'Retorno tratado', 'pagamento, glosa ou recurso'],
          ].map(([code, title, description]) => (
            <article key={code}>
              <span>{code}</span>
              <strong>{title}</strong>
              <small>{description}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-critical-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Prioridade</p>
            <h2>Glosas que merecem acao hoje</h2>
          </div>
        </div>

        <div className="billing-denial-list">
          {denialRecords.slice(0, 2).map((denial) => (
            <button
              className="billing-denial-row"
              key={denial.id}
              onClick={() => onOpenDenial(denial)}
              type="button"
            >
              <div>
                <strong>{denial.provider}</strong>
                <span>{denial.reason}</span>
              </div>
              <b>{formatCurrencyFromCents(denial.valueCents)}</b>
            </button>
          ))}
        </div>
      </section>

      <AccountsPanel
        billableAppointments={billableAppointments}
        hasSearched={hasSearched}
      />
    </div>
  );
}

function AccountsPanel({
  billableAppointments,
  hasSearched,
}: {
  billableAppointments: Appointment[];
  hasSearched: boolean;
}) {
  return (
    <section className="billing-table-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Contas</p>
          <h2>Atendimentos prontos para cobranca</h2>
        </div>
        <span className="inline-badge">busca obrigatoria</span>
      </div>

      <div className="billing-table">
        <div className="billing-table-head billing-account-grid">
          <span>Paciente</span>
          <span>Medico</span>
          <span>Atendimento</span>
          <span>Status</span>
          <span>Tipo</span>
        </div>

        {!hasSearched ? (
          <BillingEmptyState
            code="01"
            title="Nenhuma conta carregada automaticamente."
            description="Use a busca parametrizada para abrir somente a conta desejada."
          />
        ) : billableAppointments.length === 0 ? (
          <p className="empty-state">
            Nenhuma conta faturavel encontrada para o filtro informado.
          </p>
        ) : (
          billableAppointments.map((appointment) => (
            <div
              className="billing-table-row billing-account-grid"
              key={appointment.id}
            >
              <span>{appointment.patient.name}</span>
              <span>{appointment.doctor.user.name}</span>
              <span>{formatDateTime(appointment.appointmentDate)}</span>
              <span>{humanizeEnum(appointment.status)}</span>
              <span>{humanizeEnum(appointment.type)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function GuidesPanel() {
  return (
    <section className="billing-table-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Guias</p>
          <h2>Controle por convenio</h2>
        </div>
      </div>

      <div className="billing-table">
        <div className="billing-table-head billing-guide-grid">
          <span>Guia</span>
          <span>Convenio</span>
          <span>Paciente</span>
          <span>Status</span>
          <span>Atualizacao</span>
        </div>
        {guideMovements.map((guide) => (
          <div className="billing-table-row billing-guide-grid" key={guide.guide}>
            <span>{guide.guide}</span>
            <span>{guide.provider}</span>
            <span>{guide.patient}</span>
            <span>{guide.stage}</span>
            <span>{guide.updatedAt}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InvoicesPanel() {
  return (
    <section className="billing-table-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Fiscal</p>
          <h2>Notas e recibos</h2>
        </div>
      </div>

      <div className="billing-card-grid">
        {invoiceQueue.map((invoice) => (
          <article className="billing-document-card" key={invoice.document}>
            <span>{invoice.document}</span>
            <strong>{formatCurrencyFromCents(invoice.valueCents)}</strong>
            <p>{invoice.account}</p>
            <small>
              {invoice.provider} - {invoice.status}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function DenialsPanel({
  onOpenDenial,
}: {
  onOpenDenial: (denial: BillingDenial) => void;
}) {
  return (
    <section className="billing-table-panel billing-denials-focus">
      <div className="page-header">
        <div>
          <p className="eyebrow">Glosas</p>
          <h2>Recursos em acompanhamento</h2>
        </div>
        <span className="inline-badge">financeiro sensivel</span>
      </div>

      <div className="billing-denial-list expanded">
        {denialRecords.map((denial) => (
          <button
            className="billing-denial-row"
            key={denial.id}
            onClick={() => onOpenDenial(denial)}
            type="button"
          >
            <div>
              <strong>
                {denial.id} - {denial.provider}
              </strong>
              <span>{denial.reason}</span>
              <small>
                {denial.patient} | {denial.guide} | prazo {denial.deadline}
              </small>
            </div>
            <b>{formatCurrencyFromCents(denial.valueCents)}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function XmlPanel() {
  return (
    <section className="billing-table-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">XML</p>
          <h2>Arquivos importados</h2>
        </div>
      </div>

      <div className="billing-card-grid">
        {xmlImports.map((item) => (
          <article className="billing-document-card" key={item.file}>
            <span>{item.file}</span>
            <strong>{item.status}</strong>
            <p>{item.linkedAccounts} contas vinculadas</p>
            <small>{item.issues} divergencia(s) encontradas</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideMovementsPanel() {
  return (
    <section className="billing-table-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Movimentacao</p>
          <h2>Linha do tempo das guias</h2>
        </div>
      </div>

      <div className="billing-timeline">
        {guideMovements.map((movement, index) => (
          <article key={`${movement.guide}-${movement.stage}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{movement.guide}</strong>
              <p>{movement.stage}</p>
              <small>
                {movement.provider} - {movement.updatedAt}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BillingEmptyState({
  code,
  description,
  title,
}: {
  code: string;
  description: string;
  title: string;
}) {
  return (
    <div className="billing-empty-state">
      <span>{code}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="billing-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCurrencyFromCents(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function sortByAppointmentDate(left: Appointment, right: Appointment) {
  return (
    new Date(right.appointmentDate).getTime() -
    new Date(left.appointmentDate).getTime()
  );
}

function matchAppointment(appointment: Appointment, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    appointment.patient.name,
    appointment.patient.cpf,
    appointment.patient.phone,
    appointment.doctor.user.name,
    appointment.status,
    appointment.type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function riskClass(risk: BillingDenial['risk']) {
  if (risk === 'Alto') {
    return 'risk-high';
  }

  if (risk === 'Medio') {
    return 'risk-medium';
  }

  return 'risk-low';
}
