export interface InventoryItem {
  id: string;
  nome: string;
  autor: string;
  categoria: string;
  isbn?: string;
  quantidade: number;
  valor_custo: number;
  valor_revenda: number;
  valor_lucro: number;
  margem_lucro: number;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  total_itens: number;
  quantidade_total: number;
  valor_total_investido: number;
  valor_total_revenda: number;
  lucro_potencial_total: number;
  margem_media_percentual: number;
  itens_estoque_baixo: number;
  itens_esgotados: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
}

export interface AuthSession {
  email: string;
  role: string;
  token: string;
  loggedAt: string;
}
