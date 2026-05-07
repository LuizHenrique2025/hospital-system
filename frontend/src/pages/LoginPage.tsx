import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { normalizeLogin } from '../lib/normalizers';

type LoginFormState = {
  username: string;
  password: string;
};

type LoginScreenProps = {
  handleLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  loginForm: LoginFormState;
  setLoginForm: Dispatch<SetStateAction<LoginFormState>>;
};

export function LoginScreen({
  handleLogin,
  isSubmitting,
  loginForm,
  setLoginForm,
}: LoginScreenProps) {
  return (
    <main className="login-app-shell">
      <section className="login-shell clinic-login-shell">
        <aside className="clinic-login-visual" aria-hidden="true">
          <div className="clinic-login-photo-card">
            <div className="clinic-login-photo-overlay" />
          </div>
        </aside>

        <form className="auth-card clinic-login-card" onSubmit={handleLogin}>
          <div className="clinic-login-title">
            <img
              alt="Hospital Dia Revitalite"
              className="clinic-login-logo"
              src="/hospital-dia-revitalite-logo.png"
            />
          </div>

          <div className="clinic-field-block">
            <label className="clinic-login-field">
              <span className="clinic-password-label">Usuario</span>
              <input
                aria-label="Login"
                autoComplete="username"
                placeholder="Digite seu usuario"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    username: normalizeLogin(event.target.value),
                  }))
                }
                required
              />
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M5.8 20a6.2 6.2 0 0 1 12.4 0" />
                </svg>
              </span>
            </label>
          </div>

          <label className="clinic-password-block">
            <span className="clinic-password-input">
              <span className="clinic-password-label">Senha</span>
              <input
                aria-label="Senha"
                autoComplete="current-password"
                type="password"
                placeholder="Informe sua senha"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M7.4 10.2V8.4a4.6 4.6 0 0 1 9.2 0v1.8" />
                  <path d="M6.2 10.2h11.6v9.2H6.2Z" />
                  <path d="M12 14.1v2" />
                </svg>
              </span>
            </span>
          </label>

          <div className="clinic-login-options">
            <label className="remember-login-option">
              <span>Lembrar-me</span>
              <input type="checkbox" />
            </label>
            <button className="forgot-password-link" type="button">
              Esqueceu sua senha?
            </button>
          </div>

          <div className="clinic-login-actions">
            <button
              className="primary-button clinic-access-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Acessar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
