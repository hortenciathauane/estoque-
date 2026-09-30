import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Minimize2, 
  Maximize2,
  Database,
  Layers,
  Tags,
  Boxes,
  Wallet,
  Tag,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { ChatMessage } from '../types/inventory';

interface FloatingAIChatProps {
  isOpen: boolean;
  onToggle: () => void;
  totalItemsCount: number;
}

export type StockDimension = 'geral' | 'item' | 'categoria' | 'volume' | 'custo' | 'revenda' | 'lucros';

interface DimensionOption {
  id: StockDimension;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const DIMENSIONS: DimensionOption[] = [
  { id: 'geral', label: 'Visão Geral', icon: <Sparkles className="w-3 h-3 text-amber-500" />, hint: 'Indicadores consolidados' },
  { id: 'item', label: 'Por Item', icon: <BookOpen className="w-3 h-3 text-sky-600" />, hint: 'Títulos e produtos' },
  { id: 'categoria', label: 'Categorias', icon: <Tags className="w-3 h-3 text-purple-600" />, hint: 'Gêneros e agrupamentos' },
  { id: 'volume', label: 'Volume', icon: <Boxes className="w-3 h-3 text-amber-600" />, hint: 'Quantidades e reposição' },
  { id: 'custo', label: 'Valor de Custo', icon: <Wallet className="w-3 h-3 text-emerald-600" />, hint: 'Capital investido' },
  { id: 'revenda', label: 'Valor de Revenda', icon: <Tag className="w-3 h-3 text-blue-600" />, hint: 'Preço de venda e faturamento' },
  { id: 'lucros', label: 'Lucros & Margens', icon: <TrendingUp className="w-3 h-3 text-teal-600" />, hint: 'Retorno financeiro e margem %' },
];

const QUESTIONS_BY_DIMENSION: Record<StockDimension, string[]> = {
  geral: [
    'Quantos produtos temos em estoque?',
    'Qual produto tem maior lucro?',
    'Qual é o valor total investido?',
    'Qual é o valor total de revenda?',
    'Qual produto está com estoque baixo?',
    'Quanto de lucro potencial temos atualmente?',
  ],
  item: [
    'Liste os produtos cadastrados com seus detalhes.',
    'Qual produto possui o maior preço de revenda?',
    'Qual produto possui a maior quantidade em estoque?',
    'Qual produto possui a menor quantidade disponível?',
  ],
  categoria: [
    'Mostre a análise do estoque por categoria.',
    'Qual categoria possui o maior volume de livros?',
    'Qual categoria gera maior lucro potencial?',
    'Qual categoria possui a maior margem média percentual?',
  ],
  volume: [
    'Quantos produtos temos em estoque no total?',
    'Qual produto está com estoque baixo (≤ 5 unidades)?',
    'Qual produto devo repor considerando a quantidade disponível?',
    'Quais produtos possuem o maior volume em estoque?',
  ],
  custo: [
    'Qual é o valor total investido em custo?',
    'Qual produto tem o maior valor de custo unitário?',
    'Qual produto possui o maior capital total imobilizado?',
    'Qual a média de custo de aquisição dos produtos?',
  ],
  revenda: [
    'Qual é o valor total de revenda projetado?',
    'Qual produto possui o maior preço de venda unitário?',
    'Qual é a projeção de faturamento bruto por categoria?',
    'Qual a relação média entre custo e revenda?',
  ],
  lucros: [
    'Qual produto tem maior lucro unitário?',
    'Qual produto tem maior lucro potencial total em estoque?',
    'Quais produtos possuem maior margem de lucro (%)?',
    'Quanto de lucro potencial temos atualmente?',
  ],
};

export const FloatingAIChat: React.FC<FloatingAIChatProps> = ({
  isOpen,
  onToggle,
  totalItemsCount,
}) => {
  const [selectedDimension, setSelectedDimension] = useState<StockDimension>('geral');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Olá! Sou o assistente **Consulte Aqui** da sua livraria.

Estou conectado diretamente ao estoque e respondo perguntas sobre o acervo, custos, lucros, giro e reposição de estoque.

Navegue pelas opções abaixo para interagir por **Item**, **Categoria**, **Volume**, **Valor de Custo**, **Valor de Revenda** ou **Lucros**:`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      provider: 'Consulte Aqui',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          dimension: selectedDimension,
          history: messages.slice(-6),
        }),
      });

      const data = await response.json();

      if (response.ok && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          provider: data.provider || 'Consulte Aqui',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um imprevisto ao consultar os dados de estoque. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const networkErrorMsg: ChatMessage = {
        id: `net-error-${Date.now()}`,
        role: 'assistant',
        content: 'Não foi possível conectar ao servidor para processar a consulta. Verifique sua conexão.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Histórico reiniciado. Como posso te auxiliar com os dados de estoque da livraria hoje?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-stone-900">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-stone-200/60 font-mono-numbers text-xs">$1</code>');
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-serif-book font-bold text-stone-900 text-sm mt-2 mb-1">
                {line.slice(4)}
              </h4>
            );
          }

          if (line.startsWith('* ') || line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                <span className="text-amber-700 font-bold shrink-0 mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(2)) }} />
              </div>
            );
          }

          if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+\.)\s(.*)/);
            if (match) {
              return (
                <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                  <span className="font-mono-numbers font-semibold text-amber-900 shrink-0">{match[1]}</span>
                  <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(match[2]) }} />
                </div>
              );
            }
          }

          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          return (
            <p
              key={idx}
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
            />
          );
        })}
      </div>
    );
  };

  const activeQuestions = QUESTIONS_BY_DIMENSION[selectedDimension] || QUESTIONS_BY_DIMENSION.geral;
  const currentDimensionObj = DIMENSIONS.find(d => d.id === selectedDimension) || DIMENSIONS[0];

  return (
    <>
      {/* Botão Flutuante Gatilho "Consulte Aqui" */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={onToggle}
            className="flex items-center gap-2.5 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-amber-50 rounded-full shadow-xl border border-stone-800 hover:border-amber-600/40 transition-all duration-200 cursor-pointer group hover:scale-[1.03] active:scale-[0.98]"
            title="Abrir assistente Consulte Aqui"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-amber-300 transition-transform group-hover:rotate-12" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-stone-900 animate-pulse"></span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-serif-book font-bold tracking-tight text-white leading-none">
                Consulte Aqui
              </span>
              <span className="text-[10px] text-amber-300/80 font-mono-numbers mt-0.5 leading-none">
                Assistente de Estoque
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Janela do Chat Flutuante */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'w-[95vw] sm:w-[620px] h-[88vh] max-h-[860px]'
              : 'w-[94vw] sm:w-[460px] md:w-[490px] h-[610px] max-h-[85vh]'
          }`}
        >
          {/* Header da Janela Flutuante */}
          <div className="bg-stone-900 text-stone-100 px-4 py-3 flex items-center justify-between border-b border-stone-800 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif-book font-bold text-white tracking-tight">
                    Consulte Aqui
                  </h3>
                  <span className="text-[9px] font-mono-numbers bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60">
                    Assistente Ativo
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-mono-numbers flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Dados Atualizados ({totalItemsCount} títulos)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-stone-400">
              <button
                onClick={handleClearChat}
                title="Limpar histórico"
                className="p-1.5 hover:text-white hover:bg-stone-800 rounded-md transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Reduzir tamanho' : 'Expandir tamanho'}
                className="p-1.5 hover:text-white hover:bg-stone-800 rounded-md transition cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onToggle}
                title="Fechar janela"
                className="p-1.5 hover:text-white hover:bg-stone-800 rounded-md transition cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de Dimensões Interativas de Estoque */}
          <div className="bg-stone-100/90 border-b border-stone-200 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-amber-700" />
                Interagir por Dimensão:
              </span>
              <span className="text-[10px] text-stone-500 font-mono-numbers italic">
                {currentDimensionObj.hint}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {DIMENSIONS.map((dim) => {
                const isSelected = selectedDimension === dim.id;
                return (
                  <button
                    key={dim.id}
                    onClick={() => setSelectedDimension(dim.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-stone-900 text-amber-100 shadow-2xs font-semibold'
                        : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span>{dim.icon}</span>
                    <span>{dim.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de Mensagens com Rolagem */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF8F5]/40">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-amber-900 flex items-center justify-center text-amber-100 shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs ${
                      isUser
                        ? 'bg-stone-900 text-stone-100 rounded-br-xs'
                        : 'bg-white border border-stone-200/90 text-stone-800 rounded-bl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-[13px]">{msg.content}</p>
                    ) : (
                      <div>
                        {renderFormattedContent(msg.content)}

                        {/* Rodapé da Resposta */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                          <span className="flex items-center gap-1 font-mono-numbers">
                            <Database className="w-2.5 h-2.5 text-stone-400" />
                            <span>Estoque Sincronizado</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span>{msg.timestamp}</span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-0.5 hover:text-stone-700 rounded transition cursor-pointer"
                              title="Copiar texto"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-amber-900 flex items-center justify-center text-amber-100 shrink-0 shadow-2xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-stone-200/90 rounded-2xl rounded-bl-xs p-3 shadow-2xs flex items-center gap-2 text-xs text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-amber-700 animate-ping"></span>
                  <span>Analisando dados do estoque ({currentDimensionObj.label})...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Perguntas Rápidas Filtradas por Dimensão */}
          <div className="p-2.5 bg-stone-50/90 border-t border-stone-200">
            <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 tracking-wider mb-1.5 px-0.5">
              <span className="flex items-center gap-1 uppercase">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Perguntas Rápidas ({currentDimensionObj.label}):
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activeQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-md bg-white border border-stone-200 hover:border-amber-700/40 hover:bg-amber-50/50 text-stone-700 hover:text-amber-900 text-[11px] transition cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input de Mensagem com Placeholder Dinâmico */}
          <div className="p-3 bg-white border-t border-stone-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                placeholder={`Pergunte sobre ${currentDimensionObj.label.toLowerCase()} ou digite sua consulta...`}
                className="flex-1 py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="p-2 bg-stone-900 hover:bg-stone-800 text-amber-100 rounded-lg shadow-xs transition flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
                title="Enviar pergunta"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
