import React, { useState, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  Calculator, 
  BookPlus, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Layers
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { calculateProfit, formatBRL, formatPercent } from '../utils/formatters';

interface ItemFormViewProps {
  initialItem?: InventoryItem | null;
  onSave: (itemData: Partial<InventoryItem>) => Promise<void>;
  onCancel: () => void;
}

const COMMON_CATEGORIES = [
  'Ficção Clássica',
  'Literatura Brasileira',
  'Distopia & Ficção',
  'Fantasia & Épico',
  'Romance Contemporâneo',
  'Clássicos Universais',
  'Ficção & Filosofia',
  'Realismo Mágico',
  'Ficção Científica',
  'Poesia',
  'Biografia & Memórias',
  'História & Humanidades',
  'Artes & Design',
];

export const ItemFormView: React.FC<ItemFormViewProps> = ({
  initialItem,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialItem);

  const [nome, setNome] = useState('');
  const [autor, setAutor] = useState('');
  const [categoria, setCategoria] = useState('Ficção Clássica');
  const [isbn, setIsbn] = useState('');
  const [quantidade, setQuantidade] = useState<string>('10');
  const [valorCusto, setValorCusto] = useState<string>('25.00');
  const [valorRevenda, setValorRevenda] = useState<string>('59.90');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Carregar dados no modo edição
  useEffect(() => {
    if (initialItem) {
      setNome(initialItem.nome || '');
      setAutor(initialItem.autor || '');
      setCategoria(initialItem.categoria || 'Ficção Clássica');
      setIsbn(initialItem.isbn || '');
      setQuantidade(String(initialItem.quantidade));
      setValorCusto(String(initialItem.valor_custo));
      setValorRevenda(String(initialItem.valor_revenda));
    }
  }, [initialItem]);

  // CÁLCULO AUTOMÁTICO DE LUCRO EM TEMPO REAL:
  // Valor de lucro = Valor de revenda - Valor de custo
  const parsedCusto = Math.max(0, parseFloat(valorCusto.replace(',', '.')) || 0);
  const parsedRevenda = Math.max(0, parseFloat(valorRevenda.replace(',', '.')) || 0);
  const parsedQuantidade = Math.max(0, parseInt(quantidade, 10) || 0);

  const { valor_lucro, margem_lucro } = calculateProfit(parsedRevenda, parsedCusto);
  const lucroTotalEstoque = valor_lucro * parsedQuantidade;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome ou título do item.');
      return;
    }

    if (parsedRevenda < parsedCusto) {
      const confirmLow = window.confirm(
        'Atenção: O valor de revenda é menor que o valor de custo (prejuízo unitário). Deseja continuar mesmo assim?'
      );
      if (!confirmLow) return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialItem?.id,
        nome: nome.trim(),
        autor: autor.trim(),
        categoria: categoria.trim(),
        isbn: isbn.trim(),
        quantidade: parsedQuantidade,
        valor_custo: parsedCusto,
        valor_revenda: parsedRevenda,
        valor_lucro,
        margem_lucro,
      });

      setSuccessMessage(isEditing ? 'Item atualizado com sucesso!' : 'Item cadastrado com sucesso no acervo!');
      setTimeout(() => {
        onCancel();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar item no estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="p-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition cursor-pointer"
            title="Voltar ao estoque"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif-book font-bold text-stone-900 tracking-tight">
              {isEditing ? 'Editar Produto do Acervo' : 'Cadastrar Novo Item'}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {isEditing
                ? 'Atualize os valores e informações cadastrais'
                : 'Insira os dados do item com cálculo de lucro automático'}
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          type="button"
          className="text-xs text-stone-500 hover:text-stone-800 transition"
        >
          Cancelar
        </button>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Dados do Formulário */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl border border-stone-200/90 shadow-xs space-y-5">
          {/* Nome do Item */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Nome do Item / Título da Obra *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Dom Casmurro, 1984, Box Trilogia..."
              className="mt-1.5 block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
            />
          </div>

          {/* Autor e ISBN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Autor ou Editora
              </label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex: Machado de Assis"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                ISBN / Código do Item
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Ex: 978-85-359-0277-8"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono-numbers text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
              />
            </div>
          </div>

          {/* Categoria e Volume em Estoque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Categoria / Gênero
              </label>
              <div className="mt-1.5">
                <input
                  type="text"
                  list="category-suggestions"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Selecione ou digite..."
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                />
                <datalist id="category-suggestions">
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Volume / Quantidade em Estoque *
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="0"
                  className="block w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono-numbers text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-stone-400 pointer-events-none">
                  unidades
                </span>
              </div>
            </div>
          </div>

          {/* Valores Financeiros */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Precificação & Custos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Valor de Custo (R$) *
                </label>
                <div className="mt-1.5 relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono-numbers text-stone-500 pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={valorCusto}
                    onChange={(e) => setValorCusto(e.target.value)}
                    placeholder="0.00"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono-numbers text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Preço pago ao fornecedor/distribuidor</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Valor de Revenda (R$) *
                </label>
                <div className="mt-1.5 relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono-numbers text-stone-500 pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={valorRevenda}
                    onChange={(e) => setValorRevenda(e.target.value)}
                    placeholder="0.00"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-mono-numbers text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Preço final de venda ao consumidor</p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg border border-stone-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>{isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Item' : 'Cadastrar no Estoque'}</span>
            </button>
          </div>
        </div>

        {/* Coluna 3: Painel de Cálculo Automático do Lucro */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-amber-300/80 bg-gradient-to-br from-white to-amber-50/30 shadow-xs">
            <div className="flex items-center gap-2 text-stone-800 font-semibold text-xs uppercase tracking-wider mb-4">
              <Calculator className="w-4 h-4 text-amber-800" />
              <span>Cálculo Automático de Lucro</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs text-stone-600">
                <span>Valor de Revenda:</span>
                <span className="font-mono-numbers font-medium text-stone-900">{formatBRL(parsedRevenda)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-600">
                <span>Valor de Custo:</span>
                <span className="font-mono-numbers font-medium text-stone-900">-{formatBRL(parsedCusto)}</span>
              </div>

              <div className="h-px bg-stone-200" />

              {/* FÓRMULA ESPECIFICADA: Valor de lucro = Valor de revenda - Valor de custo */}
              <div className="p-3.5 rounded-lg bg-white border border-stone-200 shadow-xs">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
                  Valor de Lucro Unitário
                </span>
                <div className={`text-2xl font-bold font-mono-numbers mt-1 ${valor_lucro >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                  {formatBRL(valor_lucro)}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Margem percentual:</span>
                  <span className={`font-mono-numbers font-bold ${margem_lucro >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatPercent(margem_lucro)}
                  </span>
                </div>
              </div>

              {/* Projeção para o lote total */}
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200/80">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Exemplares no lote:</span>
                  <span className="font-mono-numbers font-bold text-stone-900">{parsedQuantidade} un.</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600 mt-2">
                  <span>Investimento no lote:</span>
                  <span className="font-mono-numbers text-stone-800">{formatBRL(parsedCusto * parsedQuantidade)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600 mt-1">
                  <span>Receita bruta estimada:</span>
                  <span className="font-mono-numbers text-stone-800">{formatBRL(parsedRevenda * parsedQuantidade)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900 mt-2 pt-2 border-t border-stone-200">
                  <span>Lucro projetado no lote:</span>
                  <span className="font-mono-numbers text-emerald-800 font-bold">{formatBRL(lucroTotalEstoque)}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 italic leading-relaxed">
                * O lucro unitário e a margem são recalculados instantaneamente a cada dígito inserido nos campos de custo e revenda.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
