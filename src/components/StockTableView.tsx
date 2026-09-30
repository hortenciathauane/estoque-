import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  Plus, 
  Minus, 
  Download, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { formatBRL, formatNumber, formatPercent } from '../utils/formatters';

interface StockTableViewProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateQuantity: (id: string, newQuantity: number) => Promise<void>;
  onNavigateToCreate: () => void;
  initialFilterStatus?: string;
}

export const StockTableView: React.FC<StockTableViewProps> = ({
  items,
  onEditItem,
  onDeleteItem,
  onUpdateQuantity,
  onNavigateToCreate,
  initialFilterStatus = 'todos',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [stockStatus, setStockStatus] = useState<string>(initialFilterStatus);
  const [sortBy, setSortBy] = useState<string>('nome_asc');
  
  // Confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extrair categorias únicas
  const categories = useMemo(() => {
    const set = new Set(items.map(it => it.categoria || 'Geral'));
    return ['todas', ...Array.from(set)];
  }, [items]);

  // Filtragem e ordenação
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // Busca textual
        const q = searchTerm.toLowerCase();
        const matchesText = 
          item.nome.toLowerCase().includes(q) ||
          item.autor.toLowerCase().includes(q) ||
          (item.isbn && item.isbn.toLowerCase().includes(q)) ||
          item.categoria.toLowerCase().includes(q);

        if (!matchesText) return false;

        // Categoria
        if (selectedCategory !== 'todas' && item.categoria !== selectedCategory) {
          return false;
        }

        // Status de Estoque
        if (stockStatus === 'baixo') {
          return item.quantidade > 0 && item.quantidade <= 5;
        }
        if (stockStatus === 'esgotado') {
          return item.quantidade === 0;
        }
        if (stockStatus === 'normal') {
          return item.quantidade > 5;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nome_asc') return a.nome.localeCompare(b.nome);
        if (sortBy === 'nome_desc') return b.nome.localeCompare(a.nome);
        if (sortBy === 'lucro_desc') return b.valor_lucro - a.valor_lucro;
        if (sortBy === 'lucro_total_desc') return (b.valor_lucro * b.quantidade) - (a.valor_lucro * a.quantidade);
        if (sortBy === 'quantidade_desc') return b.quantidade - a.quantidade;
        if (sortBy === 'quantidade_asc') return a.quantidade - b.quantidade;
        if (sortBy === 'revenda_desc') return b.valor_revenda - a.valor_revenda;
        if (sortBy === 'margem_desc') return b.margem_lucro - a.margem_lucro;
        return 0;
      });
  }, [items, searchTerm, selectedCategory, stockStatus, sortBy]);

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Autor', 'Categoria', 'ISBN', 'Quantidade', 'Valor Custo (R$)', 'Valor Revenda (R$)', 'Valor Lucro (R$)', 'Margem Lucro (%)', 'Lucro Total em Estoque (R$)'];
    const rows = filteredAndSortedItems.map(it => [
      `"${it.id}"`,
      `"${it.nome.replace(/"/g, '""')}"`,
      `"${it.autor.replace(/"/g, '""')}"`,
      `"${it.categoria}"`,
      `"${it.isbn || ''}"`,
      it.quantidade,
      it.valor_custo.toFixed(2),
      it.valor_revenda.toFixed(2),
      it.valor_lucro.toFixed(2),
      it.margem_lucro.toFixed(2),
      (it.valor_lucro * it.quantidade).toFixed(2),
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `controle_estoque_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Tabela com Controles e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif-book font-bold text-stone-900 tracking-tight">
            Acervo e Estoque
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gerenciamento completo de produtos, lucros calculados e reposições
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition cursor-pointer shadow-xs"
            title="Exportar planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onNavigateToCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-200" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-xs flex flex-col lg:flex-row gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, autor, gênero ou ISBN..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros em Linha */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Categoria */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'todas' ? 'Todas as Categorias' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status de Estoque */}
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="py-2 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30"
          >
            <option value="todos">Todos os Níveis</option>
            <option value="normal">Estoque Normal (&gt; 5)</option>
            <option value="baixo">Estoque Baixo (≤ 5)</option>
            <option value="esgotado">Esgotado (0)</option>
          </select>

          {/* Ordenação */}
          <div className="flex items-center gap-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30"
            >
              <option value="nome_asc">Nome (A - Z)</option>
              <option value="nome_desc">Nome (Z - A)</option>
              <option value="lucro_desc">Maior Lucro Unitário</option>
              <option value="lucro_total_desc">Maior Lucro Total Acumulado</option>
              <option value="margem_desc">Maior Margem (%)</option>
              <option value="quantidade_desc">Maior Volume em Estoque</option>
              <option value="quantidade_asc">Menor Volume (Reposição)</option>
              <option value="revenda_desc">Maior Valor de Revenda</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Item & Detalhes</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-center">Volume em Estoque</th>
                <th className="py-3 px-4 text-right">Valor de Custo</th>
                <th className="py-3 px-4 text-right">Valor de Revenda</th>
                <th className="py-3 px-4 text-right">Lucro Unitário</th>
                <th className="py-3 px-4 text-right">Lucro Total</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-700">Nenhum item encontrado</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Tente ajustar os filtros ou cadastre um novo produto no acervo.
                    </p>
                    <button
                      onClick={onNavigateToCreate}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Item Agora
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const isLow = item.quantidade > 0 && item.quantidade <= 5;
                  const isZero = item.quantidade === 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      {/* Nome do Item */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900 text-xs sm:text-sm">
                          {item.nome}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                          {item.autor && <span>{item.autor}</span>}
                          {item.autor && item.isbn && <span aria-hidden="true">·</span>}
                          {item.isbn && <span className="font-mono-numbers">ISBN: {item.isbn}</span>}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 text-stone-600">
                        <span className="text-xs text-stone-700">
                          {item.categoria}
                        </span>
                      </td>

                      {/* Quantidade com ajuste rápido (+ / -) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg p-1">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantidade - 1))}
                            disabled={item.quantidade === 0}
                            title="Diminuir unidade"
                            className="p-1 hover:bg-stone-200 rounded text-stone-600 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <span
                            className={`px-2 font-mono-numbers text-xs font-bold min-w-[32px] text-center ${
                              isZero
                                ? 'text-red-700'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-stone-900'
                            }`}
                          >
                            {formatNumber(item.quantidade)}
                          </span>

                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantidade + 1)}
                            title="Adicionar unidade"
                            className="p-1 hover:bg-stone-200 rounded text-stone-600 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Rótulo de status sem pílulas espalhafatosas */}
                        {isLow && (
                          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                            Estoque baixo
                          </div>
                        )}
                        {isZero && (
                          <div className="text-[10px] text-red-700 font-medium mt-0.5">
                            Esgotado
                          </div>
                        )}
                      </td>

                      {/* Valor de Custo */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers text-stone-600">
                        {formatBRL(item.valor_custo)}
                      </td>

                      {/* Valor de Revenda */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-medium text-stone-900">
                        {formatBRL(item.valor_revenda)}
                      </td>

                      {/* Valor de Lucro (Calculado Automaticamente) */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers">
                        <div className="font-bold text-emerald-800">
                          {formatBRL(item.valor_lucro)}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {formatPercent(item.margem_lucro)}
                        </div>
                      </td>

                      {/* Lucro Total no Estoque */}
                      <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-stone-800">
                        {formatBRL(item.valor_lucro * item.quantidade)}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onEditItem(item)}
                            title="Editar Item"
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            title="Excluir Item"
                            className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com totais parciais da filtragem */}
        <div className="px-4 py-3 bg-stone-50/80 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-600 gap-2">
          <div>
            Mostrando <span className="font-semibold text-stone-900 font-mono-numbers">{filteredAndSortedItems.length}</span> de <span className="font-semibold text-stone-900 font-mono-numbers">{items.length}</span> itens cadastrados
          </div>
          <div className="flex items-center gap-4 font-mono-numbers">
            <span>
              Volume Total: <strong>{formatNumber(filteredAndSortedItems.reduce((acc, it) => acc + it.quantidade, 0))}</strong> un.
            </span>
            <span>
              Lucro Estimado: <strong className="text-emerald-800">{formatBRL(filteredAndSortedItems.reduce((acc, it) => acc + (it.valor_lucro * it.quantidade), 0))}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center gap-3 text-red-700">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Excluir Produto do Estoque
                </h3>
                <p className="text-xs text-stone-500">
                  Esta ação removerá o item permanentemente do acervo.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
              <p className="font-semibold text-stone-900">{itemToDelete.nome}</p>
              <p className="text-stone-500 font-mono-numbers mt-0.5">
                Quantidade em estoque: {itemToDelete.quantidade} unidades · Lucro unitário: {formatBRL(itemToDelete.valor_lucro)}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg border border-stone-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
