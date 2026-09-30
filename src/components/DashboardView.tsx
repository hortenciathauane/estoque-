import React from 'react';
import { 
  BookCopy, 
  Layers, 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  Percent,
  PlusCircle
} from 'lucide-react';
import { InventoryItem, InventorySummary } from '../types/inventory';
import { formatBRL, formatNumber, formatPercent } from '../utils/formatters';

interface DashboardViewProps {
  summary: InventorySummary;
  items: InventoryItem[];
  onNavigate: (tab: 'dashboard' | 'estoque' | 'cadastrar') => void;
  onFilterLowStock: () => void;
  onOpenChat: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  items,
  onNavigate,
  onFilterLowStock,
  onOpenChat,
}) => {
  // Itens com maior potencial de retorno
  const topProfitItems = [...items]
    .sort((a, b) => b.valor_lucro - a.valor_lucro)
    .slice(0, 4);

  // Itens com estoque crítico
  const lowStockItems = items.filter(it => it.quantidade <= 5);

  // Distribuição por categoria
  const categoriesMap = items.reduce((acc, it) => {
    const cat = it.categoria || 'Geral';
    acc[cat] = (acc[cat] || 0) + it.quantidade;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoriesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Editorial Header / Bookstore Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 text-stone-100 shadow-xs">
        <img
          src="/src/assets/images/bookstore_ambiance_1790790187989.jpg"
          alt="Acervo da Livraria"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          referrerPolicy="no-referrer"
        />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
              Painel de Gestão · Livraria & Acervo
            </span>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-serif-book font-bold text-white tracking-tight">
              Visão Geral do Estoque
            </h1>
            <p className="mt-2 text-sm text-stone-300 leading-relaxed">
              Monitore volumes, giro de títulos, custo de aquisição, projeção de receita e margem líquida com inteligência integrada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('cadastrar')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Item</span>
            </button>
            <button
              onClick={onOpenChat}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800/90 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs sm:text-sm font-medium rounded-lg transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Consulte Aqui</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 CARDS PRINCIPAIS SOLICITADOS NA ESPECIFICAÇÃO */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-900 tracking-tight">
            Indicadores Chave de Desempenho
          </h2>
          <span className="text-xs text-stone-500 font-mono-numbers">
            {summary.total_itens} títulos monitorados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total de Itens Cadastrados */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                Itens Cadastrados
              </span>
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                <BookCopy className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono-numbers text-stone-900">
                {formatNumber(summary.total_itens)}
              </div>
              <p className="mt-1 text-xs text-stone-500">Títulos ativos no acervo</p>
            </div>
          </div>

          {/* 2. Quantidade Total em Estoque */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                Volume em Estoque
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-800">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono-numbers text-stone-900">
                {formatNumber(summary.quantidade_total)}
              </div>
              <p className="mt-1 text-xs text-stone-500">Exemplares físicos disponíveis</p>
            </div>
          </div>

          {/* 3. Valor Total Investido em Estoque */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                Total Investido
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-800">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono-numbers text-stone-900">
                {formatBRL(summary.valor_total_investido)}
              </div>
              <p className="mt-1 text-xs text-stone-500">Custo total de aquisição</p>
            </div>
          </div>

          {/* 4. Valor Total de Revenda */}
          <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                Total de Revenda
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono-numbers text-stone-900">
                {formatBRL(summary.valor_total_revenda)}
              </div>
              <p className="mt-1 text-xs text-stone-500">Faturamento bruto projetado</p>
            </div>
          </div>

          {/* 5. Lucro Potencial Total */}
          <div className="bg-white p-5 rounded-xl border border-amber-300/80 bg-gradient-to-br from-white to-amber-50/40 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-900">
                Lucro Potencial Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-900">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono-numbers text-amber-950">
                {formatBRL(summary.lucro_potencial_total)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                <Percent className="w-3 h-3" />
                <span>Margem média de {formatPercent(summary.margem_media_percentual)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Secundário: Alertas e Análise de Oportunidades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Alerta de Reposição */}
        <div className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <AlertTriangle className={`w-4 h-4 ${summary.itens_estoque_baixo > 0 ? 'text-amber-600' : 'text-stone-400'}`} />
              <span>Itens para Reposição</span>
            </div>
            <button
              onClick={onFilterLowStock}
              className="text-xs font-medium text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Excelente! Nenhum item com estoque crítico no momento.
              </p>
            ) : (
              lowStockItems.slice(0, 4).map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100 hover:bg-stone-100/80 transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {it.nome}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">
                      {it.autor || it.categoria}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 text-xs font-mono-numbers font-semibold rounded bg-amber-100 text-amber-900">
                      {it.quantidade} un.
                    </span>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Lucro un: {formatBRL(it.valor_lucro)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Títulos com Maior Lucro Unitário */}
        <div className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">
              Maior Lucro Unitário
            </h3>
            <button
              onClick={() => onNavigate('estoque')}
              className="text-xs font-medium text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Tabela</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {topProfitItems.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Nenhum produto cadastrado ainda.
              </p>
            ) : (
              topProfitItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {it.nome}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono-numbers">
                      Revenda: {formatBRL(it.valor_revenda)} · Custo: {formatBRL(it.valor_custo)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono-numbers font-bold text-emerald-800">
                      +{formatBRL(it.valor_lucro)}
                    </span>
                    <p className="text-[10px] text-stone-500 font-mono-numbers">
                      {formatPercent(it.margem_lucro)} margem
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Distribuição por Categoria Literária */}
        <div className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-xs">
          <h3 className="text-sm font-semibold text-stone-900">
            Categorias Mais Representadas
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Distribuição de exemplares por gênero
          </p>

          <div className="mt-5 space-y-3.5">
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Nenhuma categoria registrada no momento.
              </p>
            ) : (
              sortedCategories.map(([category, count]) => {
                const percentage = summary.quantidade_total > 0 
                  ? (count / summary.quantidade_total) * 100 
                  : 0;

                return (
                  <div key={category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-stone-700 truncate">{category}</span>
                      <span className="font-mono-numbers text-stone-500">{count} un. ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-800 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
