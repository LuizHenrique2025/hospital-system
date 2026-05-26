import { Component, type ErrorInfo, type ReactNode } from 'react';

type PageErrorBoundaryProps = {
  children: ReactNode;
};

type PageErrorBoundaryState = {
  error: Error | null;
};

export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page render failed', error, errorInfo);
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <section className="page-error-boundary" role="alert">
          <div>
            <p className="eyebrow">Falha no modulo</p>
            <h2>Nao foi possivel carregar esta tela.</h2>
            <p>
              Atualize a pagina ou acesse outro modulo pelo menu lateral
              enquanto verificamos o problema.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Atualizar tela
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
