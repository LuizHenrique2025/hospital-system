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
        <form className="auth-card clinic-login-card" onSubmit={handleLogin}>
          <div className="clinic-login-title">
            <span className="clinic-login-eyebrow">Acesso operacional</span>
            <h1>Sistema Revitalite</h1>
            <p>Entre com seu usuario e senha autorizados.</p>
          </div>

          <div className="clinic-field-block">
            <span className="clinic-password-label">Login</span>
            <label className="clinic-login-field">
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M12 12.6a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
                  <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
                </svg>
              </span>
              <span className="sr-only">Login</span>
              <input
                aria-label="Login"
                autoComplete="username"
                placeholder="Digite seu login"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    username: normalizeLogin(event.target.value),
                  }))
                }
                required
              />
              <button
                aria-label="Limpar login"
                className="login-reset-button"
                type="button"
                onClick={() =>
                  setLoginForm((current) => ({
                    ...current,
                    username: '',
                  }))
                }
              >
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M20 12a8 8 0 1 1-2.35-5.65" />
                  <path d="M20 4.8v5.1h-5.1" />
                </svg>
              </button>
            </label>
          </div>

          <label className="clinic-password-block">
            <span className="clinic-password-label">Senha</span>
            <span className="clinic-password-input">
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M8.8 14.5a3.6 3.6 0 1 1 1.75-3.1H22l-2.1 2.1 1.3 1.3-1.7 1.7-1.3-1.3-1.6 1.6-1.3-1.3h-4.75a3.6 3.6 0 0 1-1.65 1Z" />
                  <path d="M5.6 11.4h.01" />
                </svg>
              </span>
              <span className="sr-only">Senha</span>
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
            </span>
          </label>

          <button className="forgot-password-link" type="button">
            Esqueceu sua senha?
          </button>

          <div className="clinic-login-actions">
            <button
              className="primary-button clinic-access-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Acessar'}
            </button>
          </div>

          <p className="clinic-login-footnote">
            Acesso restrito aos setores autorizados do Hospital Revitalite.
          </p>
        </form>
      </section>
    </main>
  );
}
