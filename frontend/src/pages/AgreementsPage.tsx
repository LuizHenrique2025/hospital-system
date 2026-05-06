import { useState } from 'react';
import type React from 'react';

import { DirectoryState } from '../components/ui/DirectoryState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import { RecordLine } from '../components/ui/RecordLine';
import { ResultPagination } from '../components/ui/ResultPagination';
import { apiRequest } from '../lib/api';
import {
  compactPageSize,
  createAgreementPricingRulePayload,
  formatBasisPointsPercent,
  initialAgreementPricingRuleForm,
  pricingTableTypeLabel,
} from '../lib/appSupport';
import type {
  Agreement,
  AgreementPricingRule,
  PaginatedResponse,
  PricingTable,
} from '../lib/types';
type AgreementsPageProps = {
  sessionToken: string;
};

export function AgreementsPage({ sessionToken }: AgreementsPageProps) {
  const [search, setSearch] = useState('');
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [agreementTotal, setAgreementTotal] = useState(0);
  const [pricingRules, setPricingRules] = useState<AgreementPricingRule[]>([]);
  const [availablePricingTables, setAvailablePricingTables] = useState<
    PricingTable[]
  >([]);
  const [ruleForm, setRuleForm] = useState(initialAgreementPricingRuleForm);
  const [ruleStatus, setRuleStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [agreementPage, setAgreementPage] = useState(1);
  const [hasSearchedAgreements, setHasSearchedAgreements] = useState(false);
  const [searchStatus, setSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [searchError, setSearchError] = useState('');
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(
    null,
  );
  const searchTerm = search.trim();
  const canSearchAgreement = searchTerm.length >= 2;
  const focusedAgreement =
    agreements.find((agreement) => agreement.id === selectedAgreementId) ??
    null;
  const canSaveRule =
    Boolean(focusedAgreement) && Boolean(ruleForm.pricingTableId);

  async function searchAgreements(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearchAgreement) {
      setSearchError('Digite ao menos 2 caracteres para pesquisar convenio.');
      return;
    }

    await loadAgreements(searchTerm, 1);
  }

  async function loadAgreements(term = searchTerm, page = agreementPage) {
    setSearchStatus('loading');
    setSearchError('');

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(compactPageSize),
      });

      if (term) {
        queryParams.set('q', term);
      }

      const response = await apiRequest<PaginatedResponse<Agreement>>(
        `/agreements?${queryParams.toString()}`,
        { token: sessionToken },
      );
      const nextAgreements = response.data ?? [];

      setAgreements(nextAgreements);
      setAgreementTotal(
        response.meta?.total ?? response.total ?? nextAgreements.length,
      );
      setAgreementPage(page);
      setSelectedAgreementId(null);
      setPricingRules([]);
      setRuleForm(initialAgreementPricingRuleForm);
      setHasSearchedAgreements(true);
      setSearchStatus('ready');
    } catch (error) {
      setAgreements([]);
      setAgreementTotal(0);
      setSelectedAgreementId(null);
      setPricingRules([]);
      setRuleForm(initialAgreementPricingRuleForm);
      setHasSearchedAgreements(true);
      setSearchStatus('error');
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel buscar convenios.',
      );
    }
  }

  function clearAgreementSearch() {
    setSearch('');
    setAgreements([]);
    setAgreementTotal(0);
    setAgreementPage(1);
    setSelectedAgreementId(null);
    setPricingRules([]);
    setRuleForm(initialAgreementPricingRuleForm);
    setHasSearchedAgreements(false);
    setSearchStatus('idle');
    setSearchError('');
  }

  async function selectAgreement(agreement: Agreement) {
    setSelectedAgreementId(agreement.id);
    setRuleForm(initialAgreementPricingRuleForm);
    await Promise.all([
      loadAgreementPricingRules(agreement.id),
      loadAvailablePricingTables(),
    ]);
  }

  async function loadAgreementPricingRules(agreementId: string) {
    setRuleStatus('loading');
    setSearchError('');

    try {
      const response = await apiRequest<AgreementPricingRule[]>(
        `/agreements/${agreementId}/pricing-rules`,
        { token: sessionToken },
      );

      setPricingRules(response);
      setRuleStatus('ready');
    } catch (error) {
      setPricingRules([]);
      setRuleStatus('error');
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar regras do convenio.',
      );
    }
  }

  async function loadAvailablePricingTables() {
    if (availablePricingTables.length > 0) {
      return;
    }

    const response = await apiRequest<PaginatedResponse<PricingTable>>(
      '/pricing-tables?page=1&limit=100',
      { token: sessionToken },
    );

    setAvailablePricingTables(response.data ?? []);
  }

  async function createAgreementPricingRule(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!focusedAgreement || !canSaveRule) {
      setSearchError('Selecione o convenio e a tabela de preco.');
      return;
    }

    setIsSavingRule(true);
    setSearchError('');

    try {
      const createdRule = await apiRequest<AgreementPricingRule>(
        `/agreements/${focusedAgreement.id}/pricing-rules`,
        {
          token: sessionToken,
          body: createAgreementPricingRulePayload(ruleForm),
        },
      );

      setPricingRules((current) => [createdRule, ...current]);
      setRuleForm(initialAgreementPricingRuleForm);
      setRuleStatus('ready');
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar a regra do convenio.',
      );
    } finally {
      setIsSavingRule(false);
    }
  }

  async function deleteAgreementPricingRule(ruleId: string) {
    if (!focusedAgreement) {
      return;
    }

    try {
      await apiRequest(
        `/agreements/${focusedAgreement.id}/pricing-rules/${ruleId}`,
        {
          method: 'DELETE',
          token: sessionToken,
        },
      );
      setPricingRules((current) =>
        current.filter((rule) => rule.id !== ruleId),
      );
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel excluir a regra do convenio.',
      );
    }
  }

  return (
    <section className="page-grid agreements-workspace modal-workspace">
      <article className="panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">ConvÃªnios</p>
            <h2>Operadoras cadastradas</h2>
          </div>
          <span className="inline-badge">{agreementTotal} no cadastro</span>
        </div>

        <OperationalSearchCard
          canSearch={canSearchAgreement}
          description="Pesquise por nome, codigo interno ou observacao operacional."
          error={searchError}
          isLoading={searchStatus === 'loading'}
          onChange={setSearch}
          onClear={clearAgreementSearch}
          onSearch={searchAgreements}
          placeholder="Ex: UNIMED, BRADESCO, PARTICULAR..."
          resultText={
            hasSearchedAgreements && searchStatus === 'ready'
              ? `${agreements.length} de ${agreementTotal} convenios encontrados`
              : undefined
          }
          title="Localize o convenio antes de vincular ao atendimento."
          value={search}
        />

        <div className="table-shell">
          <div className="table-head agreements-grid">
            <span>ConvÃªnio</span>
            <span>CÃ³digo</span>
            <span>Status</span>
            <span>AÃ§Ãµes</span>
          </div>

          {!hasSearchedAgreements ? (
            <DirectoryState
              code="01"
              title="Nenhum convenio carregado automaticamente."
              description="Pesquise por nome ou codigo para consultar a base de convenios."
            />
          ) : searchStatus === 'loading' ? (
            <p className="empty-state">Buscando convenios...</p>
          ) : agreements.length === 0 ? (
            <DirectoryState
              code="00"
              title="Nenhum convenio encontrado."
              description="Revise o nome ou limpe a busca para ver todos os convenios ativos."
            />
          ) : (
            <>
              {agreements.map((agreement) => (
                <div className="table-row agreements-grid" key={agreement.id}>
                  <span>
                    {agreement.name}
                    <small>{agreement.notes || 'Cadastro operacional'}</small>
                  </span>
                  <span>{agreement.code}</span>
                  <span>{agreement.active ? 'Ativo' : 'Inativo'}</span>
                  <div className="patient-actions">
                    <button
                      className="mini-button"
                      onClick={() => void selectAgreement(agreement)}
                      type="button"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <ResultPagination
          currentPage={agreementPage}
          isLoading={searchStatus === 'loading'}
          label="convenios"
          onPageChange={(page) => void loadAgreements(searchTerm, page)}
          pageSize={compactPageSize}
          totalItems={agreementTotal}
        />
      </article>

      <OperationalModal
        eyebrow="Ficha do convenio"
        isOpen={Boolean(focusedAgreement)}
        onClose={() => {
          setSelectedAgreementId(null);
          setPricingRules([]);
          setRuleForm(initialAgreementPricingRuleForm);
        }}
        title={focusedAgreement?.name ?? 'Convenio'}
        toneLabel={
          focusedAgreement
            ? focusedAgreement.active
              ? 'Ativo'
              : 'Inativo'
            : undefined
        }
      >
        <div className="page-header">
          <div>
            <p className="eyebrow">Ficha do convÃªnio</p>
            <h2>{focusedAgreement?.name || 'Nenhum selecionado'}</h2>
          </div>
          {focusedAgreement ? (
            <span className="inline-badge">
              {focusedAgreement.active ? 'Ativo' : 'Inativo'}
            </span>
          ) : null}
        </div>

        {focusedAgreement ? (
          <section className="patient-record-card modal-record-card">
            <div className="record-grid">
              <RecordLine label="Nome" value={focusedAgreement.name} />
              <RecordLine label="Codigo" value={focusedAgreement.code} />
              <RecordLine
                label="Status"
                value={focusedAgreement.active ? 'Ativo' : 'Inativo'}
              />
              <RecordLine
                label="Regras"
                value={`${pricingRules.length} tabela(s)`}
              />
              <RecordLine label="Observacao" value={focusedAgreement.notes} />
            </div>

            <section className="exam-item-list">
              <span className="section-title">Tabelas vinculadas</span>
              {ruleStatus === 'loading' ? (
                <p className="empty-state compact">Carregando regras...</p>
              ) : pricingRules.length === 0 ? (
                <p className="empty-state compact">
                  Nenhuma tabela vinculada a este convenio.
                </p>
              ) : (
                pricingRules.map((rule) => (
                  <article className="exam-item-card" key={rule.id}>
                    <strong>{rule.pricingTable.name}</strong>
                    <small>
                      {pricingTableTypeLabel(rule.pricingTable.type)} -{' '}
                      {formatBasisPointsPercent(rule.multiplierBasisPoints)}
                    </small>
                    <small>
                      {rule.requiresAuthorization
                        ? 'Autorizacao obrigatoria'
                        : 'Sem autorizacao obrigatoria'}
                      {rule.active ? ' - Ativa' : ' - Inativa'}
                    </small>
                    <button
                      className="mini-button"
                      onClick={() => void deleteAgreementPricingRule(rule.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </article>
                ))
              )}
            </section>

            <form
              className="section-block"
              onSubmit={createAgreementPricingRule}
            >
              <span className="section-title">Nova regra de tabela</span>
              <label className="field">
                <span>Tabela de preco</span>
                <select
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      pricingTableId: event.target.value,
                    }))
                  }
                  required
                  value={ruleForm.pricingTableId}
                >
                  <option value="">Selecione</option>
                  {availablePricingTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} - {pricingTableTypeLabel(table.type)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field-grid two-columns">
                <label className="field">
                  <span>Percentual</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        multiplierPercent: event.target.value,
                      }))
                    }
                    placeholder="100"
                    value={ruleForm.multiplierPercent}
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        active: event.target.value === 'ATIVA',
                      }))
                    }
                    value={ruleForm.active ? 'ATIVA' : 'INATIVA'}
                  >
                    <option value="ATIVA">Ativa</option>
                    <option value="INATIVA">Inativa</option>
                  </select>
                </label>
                <label className="field">
                  <span>Vigencia inicial</span>
                  <input
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        validFrom: event.target.value,
                      }))
                    }
                    type="date"
                    value={ruleForm.validFrom}
                  />
                </label>
                <label className="field">
                  <span>Vigencia final</span>
                  <input
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        validTo: event.target.value,
                      }))
                    }
                    type="date"
                    value={ruleForm.validTo}
                  />
                </label>
              </div>

              <label className="field">
                <span>Autorizacao</span>
                <select
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      requiresAuthorization: event.target.value === 'SIM',
                    }))
                  }
                  value={ruleForm.requiresAuthorization ? 'SIM' : 'NAO'}
                >
                  <option value="NAO">Nao obrigatoria</option>
                  <option value="SIM">Obrigatoria</option>
                </select>
              </label>

              <label className="field">
                <span>Observacoes</span>
                <textarea
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  value={ruleForm.notes}
                />
              </label>

              <button
                className="primary-button"
                disabled={isSavingRule || !canSaveRule}
                type="submit"
              >
                {isSavingRule ? 'Salvando...' : 'Vincular tabela'}
              </button>
            </form>
          </section>
        ) : (
          <DirectoryState
            code="01"
            title="Selecione um convenio."
            description="A ficha aparece aqui depois que uma operadora for escolhida."
          />
        )}
      </OperationalModal>
    </section>
  );
}


