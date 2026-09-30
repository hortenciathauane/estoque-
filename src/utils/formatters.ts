/**
 * Utilitários de formatação para moeda brasileira (BRL), números e cálculos de estoque
 */

export function formatBRL(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR').format(num);
}

export function formatPercent(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return `${num.toFixed(1).replace('.', ',')}%`;
}

export function calculateProfit(valorRevenda: number, valorCusto: number) {
  const revenda = Math.max(0, Number(valorRevenda) || 0);
  const custo = Math.max(0, Number(valorCusto) || 0);
  const valor_lucro = +(revenda - custo).toFixed(2);
  const margem_lucro = revenda > 0 ? +((valor_lucro / revenda) * 100).toFixed(2) : 0;

  return {
    valor_lucro,
    margem_lucro,
  };
}
