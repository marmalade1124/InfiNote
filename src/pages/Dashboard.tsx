import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { savedBoards, deleteBoard } = useCanvasStore();
    const { user, signOut, deleteUser, updateProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
    const [usersList, setUsersList] = useState<any[]>([]);

    // Form State for Settings
    const [formData, setFormData] = useState({
        username: '',
        avatar_url: '',
        password: '',
        confirmPassword: ''
    });
    const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Initialize form data when user loads
    useEffect(() => {
        if (user) {
            // Use locally polyfilled DB values from authStore (primary source of truth)
            // @ts-ignore 
            const dbName = user.username;
            // @ts-ignore
            const dbAvatar = user.avatar_url;
            
            // Fallbacks to metadata or defaults
            // @ts-ignore
            const metaName = user.user_metadata?.username;
            // @ts-ignore
            const metaAvatar = user.user_metadata?.avatar_url;

            setFormData(prev => ({
                ...prev,
                username: dbName || metaName || '',
                avatar_url: dbAvatar || metaAvatar || ''
            }));
            
            // If we are in settings, fetch the real profile to be 100% sure
            if (activeTab === 'settings') {
                 fetchMyProfile();
            }
        }
    }, [user, activeTab]);

    const fetchMyProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setFormData(prev => ({
                ...prev,
                username: data.username || '',
                avatar_url: data.avatar_url || ''
            }));
        }
        
        // Also fetch users if admin
        if(user?.role === 'admin') fetchUsers();
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setUsersList(data);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setStatusMsg(null);

        if (formData.password && formData.password !== formData.confirmPassword) {
            setStatusMsg({ type: 'error', text: "Passwords don't match" });
            return;
        }

        const updates: any = {};
        if (formData.username) updates.username = formData.username;
        if (formData.avatar_url) updates.avatar_url = formData.avatar_url;
        if (formData.password) updates.password = formData.password;

        setStatusMsg({ type: 'success', text: 'Saving...' });
        
        const { error } = await updateProfile(user.id, updates);
        
        if (error) {
            setStatusMsg({ type: 'error', text: error.message });
        } else {
            setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // clear pw
        }
    };

    const handleDeleteUser = async (targetId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            const { error } = await deleteUser(targetId);
            if (error) {
                alert('Error deleting user: ' + error.message);
            } else {
                setUsersList(usersList.filter(u => u.id !== targetId));
            }
        }
    };

    // Derived State
    // @ts-ignore
    const dbUsername = user?.username;
    // @ts-ignore
    const dbAvatar = user?.avatar_url;

    // @ts-ignore
    const displayName = formData.username || dbUsername || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
    // @ts-ignore
    const avatarUrl = formData.avatar_url || dbAvatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`;
    const isAdmin = user?.role === 'admin';

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#09090b] text-white selection:bg-zinc-800 selection:text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-900 bg-[#09090b] flex flex-col justify-between hidden md:flex">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                             <span className="material-symbols-outlined text-[20px]">all_inclusive</span>
                        </div>
                        <span className="font-display font-bold text-lg tracking-tight">InfiNote</span>
                        {isAdmin && <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Admin</span>}
                    </div>

                    <nav className="space-y-1">
                        <button 
                            onClick={() => setActiveTab('home')}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-all ${activeTab === 'home' ? 'text-white bg-white/5 border-white/5 shadow-sm' : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">home</span>
                            Home
                        </button>
                         <button 
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-all ${activeTab === 'settings' ? 'text-white bg-white/5 border-white/5 shadow-sm' : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'}`}
                        >
                             <span className="material-symbols-outlined text-[20px]">settings</span>
                            Settings
                        </button>
                    </nav>
                </div>

                <div className="p-4 border-t border-zinc-900">
                    <div className="px-3 py-2">
                        <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider mb-2">Workspace</p>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                            Online & Synced
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
                {/* Header */}
                <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-[#09090b]">
                    <div className="flex-1 max-w-xl relative text-zinc-500 focus-within:text-zinc-300 transition-colors">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Search workspace..." 
                            className="w-full bg-[#18181b] border border-zinc-800 rounded-md py-1.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700/50 focus:ring-1 focus:ring-zinc-700/50 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-6">
                         {/* Clickable Profile */}
                         <button 
                            onClick={() => setActiveTab('settings')}
                            className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-full transition-all group"
                        >
                            <div className="size-8 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all">
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{displayName}</div>
                                <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400 uppercase tracking-wider">{isAdmin ? 'Administrator' : 'Free Plan'}</div>
                            </div>
                         </button>

                         <div className="h-6 w-px bg-zinc-800 mx-2"></div>

                        {/* Modern Logout Button */}
                        <button 
                            onClick={() => { signOut(); navigate('/'); }}
                            className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-all text-xs font-medium uppercase tracking-wider px-4 py-2 hover:bg-red-500/10 rounded-md border border-transparent hover:border-red-500/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Log Out
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                     <div className="max-w-6xl mx-auto space-y-12">
                        
                        {activeTab === 'home' && (
                            <>
                                {/* Greeting */}
                                <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                     <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">Welcome back, {displayName}</h1>
                                     <p className="text-zinc-400">Your infinite canvas awaits. You have <span className="text-white font-medium">{Object.keys(savedBoards).length || 0} boards</span> saved.</p>
                                </div>

                                {/* Recent Section */}
                                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Your Boards</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* New Canvas Button */}
                                        <button 
                                            onClick={() => {
                                                const newId = crypto.randomUUID();
                                                navigate(`/editor/${newId}`);
                                            }}
                                            className="group relative h-48 rounded-xl border border-zinc-800 bg-[#18181b] hover:bg-zinc-900 transition-all overflow-hidden flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:border-zinc-700 shadow-sm"
                                        >
                                            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors pointer-events-none z-10 shadow-inner">
                                                 <span className="material-symbols-outlined text-white">add</span>
                                            </div>
                                            <div className="z-10">
                                                <h4 className="font-display font-semibold text-white">New Canvas</h4>
                                                <p className="text-sm text-zinc-500 mt-1">Start a fresh idea</p>
                                            </div>
                                            {/* Grid Pattern Background */}
                                            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" 
                                                 style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px'}} 
                                            />
                                        </button>

                                        {/* Saved Boards List */}
                                        {Object.values(savedBoards || {}).map((board) => (
                                            <div 
                                                key={board.id}
                                                onClick={() => navigate(`/editor/${board.id}`)}
                                                className="group relative h-48 rounded-xl border border-zinc-800 bg-[#18181b] hover:border-indigo-500/50 transition-all overflow-hidden cursor-pointer shadow-sm hover:shadow-indigo-500/10"
                                            >
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm('Are you sure you want to delete this board?')) {
                                                            deleteBoard(board.id);
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title="Delete Board"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                                {/* Preview Area */}
                                                <div className="h-2/3 bg-[#09090b] border-b border-zinc-800 relative group-hover:bg-[#0c0c0e] transition-colors flex items-center justify-center">
                                                     <div className="flex gap-2 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500 scale-90 group-hover:scale-100">
                                                         <div className="w-12 h-16 bg-blue-500/20 rounded border border-blue-500/30 shadow-lg shadow-blue-500/10"></div>
                                                         <div className="w-16 h-12 bg-purple-500/20 rounded border border-purple-500/30 translate-y-4 shadow-lg shadow-purple-500/10"></div>
                                                     </div>
                                                </div>
                                                {/* Footer */}
                                                <div className="p-4">
                                                    <h4 className="font-display font-semibold text-white text-sm group-hover:text-indigo-400 transition-colors truncate">{board.title || 'Untitled Board'}</h4>
                                                    <p className="text-xs text-zinc-500 mt-1">{board.notes.length} objects • {new Date(board.lastModified).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                        
                        {activeTab === 'settings' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Account Settings</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left Column: Profile Form */}
                                    <div className="lg:col-span-2 space-y-6">
                                        
                                        {/* Profile Card */}
                                        <div className="bg-[#18181b] rounded-xl border border-zinc-800 p-6 space-y-6">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-indigo-400">badge</span>
                                                Public Profile
                                            </h3>
                                            
                                            <div className="flex items-start gap-6">
                                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                                    <div className="size-24 rounded-full bg-zinc-800 ring-4 ring-zinc-900 overflow-hidden relative">
                                                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-white">upload</span>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        id="avatar-upload"
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setStatusMsg({ type: 'success', text: 'Uploading...' });
                                                                // @ts-ignore
                                                                const { url, error } = await useAuthStore.getState().uploadAvatar(file);
                                                                if (error) {
                                                                    setStatusMsg({ type: 'error', text: 'Upload failed: ' + error.message });
                                                                } else if (url) {
                                                                    setFormData(prev => ({ ...prev, avatar_url: url }));
                                                                    setStatusMsg({ type: 'success', text: 'Image uploaded! Remember to Save.' });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Display Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.username}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                                            className="w-full bg-[#09090b] border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                                            placeholder="Your public username"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Avatar URL</label>
                                                        <input 
                                                            type="text" 
                                                            value={formData.avatar_url}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                                                            className="w-full bg-[#09090b] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                                            placeholder="https://example.com/me.png"
                                                        />
                                                        <p className="text-[10px] text-zinc-500 mt-1">Paste a link to your image. Leave empty for auto-generated avatar.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Security Card */}
                                        <div className="bg-[#18181b] rounded-xl border border-zinc-800 p-6 space-y-6">
                                             <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-emerald-400">lock</span>
                                                Security
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">New Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={formData.password}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                        className="w-full bg-[#09090b] border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={formData.confirmPassword}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                        className="w-full bg-[#09090b] border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Save */}
                                        <div className="flex items-center justify-between pt-2">
                                            <div>
                                                {statusMsg && (
                                                    <div className={`text-sm px-3 py-1.5 rounded-md font-medium animate-in fade-in slide-in-from-left-2 ${statusMsg.type === 'success' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                        {statusMsg.text}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={handleUpdateProfile}
                                                className="bg-white text-black hover:bg-zinc-200 transition-colors px-6 py-2.5 rounded-md font-bold text-sm shadow-lg shadow-white/5 active:scale-95 transform duration-100"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Column: Admin & Danger */}
                                    <div className="space-y-6">
                                        {isAdmin && (
                                            <div className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-full max-h-[500px]">
                                                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                                                    <h3 className="text-sm font-bold text-red-500 flex items-center gap-2 uppercase tracking-wider">
                                                        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                                                        Admin Console
                                                    </h3>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-0">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-[#09090b] sticky top-0">
                                                            <tr>
                                                                <th className="p-3 font-medium text-zinc-500">User</th>
                                                                <th className="p-3 font-medium text-zinc-500 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50">
                                                            {usersList.map(u => (
                                                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                                    <td className="p-3">
                                                                        <div className="font-bold text-zinc-300">{u.username || 'Unknown'}</div>
                                                                        <div className="text-zinc-600 text-[10px] truncate max-w-[100px]">{u.id}</div>
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        {u.id !== user?.id && (
                                                                            <button 
                                                                                onClick={() => handleDeleteUser(u.id)}
                                                                                className="text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded transition-all"
                                                                                title="Delete User"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
                                            <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                                                <span className="material-symbols-outlined">warning</span>
                                                Danger Zone
                                            </h3>
                                            <p className="text-xs text-red-400/70 mb-4 leading-relaxed">
                                                Deleting your account is permanent. All your boards, notes, and data will be wiped immediately.
                                            </p>
                                            <button 
                                                onClick={() => handleDeleteUser(user?.id!)}
                                                className="w-full py-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                                            >
                                                Delete My Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            </main>
        </div>
    );
};
