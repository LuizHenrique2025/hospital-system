import type React from 'react';

type OperationalSearchCardProps = {
  canSearch: boolean;
  description: string;
  error?: string;
  isLoading?: boolean;
  label?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  resultText?: string;
  title: string;
  value: string;
};

export function OperationalSearchCard({
  canSearch,
  description,
  error,
  isLoading = false,
  label = 'Consulta parametrizada',
  onChange,
  onClear,
  onSearch,
  placeholder,
  resultText,
  title,
  value,
}: OperationalSearchCardProps) {
  return (
    <form className="operational-search-card" onSubmit={onSearch}>
      <div>
        <span className="section-title">{label}</span>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <div className="operational-search-actions">
        <input
          className="search-input"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="ghost-button"
          disabled={isLoading || !canSearch}
          type="submit"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
        <button
          className="ghost-button"
          disabled={isLoading || value.length === 0}
          onClick={onClear}
          type="button"
        >
          Limpar
        </button>
      </div>
      {resultText ? <small>{resultText}</small> : null}
      {error ? <small className="form-warning">{error}</small> : null}
    </form>
  );
}
