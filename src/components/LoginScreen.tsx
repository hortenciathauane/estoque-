import React, { useState } from 'react';
import { BookOpen, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthSession } from '../types/inventory';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        const session: AuthSession = {
          email: data.user.email,
          role: data.user.role,
          token: data.user.token,
          loggedAt: new Date().toISOString(),
        };
        localStorage.setItem('controle_estoque_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        setErrorMessage(data.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      setErrorMessage('Erro de conexão ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Elementos sutis de fundo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-stone-200/50 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg shadow-stone-900/10 border border-stone-800">
            <BookOpen className="w-7 h-7 text-amber-200" />
          </div>
        </div>
        <h1 className="mt-5 text-center text-3xl font-serif-book font-bold tracking-tight text-stone-900">
          Controle de Estoque
        </h1>
        <p className="mt-2 text-center text-sm text-stone-600">
          Livraria & Acervo Literário · Acesso Restrito
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-stone-200/80 rounded-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-800 flex items-start gap-2.5">
                <span className="text-red-500 font-bold shrink-0">!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                E-mail Corporativo
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="block w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Senha de Acesso
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition font-mono-numbers"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-stone-900 rounded-lg shadow-xs text-sm font-medium text-amber-50 bg-stone-900 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/40 disabled:opacity-60 transition cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin"></span>
                    Autenticando...
                  </span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4 text-amber-200" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Ambiente Seguro</span>
            <span>Acesso Restrito & Autenticado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
