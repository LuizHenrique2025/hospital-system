import { useMemo, useState, type FormEvent } from 'react';

import { OperationalModal } from '../components/ui/OperationalModal';
import { apiRequest } from '../lib/api';
import type {
  Agreement,
  BudgetEstimate,
  PaginatedResponse,
  Patient,
  ProcedurePrice,
} from '../lib/types';

type BudgetCalculatorPageProps = {
  sessionToken: string;
};

type BudgetDraftItem = {
  key: string;
  procedurePriceId?: string;
  procedureId: string;
  pricingTableId?: string;
  code: string;
  description: string;
  tableName: string;
  quantity: number;
  unitPriceCents: number;
  operationalCostCents: number;
  discountCents: number;
};

const pageSize = 12;

export function BudgetCalculatorPage({
  sessionToken,
}: BudgetCalculatorPageProps) {
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientStatus, setPatientStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [priceResults, setPriceResults] = useState<ProcedurePrice[]>([]);
  const [priceStatus, setPriceStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [agreementSearch, setAgreementSearch] = useState('');
  const [agreementResults, setAgreementResults] = useState<Agreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [items, setItems] = useState<BudgetDraftItem[]>([]);
  const [estimateTitle, setEstimateTitle] = useState(
    'Orcamento hospitalar',
  );
  const [estimateNotes, setEstimateNotes] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [createdEstimate, setCreatedEstimate] = useState<BudgetEstimate | null>(
    null,
  );
  const [focusedEstimate, setFocusedEstimate] = useState<BudgetEstimate | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const subtotalCents = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          Math.max(
            item.quantity * item.unitPriceCents +
              item.operationalCostCents -
              item.discountCents,
            0,
          ),
        0,
      ),
    [items],
  );
  const discountCents = parseCurrencyToCents(globalDiscount);
  const totalCents = Math.max(subtotalCents - discountCents, 0);
  const canSearchPatient = patientSearch.trim().length >= 2;
  const canSearchProcedure = procedureSearch.trim().length >= 2;
  const canSaveEstimate = Boolean(selectedPatient) && items.length > 0;

  async function searchPatients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearchPatient) {
      setStatusMessage('Digite ao menos 2 caracteres para buscar paciente.');
      return;
    }

    setPatientStatus('loading');
    setStatusMessage('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: String(pageSize),
        q: patientSearch.trim(),
      });
      const response = await apiRequest<PaginatedResponse<Patient>>(
        `/patients?${queryParams.toString()}`,
        { token: sessionToken },
      );

      setPatientResults(response.data ?? []);
      setPatientStatus('ready');
    } catch (error) {
      setPatientResults([]);
      setPatientStatus('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar pacientes.',
      );
    }
  }

  async function searchAgreements(term: string) {
    setAgreementSearch(term);

    if (term.trim().length < 2) {
      setAgreementResults([]);
      return;
    }

    const queryParams = new URLSearchParams({
      page: '1',
      limit: '8',
      q: term.trim(),
    });
    const response = await apiRequest<PaginatedResponse<Agreement>>(
      `/agreements?${queryParams.toString()}`,
      { token: sessionToken },
    );

    setAgreementResults(response.data ?? []);
  }

  async function searchProcedurePrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearchProcedure) {
      setStatusMessage('Digite ao menos 2 caracteres para buscar procedimento.');
      return;
    }

    setPriceStatus('loading');
    setStatusMessage('');

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: String(pageSize),
        q: procedureSearch.trim(),
      });
      const response = await apiRequest<PaginatedResponse<ProcedurePrice>>(
        `/procedure-prices?${queryParams.toString()}`,
        { token: sessionToken },
      );

      setPriceResults(response.data ?? []);
      setPriceStatus('ready');
    } catch (error) {
      setPriceResults([]);
      setPriceStatus('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar valores de procedimentos.',
      );
    }
  }

  function addPriceToBudget(price: ProcedurePrice) {
    const key = `${price.procedureId}:${price.pricingTableId}`;

    setItems((current) => {
      const existing = current.find((item) => item.key === key);

      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...current,
        {
          key,
          procedurePriceId: price.id,
          procedureId: price.procedureId,
          pricingTableId: price.pricingTableId,
          code: price.procedure.code,
          description: price.procedure.description,
          tableName: price.pricingTable.name,
          quantity: 1,
          unitPriceCents: price.priceCents,
          operationalCostCents: price.operationalCostCents ?? 0,
          discountCents: 0,
        },
      ];
    });
    setCreatedEstimate(null);
  }

  function updateItem(
    key: string,
    field: 'quantity' | 'discountCents',
    value: number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: field === 'quantity' ? Math.max(value, 1) : Math.max(value, 0),
            }
          : item,
      ),
    );
    setCreatedEstimate(null);
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
    setCreatedEstimate(null);
  }

  async function saveEstimate(status: 'DRAFT' | 'PENDING_APPROVAL') {
    if (!canSaveEstimate || !selectedPatient) {
      setStatusMessage('Selecione paciente e ao menos um item.');
      return null;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      const estimate = await apiRequest<BudgetEstimate>('/budget-estimates', {
        token: sessionToken,
        body: {
          patientId: selectedPatient.id,
          providerId: selectedAgreement?.id,
          status,
          title: estimateTitle,
          notes: estimateNotes,
          discountCents,
          items: items.map((item) => ({
            procedureId: item.procedureId,
            pricingTableId: item.pricingTableId,
            procedurePriceId: item.procedurePriceId,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            operationalCostCents: item.operationalCostCents,
            discountCents: item.discountCents,
          })),
        },
      });

      setCreatedEstimate(estimate);
      setFocusedEstimate(estimate);
      setStatusMessage(`Orcamento ${estimate.code} salvo no paciente.`);
      return estimate;
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar o orcamento.',
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function approveAndCreateGuide() {
    const estimate = createdEstimate ?? (await saveEstimate('PENDING_APPROVAL'));

    if (!estimate) {
      return;
    }

    setIsSaving(true);
    setStatusMessage('');

    try {
      const approved = await apiRequest<BudgetEstimate>(
        `/budget-estimates/${estimate.id}/approve`,
        {
          token: sessionToken,
          body: {
            createBillingGuide: true,
            originSector: 'Hospitalar',
            notes: 'Orcamento aprovado e convertido em guia inicial.',
          },
        },
      );

      setCreatedEstimate(approved);
      setFocusedEstimate(approved);
      setStatusMessage(
        approved.convertedGuide
          ? `Aprovado e vinculado a guia ${approved.convertedGuide.guideNumber}.`
          : 'Orcamento aprovado.',
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel aprovar o orcamento.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function clearBudget() {
    setItems([]);
    setCreatedEstimate(null);
    setFocusedEstimate(null);
    setEstimateTitle('Orcamento hospitalar');
    setEstimateNotes('');
    setGlobalDiscount('');
    setStatusMessage('');
  }

  return (
    <section className="budget-calculator-workspace">
      <article className="panel budget-hero-panel">
        <div>
          <p className="eyebrow">Orcamento hospitalar</p>
          <h2>Calculadora de exames e procedimentos</h2>
          <p>
            Monte o orçamento por tabela, vincule ao paciente e transforme a
            aprovação em guia para o faturamento continuar o fluxo.
          </p>
        </div>
        <div className="budget-total-card">
          <span>Total previsto</span>
          <strong>{formatCurrencyFromCents(totalCents)}</strong>
          <small>{items.length} item(ns) no orçamento</small>
        </div>
      </article>

      <section className="budget-calculator-grid">
        <article className="panel budget-builder-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Paciente e convenio</p>
              <h2>Vinculo do orçamento</h2>
            </div>
            {createdEstimate ? (
              <button
                className="ghost-button"
                onClick={() => setFocusedEstimate(createdEstimate)}
                type="button"
              >
                Ver orçamento
              </button>
            ) : null}
          </div>

          <form className="budget-search-card" onSubmit={searchPatients}>
            <span className="section-title">Buscar paciente</span>
            <div className="budget-search-line">
              <input
                placeholder="Nome, CPF, telefone ou email"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
              />
              <button disabled={!canSearchPatient || patientStatus === 'loading'} type="submit">
                {patientStatus === 'loading' ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {selectedPatient ? (
            <div className="budget-selected-card">
              <div>
                <span>Paciente selecionado</span>
                <strong>{selectedPatient.name}</strong>
                <small>
                  {selectedPatient.cpf} - {selectedPatient.phone}
                </small>
              </div>
              <button
                className="mini-button"
                onClick={() => setSelectedPatient(null)}
                type="button"
              >
                Trocar
              </button>
            </div>
          ) : patientResults.length > 0 ? (
            <div className="budget-result-list">
              {patientResults.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setPatientResults([]);
                  }}
                  type="button"
                >
                  <strong>{patient.name}</strong>
                  <small>
                    {patient.cpf} - {patient.phone}
                  </small>
                </button>
              ))}
            </div>
          ) : null}

          <label className="field">
            <span>Convenio / operadora</span>
            <input
              placeholder="Opcional: UNIMED, PARTICULAR, SC SAUDE..."
              value={agreementSearch}
              onChange={(event) => void searchAgreements(event.target.value)}
            />
          </label>
          {selectedAgreement ? (
            <div className="budget-selected-card compact">
              <strong>{selectedAgreement.name}</strong>
              <button
                className="mini-button"
                onClick={() => {
                  setSelectedAgreement(null);
                  setAgreementSearch('');
                }}
                type="button"
              >
                Remover
              </button>
            </div>
          ) : agreementResults.length > 0 ? (
            <div className="budget-result-list compact">
              {agreementResults.map((agreement) => (
                <button
                  key={agreement.id}
                  onClick={() => {
                    setSelectedAgreement(agreement);
                    setAgreementSearch(agreement.name);
                    setAgreementResults([]);
                  }}
                  type="button"
                >
                  <strong>{agreement.name}</strong>
                  <small>{agreement.code}</small>
                </button>
              ))}
            </div>
          ) : null}

          <div className="field-grid two-columns">
            <label className="field">
              <span>Titulo</span>
              <input
                value={estimateTitle}
                onChange={(event) => setEstimateTitle(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Desconto geral</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={globalDiscount}
                onChange={(event) => setGlobalDiscount(event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>Observações</span>
            <textarea
              placeholder="Ex: orçamento sujeito a autorização do convênio."
              value={estimateNotes}
              onChange={(event) => setEstimateNotes(event.target.value)}
            />
          </label>
        </article>

        <article className="panel budget-builder-panel">
          <div className="page-header">
            <div>
              <p className="eyebrow">Itens</p>
              <h2>Exames e procedimentos</h2>
            </div>
          </div>

          <form className="budget-search-card" onSubmit={searchProcedurePrices}>
            <span className="section-title">Buscar na tabela</span>
            <div className="budget-search-line">
              <input
                placeholder="Codigo, exame, procedimento ou tabela"
                value={procedureSearch}
                onChange={(event) => setProcedureSearch(event.target.value)}
              />
              <button disabled={!canSearchProcedure || priceStatus === 'loading'} type="submit">
                {priceStatus === 'loading' ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {priceStatus === 'ready' && priceResults.length === 0 ? (
            <p className="empty-state">
              Nenhum valor encontrado. Cadastre o valor na tabela antes de orçar.
            </p>
          ) : null}

          <div className="budget-price-results">
            {priceResults.map((price) => (
              <button
                key={price.id}
                onClick={() => addPriceToBudget(price)}
                type="button"
              >
                <div>
                  <strong>{price.procedure.description}</strong>
                  <small>
                    {price.procedure.code} - {price.pricingTable.name}
                  </small>
                </div>
                <span>{formatCurrencyFromCents(price.priceCents)}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="panel budget-cart-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Resumo</p>
            <h2>Orçamento em montagem</h2>
          </div>
          <div className="toolbar-inline">
            <button className="ghost-button" onClick={clearBudget} type="button">
              Limpar
            </button>
            <button
              className="ghost-button"
              disabled={isSaving || !canSaveEstimate}
              onClick={() => void saveEstimate('PENDING_APPROVAL')}
              type="button"
            >
              {isSaving ? 'Salvando...' : 'Salvar no paciente'}
            </button>
            <button
              className="primary-button"
              disabled={isSaving || !canSaveEstimate}
              onClick={() => void approveAndCreateGuide()}
              type="button"
            >
              Aprovar e gerar guia
            </button>
          </div>
        </div>

        {statusMessage ? <p className="empty-state compact">{statusMessage}</p> : null}

        <div className="budget-cart-table">
          <div className="budget-cart-head">
            <span>Procedimento</span>
            <span>Tabela</span>
            <span>Qtd.</span>
            <span>Desconto</span>
            <span>Total</span>
            <span>Ações</span>
          </div>

          {items.length === 0 ? (
            <div className="budget-empty-cart">
              <strong>Nenhum item no orçamento.</strong>
              <span>Busque procedimentos acima para montar o cálculo.</span>
            </div>
          ) : (
            items.map((item) => {
              const itemTotal = Math.max(
                item.quantity * item.unitPriceCents +
                  item.operationalCostCents -
                  item.discountCents,
                0,
              );

              return (
                <div className="budget-cart-row" key={item.key}>
                  <span>
                    {item.description}
                    <small>{item.code}</small>
                  </span>
                  <span>{item.tableName}</span>
                  <input
                    min={1}
                    type="number"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.key, 'quantity', Number(event.target.value))
                    }
                  />
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={centsToInput(item.discountCents)}
                    onChange={(event) =>
                      updateItem(
                        item.key,
                        'discountCents',
                        parseCurrencyToCents(event.target.value),
                      )
                    }
                  />
                  <strong>{formatCurrencyFromCents(itemTotal)}</strong>
                  <button
                    className="mini-button"
                    onClick={() => removeItem(item.key)}
                    type="button"
                  >
                    Remover
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="budget-total-strip">
          <span>Subtotal {formatCurrencyFromCents(subtotalCents)}</span>
          <span>Desconto {formatCurrencyFromCents(discountCents)}</span>
          <strong>Total {formatCurrencyFromCents(totalCents)}</strong>
        </div>
      </article>

      <OperationalModal
        eyebrow="Orcamento aprovado"
        isOpen={Boolean(focusedEstimate)}
        onClose={() => setFocusedEstimate(null)}
        title={focusedEstimate?.code ?? 'Orcamento'}
        toneLabel={focusedEstimate?.status}
      >
        {focusedEstimate ? (
          <section className="budget-estimate-modal">
            <div className="record-grid">
              <Record label="Paciente" value={focusedEstimate.patient?.name} />
              <Record label="Convenio" value={focusedEstimate.provider?.name} />
              <Record
                label="Total"
                value={formatCurrencyFromCents(focusedEstimate.totalCents)}
              />
              <Record
                label="Guia"
                value={focusedEstimate.convertedGuide?.guideNumber}
              />
            </div>
            <div className="budget-modal-items">
              {focusedEstimate.items.map((item) => (
                <article key={item.id}>
                  <strong>{item.description}</strong>
                  <span>
                    {item.quantity}x {formatCurrencyFromCents(item.unitPriceCents)}
                  </span>
                  <b>{formatCurrencyFromCents(item.totalCents)}</b>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </OperationalModal>
    </section>
  );
}

function Record({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="record-line">
      <span>{label}</span>
      <strong>{value || 'Nao informado'}</strong>
    </div>
  );
}

function formatCurrencyFromCents(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

function parseCurrencyToCents(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(Math.round(parsed * 100), 0);
}

function centsToInput(value: number) {
  if (!value) {
    return '';
  }

  return (value / 100).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}
