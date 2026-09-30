import React from 'react';
import { BookOpen, LayoutDashboard, Boxes, PlusCircle, Bot, LogOut } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'estoque' | 'cadastrar';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userEmail: string;
  onLogout: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  userEmail,
  onLogout,
  isChatOpen,
  onToggleChat,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element Brand Zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-amber-200 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <button
              onClick={() => onSelectTab('dashboard')}
              className="text-lg font-serif-book font-bold tracking-tight text-stone-900 hover:text-stone-700 transition cursor-pointer"
            >
              Controle de Estoque
            </button>
          </div>

          {/* Zone 2: Navigation tabs + Consulte Aqui */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-stone-900 text-amber-50 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('estoque')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                activeTab === 'estoque'
                  ? 'bg-stone-900 text-amber-50 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Boxes className="w-4 h-4 shrink-0" />
              <span>Estoque</span>
            </button>

            <button
              onClick={() => onSelectTab('cadastrar')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                activeTab === 'cadastrar'
                  ? 'bg-stone-900 text-amber-50 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Item</span>
            </button>

            {/* Consulte Aqui (Chat Flutuante de IA) */}
            <button
              onClick={onToggleChat}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                isChatOpen
                  ? 'bg-amber-900 text-amber-100 shadow-xs ring-1 ring-amber-700'
                  : 'text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80'
              }`}
              title="Abrir chat flutuante Consulte Aqui"
            >
              <Bot className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Consulte Aqui</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-xs text-stone-500 font-mono-numbers truncate max-w-[180px]">
              {userEmail}
            </span>
            <button
              onClick={onLogout}
              title="Encerrar Sessão"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-stone-200 hover:border-red-200 transition cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
