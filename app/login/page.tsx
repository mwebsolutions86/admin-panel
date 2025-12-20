'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Store, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
      router.refresh(); 
    } catch (err: any) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      
      {/* Côté Gauche : Visuel & Branding */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-yellow-400 blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-blue-500 blur-3xl"></div>
        </div>

        <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-xl mb-6 backdrop-blur-sm border border-white/10">
                <Store size={32} className="text-yellow-400" />
            </div>
            <h1 className="text-5xl font-bold mb-4 tracking-tight">Universal Eats<span className="text-yellow-400">.</span></h1>
            <p className="text-xl text-slate-300 max-w-md leading-relaxed">
                L'écosystème complet pour gérer vos franchises, vos commandes et votre croissance.
            </p>
        </div>

        {/* SIGNATURE MAZOUZ WS (Desktop) */}
        <div className="relative z-10 text-sm text-slate-500 font-medium">
            <div>© 2025 Universal Eats Ecosystem.</div>
            <div className="text-slate-400 mt-1 opacity-75">Designed by <span className="text-yellow-400 font-bold">MAZOUZ WS</span></div>
        </div>
      </div>

      {/* Côté Droit : Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 md:bg-white">
        <div className="w-full max-w-md space-y-8">
            
            <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900">Connexion</h2>
                <p className="mt-2 text-gray-500">Accédez à votre espace de gestion sécurisé.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email professionnel</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all outline-none bg-gray-50 focus:bg-white"
                                placeholder="nom@restaurant.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all outline-none bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            Se connecter
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center text-sm space-y-4">
                <div>
                    <span className="text-gray-400">Problème de connexion ? </span>
                    <a href="#" className="font-medium text-black hover:underline">Contacter le support IT</a>
                </div>
                
                {/* SIGNATURE MAZOUZ WS (Mobile) */}
                <div className="md:hidden text-xs text-gray-300 pt-8">
                    Designed by <strong>MAZOUZ WS</strong>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}