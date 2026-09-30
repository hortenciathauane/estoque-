import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { StockTableView } from './components/StockTableView';
import { ItemFormView } from './components/ItemFormView';
import { FloatingAIChat } from './components/FloatingAIChat';
import { InventoryItem, InventorySummary, AuthSession } from './types/inventory';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    total_itens: 0,
    quantidade_total: 0,
    valor_total_investido: 0,
    valor_total_revenda: 0,
    lucro_potencial_total: 0,
    margem_media_percentual: 0,
    itens_estoque_baixo: 0,
    itens_esgotados: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockTableFilter, setStockTableFilter] = useState<string>('todos');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exibir toast temporário
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar sessão persistente
  useEffect(() => {
    try {
      const stored = localStorage.getItem('controle_estoque_session');
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erro ao ler sessão local:', e);
    }
  }, []);

  // Helper para recalcular sumário localmente
  const computeClientSummary = (itemList: InventoryItem[]): InventorySummary => {
    const total_itens = itemList.length;
    const quantidade_total = itemList.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);
    const valor_total_investido = +itemList.reduce((acc, it) => acc + ((Number(it.valor_custo) || 0) * (Number(it.quantidade) || 0)), 0).toFixed(2);
    const valor_total_revenda = +itemList.reduce((acc, it) => acc + ((Number(it.valor_revenda) || 0) * (Number(it.quantidade) || 0)), 0).toFixed(2);
    const lucro_potencial_total = +(valor_total_revenda - valor_total_investido).toFixed(2);
    const margem_media_percentual = valor_total_revenda > 0 ? +((lucro_potencial_total / valor_total_revenda) * 100).toFixed(2) : 0;
    const itens_estoque_baixo = itemList.filter(it => it.quantidade > 0 && it.quantidade <= 5).length;
    const itens_esgotados = itemList.filter(it => it.quantidade === 0).length;

    return {
      total_itens,
      quantidade_total,
      valor_total_investido,
      valor_total_revenda,
      lucro_potencial_total,
      margem_media_percentual,
      itens_estoque_baixo,
      itens_esgotados,
    };
  };

  // Buscar itens de estoque da API com cache persistido resiliente
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        const loaded = data.items || [];
        setItems(loaded);
        localStorage.setItem('controle_estoque_cached_items', JSON.stringify(loaded));
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setSummary(computeClientSummary(loaded));
        }
        return;
      }
    } catch (err) {
      console.warn('Servidor indisponível temporariamente, carregando dados do armazenamento local:', err);
    } finally {
      setIsLoading(false);
    }

    // Fallback de cache local
    const cached = localStorage.getItem('controle_estoque_cached_items');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setItems(parsed);
        setSummary(computeClientSummary(parsed));
      } catch (e) {
        console.error('Erro ao ler cache local:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchInventory();
    }
  }, [session, fetchInventory]);

  // Salvar Item (Criar ou Atualizar) com suporte resiliente
  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    const isEditing = Boolean(itemData.id);
    const url = isEditing ? `/api/items/${itemData.id}` : '/api/items';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (res.ok) {
        await fetchInventory();
        setEditingItem(null);
        showToast(isEditing ? 'Item atualizado com sucesso!' : 'Novo item cadastrado com sucesso!');
        return;
      }
    } catch (err) {
      console.warn('Falha de rede ao salvar no servidor, aplicando localmente:', err);
    }

    // Persistência local resiliente
    const custo = Math.max(0, Number(itemData.valor_custo) || 0);
    const revenda = Math.max(0, Number(itemData.valor_revenda) || 0);
    const valor_lucro = +(revenda - custo).toFixed(2);
    const margem_lucro = revenda > 0 ? +((valor_lucro / revenda) * 100).toFixed(2) : 0;

    let updatedList: InventoryItem[];
    if (isEditing) {
      updatedList = items.map((it) =>
        it.id === itemData.id
          ? {
              ...it,
              ...itemData,
              valor_custo: custo,
              valor_revenda: revenda,
              valor_lucro,
              margem_lucro,
              updated_at: new Date().toISOString(),
            } as InventoryItem
          : it
      );
    } else {
      const newItem: InventoryItem = {
        id: `liv-${Date.now()}`,
        nome: itemData.nome || 'Produto sem título',
        autor: itemData.autor || '',
        categoria: itemData.categoria || 'Geral',
        isbn: itemData.isbn || '',
        quantidade: Math.max(0, Number(itemData.quantidade) || 0),
        valor_custo: custo,
        valor_revenda: revenda,
        valor_lucro,
        margem_lucro,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedList = [newItem, ...items];
    }

    setItems(updatedList);
    setSummary(computeClientSummary(updatedList));
    localStorage.setItem('controle_estoque_cached_items', JSON.stringify(updatedList));
    setEditingItem(null);
    showToast(isEditing ? 'Item atualizado com sucesso!' : 'Novo item cadastrado com sucesso!');
  };

  // Excluir Item com suporte resiliente
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchInventory();
        showToast('Item excluído com sucesso.');
        return;
      }
    } catch (err) {
      console.warn('Falha de rede ao excluir no servidor, aplicando localmente:', err);
    }

    const updatedList = items.filter((it) => it.id !== id);
    setItems(updatedList);
    setSummary(computeClientSummary(updatedList));
    localStorage.setItem('controle_estoque_cached_items', JSON.stringify(updatedList));
    showToast('Item excluído com sucesso.');
  };

  // Atualizar Quantidade Rapidamente (+ / -)
  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    const target = items.find(it => it.id === id);
    if (!target) return;

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...target,
          quantidade: newQuantity,
        }),
      });

      if (res.ok) {
        await fetchInventory();
        return;
      }
    } catch (err) {
      console.warn('Falha ao atualizar quantidade no servidor, aplicando localmente:', err);
    }

    const updatedList = items.map((it) =>
      it.id === id
        ? { ...it, quantidade: newQuantity, updated_at: new Date().toISOString() }
        : it
    );
    setItems(updatedList);
    setSummary(computeClientSummary(updatedList));
    localStorage.setItem('controle_estoque_cached_items', JSON.stringify(updatedList));
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setActiveTab('cadastrar');
  };

  const handleFilterLowStockFromDashboard = () => {
    setStockTableFilter('baixo');
    setActiveTab('estoque');
  };

  const handleLogout = () => {
    localStorage.removeItem('controle_estoque_session');
    setSession(null);
    setActiveTab('dashboard');
    setIsChatOpen(false);
  };

  // Se não autenticado, exibir tela de Login
  if (!session) {
    return <LoginScreen onLoginSuccess={setSession} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-stone-800">
      {/* Navbar Superior com Contrato de 3 Zonas */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'cadastrar') {
            setEditingItem(null);
          }
          if (tab === 'estoque') {
            setStockTableFilter('todos');
          }
          setActiveTab(tab);
        }}
        userEmail={session.email}
        onLogout={handleLogout}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-40 bg-stone-900 text-amber-50 px-4 py-3 rounded-xl shadow-lg border border-stone-800 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            items={items}
            onNavigate={(tab) => {
              if (tab === 'cadastrar') setEditingItem(null);
              setActiveTab(tab);
            }}
            onFilterLowStock={handleFilterLowStockFromDashboard}
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}

        {activeTab === 'estoque' && (
          <StockTableView
            items={items}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onUpdateQuantity={handleUpdateQuantity}
            onNavigateToCreate={() => {
              setEditingItem(null);
              setActiveTab('cadastrar');
            }}
            initialFilterStatus={stockTableFilter}
          />
        )}

        {activeTab === 'cadastrar' && (
          <ItemFormView
            initialItem={editingItem}
            onSave={handleSaveItem}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab('estoque');
            }}
          />
        )}
      </main>

      {/* Chat Flutuante do Agente de IA "Consulte Aqui" */}
      <FloatingAIChat
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        totalItemsCount={items.length}
      />

      {/* Rodapé Institucional */}
      <footer className="border-t border-stone-200 py-6 bg-white/50 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Controle de Estoque &copy; {new Date().getFullYear()} · Livraria & Acervo</span>
          <span className="font-mono-numbers">Gestão Inteligente & Acervo Literário</span>
        </div>
      </footer>
    </div>
  );
}
