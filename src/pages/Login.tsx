import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCanvasStore } from '../store/canvasStore';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuthStore();
    
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        try {
            if (isLoginMode) {
                const { error } = await signIn(username, password);
                if (error) throw error;
                navigate('/dashboard');
            } else {
                const { error } = await signUp(username, password);
                if (error) throw error;
                
                // Auto login after signup
                const { error: signInError } = await signIn(username, password);
                if (signInError) throw signInError;
                
                // Create default board for new user
                const { createBoard } = useCanvasStore.getState();
                await createBoard('My First Board');
                
                setMsg({ type: 'success', text: 'Account created! Loading your canvas...' });
                navigate('/dashboard');
            }
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="w-full border-b border-gray-200 dark:border-[#283039] px-6 py-4 flex items-center justify-between absolute top-0 z-10 bg-transparent">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white cursor-pointer select-none">
                <div className="size-8 text-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor"></path>
                    </svg>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-tight">Infinite Canvas</h2>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center relative p-4">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)", backgroundSize: "24px 24px"}}></div>
            
            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[420px] flex flex-col bg-white dark:bg-[#1c2127] rounded-xl shadow-2xl border border-gray-200 dark:border-[#3b4754] overflow-hidden">
                <div className="px-8 pt-10 pb-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                            <span className="material-symbols-outlined" style={{fontSize: "24px"}}>
                                {isLoginMode ? 'lock' : 'person_add'}
                            </span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">
                            {isLoginMode ? 'Log in to your canvas' : 'Create an account'}
                        </h1>
                        <p className="text-slate-500 dark:text-[#9dabb9] text-sm mt-2">
                            {isLoginMode ? 'Welcome back! Please enter your details.' : 'Start your journey with InfiNote.'}
                        </p>
                    </div>

                    {msg && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                            {msg.text}
                        </div>
                    )}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        {/* Username Field */}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-slate-700 dark:text-white text-sm font-medium">Username</span>
                            <div className="relative">
                                <input 
                                    className="w-full rounded-lg border border-gray-300 dark:border-[#3b4754] bg-white dark:bg-[#111418] px-4 py-3 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#637588] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
                                    placeholder="Enter username" 
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 select-none pointer-events-none" style={{fontSize: "20px"}}>person</span>
                            </div>
                        </label>

                        {/* Password Field */}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-slate-700 dark:text-white text-sm font-medium">Password</span>
                            <div className="relative group">
                                <input 
                                    className="w-full rounded-lg border border-gray-300 dark:border-[#3b4754] bg-white dark:bg-[#111418] px-4 py-3 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#637588] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all pr-10" 
                                    placeholder="Enter password" 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 select-none pointer-events-none" style={{fontSize: "20px"}}>key</span>
                            </div>
                        </label>

                        {/* Submit Button */}
                        <button 
                            className="mt-2 w-full cursor-pointer rounded-lg bg-primary py-3 px-4 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2127] transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : (isLoginMode ? 'Log in' : 'Sign up')}
                        </button>
                    </form>
                </div>

                {/* Footer Divider */}
                <div className="bg-gray-50 dark:bg-[#151a21] border-t border-gray-200 dark:border-[#3b4754] px-8 py-4">
                    <p className="text-center text-sm text-slate-500 dark:text-[#9dabb9]">
                        {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                        <button 
                            className="font-bold text-primary hover:underline" 
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setMsg(null);
                            }}
                        >
                            {isLoginMode ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>
            </div>
        </main>
        </div>
    );
};
