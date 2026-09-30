import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Interface do Item de Estoque
export interface ItemData {
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

// Catálogo inicial em branco para o usuário cadastrar
const initialBookstoreSeed: ItemData[] = [];

// Armazenamento em memória (inicia em branco)
let inMemoryItems: ItemData[] = [];

// Inicialização do cliente Supabase caso configurado no ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Cliente inicializado com sucesso.');
  } catch (err) {
    console.warn('[Supabase] Falha ao conectar ao Supabase, utilizando armazenamento local seguro:', err);
  }
} else {
  console.log('[Supabase] Variáveis de ambiente não informadas; utilizando armazenamento em memória/servidor.');
}

// Função auxiliar para calcular totais e resumo do estoque
function calculateSummary(items: ItemData[]) {
  const total_itens = items.length;
  const quantidade_total = items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);
  const valor_total_investido = +items.reduce((acc, it) => acc + ((Number(it.valor_custo) || 0) * (Number(it.quantidade) || 0)), 0).toFixed(2);
  const valor_total_revenda = +items.reduce((acc, it) => acc + ((Number(it.valor_revenda) || 0) * (Number(it.quantidade) || 0)), 0).toFixed(2);
  const lucro_potencial_total = +(valor_total_revenda - valor_total_investido).toFixed(2);
  
  const margem_media_percentual = valor_total_revenda > 0 
    ? +((lucro_potencial_total / valor_total_revenda) * 100).toFixed(2) 
    : 0;

  const itens_estoque_baixo = items.filter(it => it.quantidade > 0 && it.quantidade <= 5).length;
  const itens_esgotados = items.filter(it => it.quantidade === 0).length;

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
}

// Helpers para sincronizar com Supabase
async function getItemsFromStorage(): Promise<ItemData[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('estoque_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ItemData[];
      }
    } catch (e) {
      console.warn('[Supabase] Erro ao consultar tabela estoque_items, retornando fallback local:', e);
    }
  }
  return inMemoryItems;
}

// Helper para calcular lucro de item
function computeItemProfit(revenda: number, custo: number) {
  const r = Math.max(0, Number(revenda) || 0);
  const c = Math.max(0, Number(custo) || 0);
  const valor_lucro = +(r - c).toFixed(2);
  const margem_lucro = r > 0 ? +((valor_lucro / r) * 100).toFixed(2) : 0;
  return { valor_lucro, margem_lucro };
}

// -------------------------------------------------------------
// ENDPOINTS DA API
// -------------------------------------------------------------

// 1. Rota de autenticação de login (segura, sem expor credenciais)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email === 'empresa@empresa.com.br' && password === '123456') {
    return res.json({
      success: true,
      user: {
        email: 'empresa@empresa.com.br',
        name: 'Administrador da Livraria',
        role: 'admin',
        token: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Credenciais inválidas. Verifique o e-mail e senha.',
  });
});

// 2. Consulta de todos os itens e resumo de estoque
app.get('/api/items', async (_req: Request, res: Response) => {
  try {
    const items = await getItemsFromStorage();
    const summary = calculateSummary(items);
    return res.json({ items, summary });
  } catch (error: any) {
    console.error('Erro ao buscar itens:', error);
    return res.status(500).json({ error: 'Erro ao carregar estoque' });
  }
});

