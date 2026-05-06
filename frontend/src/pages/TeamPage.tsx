import { useDeferredValue, useMemo, useState } from 'react';
import type React from 'react';

import { DirectoryState } from '../components/ui/DirectoryState';
import { OperationalModal } from '../components/ui/OperationalModal';
import { OperationalSearchCard } from '../components/ui/OperationalSearchCard';
import {
  matchDoctor,
  matchNurse,
  matchSector,
  type DoctorFormState,
  type NurseFormState,
  type SectorFormState,
} from '../lib/appSupport';
import { normalizeLogin } from '../lib/normalizers';
import type { Doctor, Nurse, Sector } from '../lib/types';
type TeamPageProps = {
  doctors: Doctor[];
  nurses: Nurse[];
  sectors: Sector[];
  form: DoctorFormState;
  nurseForm: NurseFormState;
  sectorForm: SectorFormState;
  isSubmitting: boolean;
  onNurseSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSectorSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onPrepareDoctor: (doctorId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setForm: React.Dispatch<React.SetStateAction<DoctorFormState>>;
  setNurseForm: React.Dispatch<React.SetStateAction<NurseFormState>>;
  setSectorForm: React.Dispatch<React.SetStateAction<SectorFormState>>;
};

export function TeamPage({
  doctors,
  nurses,
  sectors,
  form,
  nurseForm,
  sectorForm,
  isSubmitting,
  onNurseSubmit,
  onSectorSubmit,
  onPrepareDoctor,
  onSubmit,
  setForm,
  setNurseForm,
  setSectorForm,
}: TeamPageProps) {
  const [search, setSearch] = useState('');
  const [hasSearchedTeam, setHasSearchedTeam] = useState(false);
  const [teamModal, setTeamModal] = useState<
    'doctor' | 'nurse' | 'sector' | null
  >(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const canSearchTeam = search.trim().length >= 2;
  const filteredDoctors = useMemo(
    () =>
      hasSearchedTeam
        ? doctors.filter((doctor) => matchDoctor(doctor, deferredSearch))
        : [],
    [deferredSearch, doctors, hasSearchedTeam],
  );
  const filteredNurses = useMemo(
    () =>
      hasSearchedTeam
        ? nurses.filter((nurse) => matchNurse(nurse, deferredSearch))
        : [],
    [deferredSearch, hasSearchedTeam, nurses],
  );
  const filteredSectors = useMemo(
    () =>
      hasSearchedTeam
        ? sectors.filter((sector) => matchSector(sector, deferredSearch))
        : [],
    [deferredSearch, hasSearchedTeam, sectors],
  );
  const activeSectors = sectors.filter((sector) => sector.active).length;

  function searchTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canSearchTeam) {
      setHasSearchedTeam(true);
    }
  }

  function clearTeamSearch() {
    setSearch('');
    setHasSearchedTeam(false);
  }

  return (
    <>
      <section className="summary-strip">
        <article className="summary-card">
          <span>Medicos</span>
          <strong>{doctors.length}</strong>
          <small>cadastros assistenciais</small>
        </article>
        <article className="summary-card">
          <span>Enfermagem</span>
          <strong>{nurses.length}</strong>
          <small>apoio operacional</small>
        </article>
        <article className="summary-card">
          <span>Setores</span>
          <strong>{sectors.length}</strong>
          <small>estrutura organizacional</small>
        </article>
        <article className="summary-card">
          <span>Setores ativos</span>
          <strong>{activeSectors}</strong>
          <small>alocacao corrente</small>
        </article>
      </section>

      <section className="page-grid team-layout modal-workspace">
        <div className="stack-column">
          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Equipe assistencial</p>
                <h2>Busca e preparacao de agenda</h2>
              </div>
              <div className="toolbar-inline">
                <button
                  className="primary-button"
                  onClick={() => setTeamModal('doctor')}
                  type="button"
                >
                  Novo medico
                </button>
                <button
                  className="ghost-button"
                  onClick={() => setTeamModal('nurse')}
                  type="button"
                >
                  Enfermagem
                </button>
                <button
                  className="ghost-button"
                  onClick={() => setTeamModal('sector')}
                  type="button"
                >
                  Novo setor
                </button>
                <span className="inline-badge">{doctors.length} medicos</span>
              </div>
            </div>

            <OperationalSearchCard
              canSearch={canSearchTeam}
              description="Pesquise por profissional, conselho, email, especialidade ou setor antes de abrir os resultados da equipe."
              onChange={setSearch}
              onClear={clearTeamSearch}
              onSearch={searchTeam}
              placeholder="Buscar por nome, conselho, email, especialidade ou setor"
              resultText={
                hasSearchedTeam
                  ? `${filteredDoctors.length} medicos, ${filteredNurses.length} enfermagem, ${filteredSectors.length} setores`
                  : undefined
              }
              title="Localize profissional ou setor pelo contexto."
              value={search}
            />

            <div className="table-shell">
              <div className="table-head doctors-grid">
                <span>Profissional</span>
                <span>Registro</span>
                <span>Setor</span>
                <span>Acao</span>
              </div>

              {!hasSearchedTeam ? (
                <DirectoryState
                  code="01"
                  title="Nenhum medico carregado automaticamente."
                  description="Use a busca acima para localizar profissional, conselho ou setor."
                />
              ) : filteredDoctors.length === 0 ? (
                <p className="empty-state">
                  Nenhum medico encontrado com esse filtro.
                </p>
              ) : (
                filteredDoctors.map((doctor) => (
                  <div className="table-row doctors-grid" key={doctor.id}>
                    <span>
                      {doctor.user.name}
                      <small>
                        {doctor.specialties.length > 0
                          ? doctor.specialties.join(', ')
                          : 'Sem especialidade'}
                      </small>
                    </span>
                    <span>
                      {doctor.crm}/{doctor.crmUf}
                    </span>
                    <span>{doctor.sector?.name ?? 'Sem setor'}</span>
                    <button
                      className="mini-button"
                      onClick={() => onPrepareDoctor(doctor.id)}
                      type="button"
                    >
                      Usar na agenda
                    </button>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Enfermagem</p>
                <h2>Setores e plantoes</h2>
              </div>
              <span className="inline-badge">
                {hasSearchedTeam ? filteredNurses.length : nurses.length} ativos
              </span>
            </div>

            <div className="table-shell">
              <div className="table-head nurses-grid">
                <span>Profissional</span>
                <span>COREN</span>
                <span>Setor</span>
                <span>Plantao</span>
              </div>

              {!hasSearchedTeam ? (
                <DirectoryState
                  code="02"
                  title="Nenhum enfermeiro carregado automaticamente."
                  description="A busca da equipe tambem filtra enfermagem por nome, COREN, email, setor e plantao."
                />
              ) : filteredNurses.length === 0 ? (
                <p className="empty-state">
                  Nenhum enfermeiro encontrado com esse filtro.
                </p>
              ) : (
                filteredNurses.map((nurse) => (
                  <div className="table-row nurses-grid" key={nurse.id}>
                    <span>
                      {nurse.user.name}
                      <small>{nurse.user.email}</small>
                    </span>
                    <span>
                      {nurse.coren}/{nurse.corenUf}
                    </span>
                    <span>{nurse.sector?.name ?? 'Sem setor'}</span>
                    <span>{nurse.shift || 'Nao informado'}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel">
            <div className="page-header">
              <div>
                <p className="eyebrow">Setores</p>
                <h2>Mapa de alocacao</h2>
              </div>
              <span className="inline-badge">
                {hasSearchedTeam ? filteredSectors.length : sectors.length}{' '}
                visiveis
              </span>
            </div>

            <div className="list-shell">
              {!hasSearchedTeam ? (
                <DirectoryState
                  code="03"
                  title="Nenhum setor carregado automaticamente."
                  description="Pesquise para abrir somente os setores relacionados ao termo informado."
                />
              ) : filteredSectors.length === 0 ? (
                <p className="empty-state">Nenhum setor cadastrado ainda.</p>
              ) : (
                filteredSectors.map((sector) => (
                  <div className="list-row" key={sector.id}>
                    <div>
                      <strong>
                        {sector.name} ({sector.code})
                      </strong>
                      <span>
                        {sector.description || 'Sem descricao operacional'}
                      </span>
                    </div>
                    <div className="team-meta">
                      <span>{sector.doctors?.length ?? 0} med.</span>
                      <span>{sector.nurses?.length ?? 0} enf.</span>
                      <span>{sector.active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <OperationalModal
          eyebrow="Cadastro profissional"
          isOpen={teamModal === 'doctor'}
          onClose={() => setTeamModal(null)}
          title="Novo medico"
          toneLabel="CRM e documentos"
        >
          <form className="modal-form-panel" onSubmit={onSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Cadastro profissional</p>
                <h2>Novo medico</h2>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Usuario e acesso</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>Nome</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Login</span>
                  <input
                    autoComplete="off"
                    placeholder="ex: medico.carlos"
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: normalizeLogin(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Senha inicial</span>
                  <input
                    minLength={6}
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Registro e setor</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>CRM</span>
                  <input
                    value={form.crm}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        crm: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>UF do CRM</span>
                  <input
                    maxLength={2}
                    value={form.crmUf}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        crmUf: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Setor</span>
                  <select
                    value={form.sectorId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sectorId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Especialidades</span>
                  <input
                    placeholder="Cardiologia, Clinico Geral"
                    value={form.specialties}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        specialties: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field full-row">
                  <span>Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Endereco e documentos</p>
              <div className="field-grid two-columns">
                <label className="field full-row">
                  <span>Endereco</span>
                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>UF</span>
                  <input
                    maxLength={2}
                    value={form.state}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        state: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>CEP</span>
                  <input
                    value={form.zipCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        zipCode: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Documentos anexos</span>
                  <textarea
                    placeholder="Uma referencia por linha: CRM.pdf, contrato.pdf"
                    value={form.documents}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        documents: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar medico'}
            </button>
          </form>
        </OperationalModal>

        <OperationalModal
          eyebrow="Cadastro profissional"
          isOpen={teamModal === 'nurse'}
          onClose={() => setTeamModal(null)}
          title="Novo enfermeiro"
          toneLabel="COREN e escala"
        >
          <form className="modal-form-panel" onSubmit={onNurseSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Cadastro profissional</p>
                <h2>Novo enfermeiro</h2>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Usuario e acesso</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>Nome</span>
                  <input
                    value={nurseForm.name}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={nurseForm.email}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Login</span>
                  <input
                    autoComplete="off"
                    placeholder="ex: enfermagem.pa"
                    value={nurseForm.username}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        username: normalizeLogin(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Senha inicial</span>
                  <input
                    minLength={6}
                    type="password"
                    value={nurseForm.password}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Registro e setor</p>
              <div className="field-grid three-columns">
                <label className="field">
                  <span>COREN</span>
                  <input
                    value={nurseForm.coren}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        coren: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>UF do COREN</span>
                  <input
                    maxLength={2}
                    value={nurseForm.corenUf}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        corenUf: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Setor</span>
                  <select
                    value={nurseForm.sectorId}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        sectorId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Plantao</span>
                  <input
                    placeholder="Diurno, Noturno..."
                    value={nurseForm.shift}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        shift: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Telefone</span>
                  <input
                    value={nurseForm.phone}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="section-block">
              <p className="section-title">Endereco e documentos</p>
              <div className="field-grid two-columns">
                <label className="field full-row">
                  <span>Endereco</span>
                  <input
                    value={nurseForm.address}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input
                    value={nurseForm.city}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>UF</span>
                  <input
                    maxLength={2}
                    value={nurseForm.state}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        state: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>CEP</span>
                  <input
                    value={nurseForm.zipCode}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        zipCode: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field full-row">
                  <span>Documentos anexos</span>
                  <textarea
                    placeholder="Uma referencia por linha: COREN.pdf, contrato.pdf"
                    value={nurseForm.documents}
                    onChange={(event) =>
                      setNurseForm((current) => ({
                        ...current,
                        documents: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar enfermeiro'}
            </button>
          </form>
        </OperationalModal>

        <OperationalModal
          eyebrow="Estrutura"
          isOpen={teamModal === 'sector'}
          onClose={() => setTeamModal(null)}
          size="standard"
          title="Novo setor"
          toneLabel="Setor operacional"
        >
          <form className="modal-form-panel" onSubmit={onSectorSubmit}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Estrutura</p>
                <h2>Novo setor</h2>
              </div>
            </div>

            <div className="field-grid two-columns">
              <label className="field">
                <span>Nome do setor</span>
                <input
                  value={sectorForm.name}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Codigo</span>
                <input
                  value={sectorForm.code}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </label>
              <label className="field full-row">
                <span>Descricao</span>
                <textarea
                  value={sectorForm.description}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={sectorForm.active ? 'ATIVO' : 'INATIVO'}
                  onChange={(event) =>
                    setSectorForm((current) => ({
                      ...current,
                      active: event.target.value === 'ATIVO',
                    }))
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
            </div>

            <button
              className="primary-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar setor'}
            </button>
          </form>
        </OperationalModal>
      </section>
    </>
  );
}


