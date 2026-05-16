import {
  Suspense,
  useDeferredValue,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import type { Session } from '../../contexts/AuthContext';
import {
  administrativeModuleGroups,
  matchModuleSearch,
  moduleInitials,
  userInitials,
  type EnvironmentId,
  type ModuleItem,
  type NavigationEnvironment,
} from '../../config/navigation';
import { roleLabel } from '../../lib/roles';
import type { Role } from '../../lib/types';
import { RouteFallback } from './RouteFallback';

type Notice = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

type WorkspaceLayoutProps = {
  activeEnvironment: NavigationEnvironment;
  activeModules: ModuleItem[];
  environments: NavigationEnvironment[];
  handleLogout: () => void;
  isEnvironmentPickerOpen: boolean;
  notice: Notice | null;
  onChangeEnvironment: (environmentId: EnvironmentId) => void;
  onCloseEnvironmentPicker: () => void;
  onOpenEnvironmentPicker: () => void;
  session: Session;
  transitionEnvironment: NavigationEnvironment | null;
};

export function WorkspaceLayout({
  activeEnvironment,
  activeModules,
  environments,
  handleLogout,
  isEnvironmentPickerOpen,
  notice,
  onChangeEnvironment,
  onCloseEnvironmentPicker,
  onOpenEnvironmentPicker,
  session,
  transitionEnvironment,
}: WorkspaceLayoutProps) {
  return (
    <main className="app-shell">
      <section className="workspace-shell">
        <header className="topbar">
          <div className="brand-cluster">
            <img
              alt="Hospital Dia Revitalite"
              className="brand-logo"
              src="/hospital-dia-revitalite-logo.png"
            />
          </div>

          <div className="topbar-meta">
            <div className="session-chip">
              <span className="session-name">{session.profile.name}</span>
              <span className="session-role">
                {session.profile.username} - {roleLabel(session.profile.role)}
              </span>
            </div>
            <button
              className={`environment-switch ${activeEnvironment.toneClass}`}
              onClick={onOpenEnvironmentPicker}
              type="button"
            >
              <span>Ambiente</span>
              <strong>{activeEnvironment.label}</strong>
            </button>
            <button
              className="ghost-button"
              onClick={handleLogout}
              type="button"
            >
              Sair
            </button>
          </div>
        </header>

        {notice?.kind === 'error' ? (
          <div className={`notice-banner notice-${notice.kind}`}>
            {notice.text}
          </div>
        ) : null}

        <section className="workspace-main-grid">
          <aside
            className={`environment-sidebar ${activeEnvironment.toneClass}`}
          >
            <div className="sidebar-header">
              <button
                className="sidebar-environment-button"
                onClick={onOpenEnvironmentPicker}
                type="button"
              >
                <span className="sidebar-avatar">
                  {activeEnvironment.symbol}
                </span>
                <span className="sidebar-environment-copy">
                  <span>Ambiente atual</span>
                  <strong>{activeEnvironment.label}</strong>
                  <small>{activeEnvironment.hint}</small>
                </span>
                <span className="sidebar-chevron" aria-hidden="true">
                  v
                </span>
              </button>

              <nav
                className="sidebar-quick-actions"
                aria-label="Atalhos rapidos"
              >
                <NavLink className="sidebar-quick-link" to="/central?mailbox=open">
                  <span className="sidebar-quick-icon">IN</span>
                  <span>
                    <strong>Caixa interna</strong>
                    <small>Mural e mensagens</small>
                  </span>
                </NavLink>
              </nav>
            </div>

            <div className="sidebar-scroll-area">
              {activeEnvironment.id === 'administrativo' ? (
                <AdministrativeModuleGrid modules={activeModules} />
              ) : (
                <EnvironmentModuleNav modules={activeModules} />
              )}
            </div>

            <SidebarUserMenu
              handleLogout={handleLogout}
              role={session.profile.role}
              username={session.profile.username}
              userName={session.profile.name}
            />
          </aside>

          <section className="workspace-content">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </section>
        </section>
      </section>

      {isEnvironmentPickerOpen ? (
        <EnvironmentPicker
          activeEnvironment={activeEnvironment}
          environments={environments}
          onClose={onCloseEnvironmentPicker}
          onSelect={onChangeEnvironment}
        />
      ) : null}

      <EnvironmentTransition environment={transitionEnvironment} />
    </main>
  );
}

type AdministrativeModuleGridProps = {
  modules: ModuleItem[];
};

type EnvironmentModuleNavProps = {
  modules: ModuleItem[];
};

function EnvironmentModuleNav({ modules }: EnvironmentModuleNavProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const filteredModules = useMemo(
    () =>
      modules.filter((moduleItem) =>
        matchModuleSearch(
          [moduleItem.label, moduleItem.hint, moduleItem.path],
          deferredSearch,
        ),
      ),
    [deferredSearch, modules],
  );

  return (
    <div className="side-module-panel">
      <SidebarSearch
        count={filteredModules.length}
        onChange={setSearch}
        placeholder="Pesquisar modulo"
        value={search}
      />
      <nav className="side-module-nav" aria-label="Modulos do ambiente">
        {filteredModules.length === 0 ? (
          <p className="sidebar-empty">Nenhum modulo encontrado.</p>
        ) : (
          filteredModules.map((moduleItem) => (
            <NavLink
              key={moduleItem.path}
              className={({ isActive }) =>
                isActive ? 'side-module-link active' : 'side-module-link'
              }
              rel={moduleItem.openInNewTab ? 'noreferrer' : undefined}
              target={moduleItem.openInNewTab ? '_blank' : undefined}
              to={moduleItem.path}
            >
              <span className="module-nav-icon">
                {moduleInitials(moduleItem.label)}
              </span>
              <span className="module-nav-copy">
                <strong>{moduleItem.label}</strong>
                <span>{moduleItem.hint}</span>
              </span>
              <span className="module-nav-arrow" aria-hidden="true">
                &gt;
              </span>
            </NavLink>
          ))
        )}
      </nav>
    </div>
  );
}

function AdministrativeModuleGrid({ modules }: AdministrativeModuleGridProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const modulesByPath = new Map(
    modules.map((moduleItem) => [moduleItem.path, moduleItem]),
  );
  const filteredGroupCount = administrativeModuleGroups.reduce(
    (total, group) => {
      const groupModules = group.paths
        .map((path) => modulesByPath.get(path))
        .filter((moduleItem): moduleItem is ModuleItem => Boolean(moduleItem))
        .filter((moduleItem) =>
          matchModuleSearch(
            [group.label, group.hint, moduleItem.label, moduleItem.hint],
            deferredSearch,
          ),
        );

      return total + groupModules.length;
    },
    0,
  );

  return (
    <div className="side-module-panel">
      <SidebarSearch
        count={filteredGroupCount}
        onChange={setSearch}
        placeholder="Buscar em todos"
        value={search}
      />
      <section
        className="admin-module-grid"
        aria-label="Modulos administrativos"
      >
        {filteredGroupCount === 0 ? (
          <p className="sidebar-empty">Nenhum modulo encontrado.</p>
        ) : (
          administrativeModuleGroups.map((group) => {
            const groupModules = group.paths
              .map((path) => modulesByPath.get(path))
              .filter((moduleItem): moduleItem is ModuleItem =>
                Boolean(moduleItem),
              )
              .filter((moduleItem) =>
                matchModuleSearch(
                  [group.label, group.hint, moduleItem.label, moduleItem.hint],
                  deferredSearch,
                ),
              );

            if (groupModules.length === 0) {
              return null;
            }

            return (
              <article className="admin-module-group" key={group.label}>
                <div className="admin-module-group-header">
                  <strong>{group.label}</strong>
                  <span>{group.hint}</span>
                </div>

                <div className="admin-module-links">
                  {groupModules.map((moduleItem) => (
                    <NavLink
                      className={({ isActive }) =>
                        isActive
                          ? 'admin-module-link active'
                          : 'admin-module-link'
                      }
                      key={moduleItem.path}
                      rel={moduleItem.openInNewTab ? 'noreferrer' : undefined}
                      target={moduleItem.openInNewTab ? '_blank' : undefined}
                      to={moduleItem.path}
                    >
                      <span className="module-nav-icon compact">
                        {moduleInitials(moduleItem.label)}
                      </span>
                      <span className="module-nav-copy">
                        <strong>{moduleItem.label}</strong>
                        <span>{moduleItem.hint}</span>
                      </span>
                    </NavLink>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

type SidebarUserMenuProps = {
  handleLogout: () => void;
  role: Role;
  username: string;
  userName: string;
};

function SidebarUserMenu({
  handleLogout,
  role,
  username,
  userName,
}: SidebarUserMenuProps) {
  return (
    <details className="sidebar-user-menu">
      <summary className="sidebar-user-summary">
        <span className="sidebar-user-avatar">{userInitials(userName)}</span>
        <span className="sidebar-user-copy">
          <strong>{userName}</strong>
          <small>
            {username} - {roleLabel(role)}
          </small>
        </span>
        <span className="sidebar-chevron" aria-hidden="true">
          ^
        </span>
      </summary>

      <div
        className={`sidebar-user-popover ${role === 'ADMIN' ? '' : 'compact'}`}
      >
        {role === 'ADMIN' ? (
          <NavLink to="/configuracoes">Configuracoes</NavLink>
        ) : null}
        <button
          aria-label="Sair do sistema"
          className="sidebar-logout-icon"
          onClick={handleLogout}
          title="Sair do sistema"
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M10.8 5.2H6.4a1.6 1.6 0 0 0-1.6 1.6v10.4a1.6 1.6 0 0 0 1.6 1.6h4.4" />
            <path d="M15.2 16.2 19.4 12l-4.2-4.2" />
            <path d="M19.1 12H9.8" />
          </svg>
        </button>
      </div>
    </details>
  );
}

type SidebarSearchProps = {
  count: number;
  onChange: Dispatch<SetStateAction<string>>;
  placeholder: string;
  value: string;
};

function SidebarSearch({
  count,
  onChange,
  placeholder,
  value,
}: SidebarSearchProps) {
  return (
    <label className="sidebar-search">
      <span>Pesquisar</span>
      <div className="sidebar-search-row">
        <i className="search-lens" aria-hidden="true" />
        <input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <small>{count} atalhos</small>
    </label>
  );
}

type EnvironmentPickerProps = {
  activeEnvironment: NavigationEnvironment;
  environments: NavigationEnvironment[];
  onClose: () => void;
  onSelect: (environmentId: EnvironmentId) => void;
};

function EnvironmentPicker({
  activeEnvironment,
  environments,
  onClose,
  onSelect,
}: EnvironmentPickerProps) {
  return (
    <div className="environment-backdrop" role="presentation">
      <section
        aria-labelledby="environment-title"
        aria-modal="true"
        className="environment-modal"
        role="dialog"
      >
        <div className="environment-modal-header">
          <div>
            <p className="eyebrow">Alteracao de Ambiente</p>
            <h2 id="environment-title">Escolha onde quer trabalhar</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Cancelar
          </button>
        </div>

        <div className="environment-card-grid">
          {environments.map((environment) => (
            <button
              className={`environment-card ${environment.toneClass} ${
                activeEnvironment.id === environment.id ? 'is-active' : ''
              }`}
              key={environment.id}
              onClick={() => onSelect(environment.id)}
              type="button"
            >
              <span className="environment-symbol">{environment.symbol}</span>
              <strong>{environment.label}</strong>
              <small>{environment.hint}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

type EnvironmentTransitionProps = {
  environment: NavigationEnvironment | null;
};

function EnvironmentTransition({ environment }: EnvironmentTransitionProps) {
  if (!environment) {
    return null;
  }

  return (
    <div className={`environment-transition ${environment.toneClass}`}>
      <span>Entrando em</span>
      <strong>{environment.label}</strong>
      <small>{environment.hint}</small>
      <div className="environment-transition-bar" />
    </div>
  );
}