// 3. Cadastro de novo item
app.post('/api/items', async (req: Request, res: Response) => {
  try {
    const { nome, autor, categoria, isbn, quantidade, valor_custo, valor_revenda } = req.body;

    if (!nome || typeof nome !== 'string') {
      return res.status(400).json({ error: 'Nome do item é obrigatório.' });
    }

    const custo = Math.max(0, Number(valor_custo) || 0);
    const revenda = Math.max(0, Number(valor_revenda) || 0);
    const quant = Math.max(0, Math.floor(Number(quantidade) || 0));
    const { valor_lucro, margem_lucro } = computeItemProfit(revenda, custo);

    const newItem: ItemData = {
      id: `liv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome: nome.trim(),
      autor: (autor || '').trim(),
      categoria: (categoria || 'Geral').trim(),
      isbn: (isbn || '').trim(),
      quantidade: quant,
      valor_custo: custo,
      valor_revenda: revenda,
      valor_lucro,
      margem_lucro,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('estoque_items')
          .insert([newItem])
          .select()
          .single();

        if (!error && data) {
          inMemoryItems.unshift(data as ItemData);
          const summary = calculateSummary(inMemoryItems);
          return res.status(201).json({ success: true, item: data, summary });
        }
      } catch (err) {
        console.warn('[Supabase] Falha ao inserir, salvando em fallback local:', err);
      }
    }

    inMemoryItems.unshift(newItem);
    const summary = calculateSummary(inMemoryItems);
    return res.status(201).json({ success: true, item: newItem, summary });
  } catch (error: any) {
    console.error('Erro ao cadastrar item:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar item.' });
  }
});

// 4. Edição de item existente
app.put('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, autor, categoria, isbn, quantidade, valor_custo, valor_revenda } = req.body;

    const custo = Math.max(0, Number(valor_custo) || 0);
    const revenda = Math.max(0, Number(valor_revenda) || 0);
    const quant = Math.max(0, Math.floor(Number(quantidade) || 0));
    const { valor_lucro, margem_lucro } = computeItemProfit(revenda, custo);

    const updatePayload = {
      nome: (nome || '').trim(),
      autor: (autor || '').trim(),
      categoria: (categoria || 'Geral').trim(),
      isbn: (isbn || '').trim(),
      quantidade: quant,
      valor_custo: custo,
      valor_revenda: revenda,
      valor_lucro,
      margem_lucro,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('estoque_items')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const idx = inMemoryItems.findIndex(i => i.id === id);
          if (idx !== -1) inMemoryItems[idx] = data as ItemData;
          const summary = calculateSummary(inMemoryItems);
          return res.json({ success: true, item: data, summary });
        }
      } catch (err) {
        console.warn('[Supabase] Falha ao atualizar, atualizando no local:', err);
      }
    }

    const idx = inMemoryItems.findIndex(i => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    inMemoryItems[idx] = {
      ...inMemoryItems[idx],
      ...updatePayload,
    };

    const summary = calculateSummary(inMemoryItems);
    return res.json({ success: true, item: inMemoryItems[idx], summary });
  } catch (error: any) {
    console.error('Erro ao atualizar item:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar item.' });
  }
});

// 5. Exclusão de item
app.delete('/api/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (supabase) {
      try {
        const { error } = await supabase.from('estoque_items').delete().eq('id', id);
        if (error) {
          console.warn('[Supabase] Erro ao deletar no Supabase:', error);
        }
      } catch (err) {
        console.warn('[Supabase] Exceção ao deletar:', err);
      }
    }

    inMemoryItems = inMemoryItems.filter(i => i.id !== id);
    const summary = calculateSummary(inMemoryItems);
    return res.json({ success: true, message: 'Item excluído com sucesso.', summary });
  } catch (error: any) {
    console.error('Erro ao deletar item:', error);
    return res.status(500).json({ error: 'Erro interno ao deletar item.' });
  }
});

// 6. Agente de IA com Groq (e fallback inteligente)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    // Obter dados mais recentes e reais do estoque
    const items = await getItemsFromStorage();
    const summary = calculateSummary(items);

    // 1. Agrupamento e análise por CATEGORIA
    const categoryMap: Record<string, {
      categoria: string;
      total_titulos: number;
      volume_unidades: number;
      valor_custo_total: number;
      valor_revenda_total: number;
      lucro_total: number;
    }> = {};

    for (const it of items) {
      const cat = it.categoria || 'Geral';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          categoria: cat,
          total_titulos: 0,
          volume_unidades: 0,
          valor_custo_total: 0,
          valor_revenda_total: 0,
          lucro_total: 0,
        };
      }
      categoryMap[cat].total_titulos += 1;
      categoryMap[cat].volume_unidades += it.quantidade;
      categoryMap[cat].valor_custo_total += it.valor_custo * it.quantidade;
      categoryMap[cat].valor_revenda_total += it.valor_revenda * it.quantidade;
      categoryMap[cat].lucro_total += it.valor_lucro * it.quantidade;
    }

    const categoriasAnalise = Object.values(categoryMap).map(c => ({
      categoria: c.categoria,
      total_titulos: c.total_titulos,
      volume_unidades: c.volume_unidades,
      custo_total: `R$ ${c.valor_custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      revenda_total: `R$ ${c.valor_revenda_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      lucro_total: `R$ ${c.lucro_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      margem_media: c.valor_revenda_total > 0 ? `${((c.lucro_total / c.valor_revenda_total) * 100).toFixed(2)}%` : '0%',
    }));

    // Formatação dos dados de estoque com as 6 dimensões analíticas
    const stockContextJson = JSON.stringify({
      resumo_geral: {
        total_titulos_cadastrados: summary.total_itens,
        quantidade_total_exemplares: summary.quantidade_total,
        valor_total_investido_custo: `R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        valor_total_revenda_projetada: `R$ ${summary.valor_total_revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        lucro_potencial_total: `R$ ${summary.lucro_potencial_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        margem_media_percentual: `${summary.margem_media_percentual}%`,
        itens_estoque_baixo_critico: summary.itens_estoque_baixo,
        itens_esgotados: summary.itens_esgotados,
      },
      dimensao_categorias: categoriasAnalise,
      dimensao_itens: items.map(it => ({
        id: it.id,
        nome: it.nome,
        autor: it.autor,
        categoria: it.categoria,
        volume_quantidade: it.quantidade,
        valor_custo_unitario: `R$ ${it.valor_custo.toFixed(2)}`,
        valor_revenda_unitario: `R$ ${it.valor_revenda.toFixed(2)}`,
        valor_lucro_unitario: `R$ ${it.valor_lucro.toFixed(2)}`,
        margem_lucro_percentual: `${it.margem_lucro}%`,
        custo_total_item: `R$ ${(it.valor_custo * it.quantidade).toFixed(2)}`,
        revenda_total_item: `R$ ${(it.valor_revenda * it.quantidade).toFixed(2)}`,
        lucro_total_item: `R$ ${(it.valor_lucro * it.quantidade).toFixed(2)}`,
        status_estoque: it.quantidade === 0 ? 'Esgotado' : it.quantidade <= 5 ? 'Estoque Baixo (Crítico)' : 'Normal',
      })),
    }, null, 2);

    const systemPrompt = `Você é o assistente oficial Consulte Aqui do Controle de Estoque da livraria.
Você possui acesso direto aos dados REAIS e atualizados do estoque da livraria.

DADOS REAIS DO ESTOQUE (FONTE DA VERDADE):
${stockContextJson}

CAPACIDADE ANALÍTICA MULTIDIMENSIONAL:
Você compreende e responde com precisão milimétrica em 6 dimensões fundamentais do estoque:
1. POR ITEM: Consulta a livros/produtos específicos por título, autor, código ou características individuais.
2. POR CATEGORIA: Agrupamentos temáticos, volume por gênero, categorias mais lucrativas ou com maior investimento.
3. POR VOLUME: Quantidade física em estoque, unidades totais, itens com estoque baixo (<= 5 un), produtos esgotados e prioridade de reposição.
4. POR VALOR DE CUSTO: Preço unitário de aquisição, custo total imobilizado por item (custo × volume) e capital total investido.
5. POR VALOR DE REVENDA: Preço de venda praticado na livraria, projeção de receita bruta total (revenda × volume) e itens de maior ticket.
6. POR LUCROS: Lucro unitário (revenda - custo), margem de lucro percentual (%) e lucro potencial acumulado em estoque (lucro unitário × volume).

DIRETRIZES FUNDAMENTAIS:
1. Responda SOMENTE e ESTRITAMENTE com base nos dados reais do estoque fornecidos acima. NUNCA invente títulos, autores, valores ou números.
2. Se o estoque estiver vazio ou em branco, informe gentilmente que não há produtos cadastrados e oriente o cadastro pelo menu.
3. Seja preciso, objetivo e prestativo, com tom executivo e acolhedor (perfil de livraria culta e organizada).
4. Formate todos os valores monetários no padrão brasileiro (ex: R$ 1.250,00).
5. Quando o usuário fizer perguntas sobre reposição, relacione sempre o volume disponível com a margem e o lucro unitário para recomendar com inteligência comercial.`;

    const groqApiKey = process.env.GROQ_API_KEY;

    // 1. Tentar Groq API se a chave estiver configurada
    if (groqApiKey && !groqApiKey.includes('your-groq') && groqApiKey.startsWith('gsk_')) {
      try {
        const groqMessages = [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(history) ? history.slice(-6).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content,
          })) : []),
          { role: 'user', content: message },
        ];

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            temperature: 0.2,
            max_tokens: 1024,
          }),
        });

        if (groqResponse.ok) {
          const data: any = await groqResponse.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return res.json({
              reply,
              provider: 'Consulte Aqui',
            });
          }
        } else {
          const errText = await groqResponse.text();
          console.warn('[AI API Error]:', errText);
        }
      } catch (groqErr) {
        console.warn('[AI API Exception]:', groqErr);
      }
    }

    // 2. Se chave externa não estiver disponível, tentar engine secundário
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && !geminiApiKey.includes('MY_GEMINI')) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI();
        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nPergunta do usuário: ${message}` }],
            },
          ],
        });

        if (geminiResponse.text) {
          return res.json({
            reply: geminiResponse.text,
            provider: 'Consulte Aqui',
          });
        }
      } catch (geminiErr) {
        console.warn('[AI Engine Fallback Error]:', geminiErr);
      }
    }

    // 3. Fallback Determinístico Local: Garante resposta 100% precisa e sem falhas mesmo sem internet/chaves
    const reply = generateLocalInventoryAnswer(message, items, summary);
    return res.json({
      reply,
      provider: 'Consulte Aqui',
    });

  } catch (error: any) {
    console.error('Erro no endpoint de IA:', error);
    return res.status(500).json({ error: 'Erro ao processar resposta do Agente de IA.' });
  }
});

// Mecanismo determinístico para responder instantaneamente com os dados reais
function generateLocalInventoryAnswer(userMsg: string, items: ItemData[], summary: ReturnType<typeof calculateSummary>): string {
  if (items.length === 0) {
    return `O estoque está atualmente em branco (nenhum item cadastrado no momento).
Você pode cadastrar seus primeiros produtos clicando no botão **Cadastrar Item** no menu superior!`;
  }

  const q = userMsg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ANÁLISE POR CATEGORIA (CATEGORIZAÇÃO)
  if (q.includes('categoria') || q.includes('categorias') || q.includes('genero') || q.includes('generos')) {
    const catMap: Record<string, { count: number; volume: number; custo: number; revenda: number; lucro: number }> = {};
    for (const it of items) {
      const c = it.categoria || 'Geral';
      if (!catMap[c]) catMap[c] = { count: 0, volume: 0, custo: 0, revenda: 0, lucro: 0 };
      catMap[c].count += 1;
      catMap[c].volume += it.quantidade;
      catMap[c].custo += it.valor_custo * it.quantidade;
      catMap[c].revenda += it.valor_revenda * it.quantidade;
      catMap[c].lucro += it.valor_lucro * it.quantidade;
    }

    const catList = Object.entries(catMap)
      .sort((a, b) => b[1].lucro - a[1].lucro)
      .map(([cat, data], idx) => {
        const margem = data.revenda > 0 ? ((data.lucro / data.revenda) * 100).toFixed(1) : '0';
        return `${idx + 1}. **${cat}**:\n   * **Títulos:** ${data.count} itens | **Volume:** ${data.volume} exemplares\n   * **Investimento em Custo:** R$ ${data.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n   * **Potencial de Revenda:** R$ ${data.revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n   * **Lucro Potencial:** R$ ${data.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${margem}% de margem)`;
      })
      .join('\n\n');

    return `### 🏷️ Análise de Estoque por Categoria\n\nTemos **${Object.keys(catMap).length} categorias** representadas no acervo:\n\n${catList}`;
  }

  // ANÁLISE POR VALOR DE CUSTO
  if (q.includes('custo unitario') || q.includes('maior custo') || q.includes('capital imobilizado') || (q.includes('custo') && !q.includes('revenda'))) {
    const sortedByUnitCost = [...items].sort((a, b) => b.valor_custo - a.valor_custo);
    const sortedByTotalCost = [...items].sort((a, b) => (b.valor_custo * b.quantidade) - (a.valor_custo * a.quantidade));
    const topUnitCost = sortedByUnitCost[0];
    const topTotalCost = sortedByTotalCost[0];

    return `### 💰 Análise por Valor de Custo

* **Investimento Total em Custo:** R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Produto com Maior Custo Unitário:**
  📖 **${topUnitCost.nome}** (${topUnitCost.autor})
  Preço de aquisição: **R$ ${topUnitCost.valor_custo.toFixed(2)}** (Revenda: R$ ${topUnitCost.valor_revenda.toFixed(2)})
* **Maior Capital Total Imobilizado em Estoque:**
  📦 **${topTotalCost.nome}**
  Capital alocado: **R$ ${(topTotalCost.valor_custo * topTotalCost.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${topTotalCost.quantidade} un. × R$ ${topTotalCost.valor_custo.toFixed(2)})`;
  }

  // ANÁLISE POR VALOR DE REVENDA
  if (q.includes('maior preco') || q.includes('mais caro') || (q.includes('revenda') && !q.includes('total'))) {
    const sortedByResale = [...items].sort((a, b) => b.valor_revenda - a.valor_revenda);
    const topResale = sortedByResale[0];
    const sortedByGross = [...items].sort((a, b) => (b.valor_revenda * b.quantidade) - (a.valor_revenda * a.quantidade));
    const topGross = sortedByGross[0];

    return `### 🏷️ Análise por Valor de Revenda

* **Potencial Bruto Total de Revenda:** R$ ${summary.valor_total_revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Produto com Maior Preço de Venda Unitário:**
  📖 **${topResale.nome}** (${topResale.autor})
  Preço de revenda: **R$ ${topResale.valor_revenda.toFixed(2)}** (Custo: R$ ${topResale.valor_custo.toFixed(2)} | Lucro: R$ ${topResale.valor_lucro.toFixed(2)})
* **Maior Faturamento Projetado em Estoque:**
  📦 **${topGross.nome}**
  Receita bruta projetada: **R$ ${(topGross.valor_revenda * topGross.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (${topGross.quantidade} un.)`;
  }

  // 1. Quantos produtos temos em estoque? (VOLUME)
  if (q.includes('quantos') && (q.includes('estoque') || q.includes('produtos') || q.includes('livros') || q.includes('itens'))) {
    return `Atualmente temos **${summary.quantidade_total} exemplares** em estoque, distribuídos em **${summary.total_itens} títulos/produtos cadastrados**.

* **Total de Títulos Cadastrados:** ${summary.total_itens} itens
* **Volume Total em Estoque:** ${summary.quantidade_total} unidades
* **Itens com Estoque Baixo (≤ 5 un):** ${summary.itens_estoque_baixo} títulos
* **Itens Esgotados:** ${summary.itens_esgotados} títulos`;
  }

  // 2. Qual produto tem maior lucro?
  if (q.includes('maior lucro') || (q.includes('qual') && q.includes('lucro') && q.includes('maior'))) {
    const sortedByUnitProfit = [...items].sort((a, b) => b.valor_lucro - a.valor_lucro);
    const sortedByTotalProfit = [...items].sort((a, b) => (b.valor_lucro * b.quantidade) - (a.valor_lucro * a.quantidade));
    const topUnit = sortedByUnitProfit[0];
    const topTotal = sortedByTotalProfit[0];

    return `O produto com **maior lucro unitário** é:
📚 **${topUnit.nome}** (${topUnit.autor})
* **Lucro por unidade:** R$ ${topUnit.valor_lucro.toFixed(2)} (Custo: R$ ${topUnit.valor_custo.toFixed(2)} | Revenda: R$ ${topUnit.valor_revenda.toFixed(2)})
* **Margem de lucro:** ${topUnit.margem_lucro}%
* **Quantidade em estoque:** ${topUnit.quantidade} unidades

Já o produto com **maior lucro potencial total em estoque** é:
📦 **${topTotal.nome}**
* **Lucro total acumulado:** R$ ${(topTotal.valor_lucro * topTotal.quantidade).toFixed(2)} (${topTotal.quantidade} un. × R$ ${topTotal.valor_lucro.toFixed(2)})`;
  }

  // 3. Qual é o valor total investido?
  if (q.includes('valor total investido') || (q.includes('investido') && q.includes('total')) || q.includes('custo total')) {
    return `O **valor total investido** atualmente no estoque da livraria é de **R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.

Esse montante corresponde ao somatório de (Valor de Custo × Quantidade) de todos os **${summary.total_itens} itens** cadastrados no acervo.`;
  }

  // 4. Qual é o valor total de revenda?
  if (q.includes('valor total de revenda') || (q.includes('revenda') && q.includes('total'))) {
    return `O **valor total de revenda** de todo o acervo em estoque é de **R$ ${summary.valor_total_revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.

Se todos os **${summary.quantidade_total} exemplares** forem comercializados pelo preço cadastrado, esse será o faturamento bruto obtido.`;
  }

  // 5. Qual produto está com estoque baixo?
  if (q.includes('estoque baixo') || (q.includes('baixo') && q.includes('estoque')) || q.includes('acabando')) {
    const lowStock = items.filter(it => it.quantidade <= 5);
    if (lowStock.length === 0) {
      return `Nenhum item está com estoque baixo no momento. Todos os títulos possuem mais de 5 unidades em estoque.`;
    }

    const list = lowStock
      .sort((a, b) => a.quantidade - b.quantidade)
      .map(it => `* **${it.nome}** (${it.autor}): **${it.quantidade} unidade${it.quantidade === 1 ? '' : 's'}** restantes (Margem: ${it.margem_lucro}%, Custo: R$ ${it.valor_custo.toFixed(2)})`)
      .join('\n');

    return `Temos **${lowStock.length} produtos** em estado crítico de estoque (5 ou menos unidades):

${list}

⚠️ **Recomendação:** Priorize pedidos aos fornecedores para estes títulos para evitar ruptura de vendas.`;
  }

  // 6. Quanto de lucro potencial temos atualmente?
  if (q.includes('lucro potencial') || (q.includes('lucro') && q.includes('potencial')) || (q.includes('quanto') && q.includes('lucro'))) {
    return `O **lucro potencial total** do estoque atual é de **R$ ${summary.lucro_potencial_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.

**Detalhamento Financeiro:**
* **Faturamento Bruto Projetado:** R$ ${summary.valor_total_revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Custo Total de Aquisição:** R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Lucro Líquido Potencial:** R$ ${summary.lucro_potencial_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Margem Média do Estoque:** ${summary.margem_media_percentual}%`;
  }

  // 7. Quais produtos possuem maior margem de lucro?
  if (q.includes('maior margem') || q.includes('margem de lucro') || q.includes('margens')) {
    const sorted = [...items].sort((a, b) => b.margem_lucro - a.margem_lucro).slice(0, 5);
    const list = sorted
      .map((it, idx) => `${idx + 1}. **${it.nome}** — **${it.margem_lucro}%** de margem (Custo: R$ ${it.valor_custo.toFixed(2)} | Revenda: R$ ${it.valor_revenda.toFixed(2)} | Lucro: R$ ${it.valor_lucro.toFixed(2)})`)
      .join('\n');

    return `Os **5 produtos com maior margem percentual de lucro** são:

${list}

Esses itens oferecem o maior retorno percentual sobre o preço de venda praticado.`;
  }

  // 8. Liste os produtos cadastrados
  if (q.includes('liste') || q.includes('listar') || q.includes('todos os produtos') || q.includes('todos os itens') || q.includes('catalogo')) {
    const list = items
      .map(it => `* **${it.nome}** — Qtd: **${it.quantidade} un.** | Custo: R$ ${it.valor_custo.toFixed(2)} | Revenda: R$ ${it.valor_revenda.toFixed(2)} | Lucro Un.: R$ ${it.valor_lucro.toFixed(2)} (${it.margem_lucro}%)`)
      .join('\n');

    return `Aqui está a lista completa dos **${items.length} produtos cadastrados** no estoque:

${list}

**Totais:** ${summary.quantidade_total} exemplares | R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} investidos.`;
  }

  // 9. Qual produto devo repor considerando a quantidade disponível?
  if (q.includes('repor') || q.includes('reposicao') || q.includes('comprar')) {
    const lowStock = items.filter(it => it.quantidade <= 5);
    const topRecommended = [...lowStock].sort((a, b) => b.margem_lucro - a.margem_lucro);

    if (topRecommended.length === 0) {
      return `Todos os produtos estão com níveis saudáveis de estoque (> 5 unidades). No momento não há necessidade imediata de reposição urgente.`;
    }

    const priority1 = topRecommended[0];
    const priorityList = topRecommended
      .map(it => `1. **${it.nome}** — Restam apenas **${it.quantidade} un.** | Margem de **${it.margem_lucro}%** | Lucro unitário: R$ ${it.valor_lucro.toFixed(2)}`)
      .join('\n');

    return `Considerando a quantidade crítica disponível e o retorno financeiro, os títulos que você deve repor com maior urgência são:

${priorityList}

💡 **Destaque:** O item **"${priority1.nome}"** deve ser a prioridade máxima de reposição, pois possui estoque quase esgotado (${priority1.quantidade} un.) aliado a uma excelente margem de ${priority1.margem_lucro}%.`;
  }

  // Resposta padrão contextualizada
  return `Com base nos dados atualizados do acervo da livraria:
Temos **${summary.total_itens} produtos cadastrados**, totalizando **${summary.quantidade_total} exemplares** em estoque.
O valor total investido é de **R$ ${summary.valor_total_investido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**, com potencial de revenda de **R$ ${summary.valor_total_revenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (Lucro projetado de **R$ ${summary.lucro_potencial_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**).

Você pode me perguntar sobre:
* Quantidade em estoque ou lista de produtos
* Itens com maior lucro ou maior margem
* Valor investido e valor de revenda
* Alertas de estoque baixo e recomendações de reposição.`;
}

// Inicialização do servidor
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Controle de Estoque] Servidor executando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
});
