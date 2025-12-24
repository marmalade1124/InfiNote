import React, { useState } from 'react';
import { Plus, LayoutDashboard, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
    const { addNote, setInteractionMode, categories, addCategory, activeCategory, setActiveCategory, removeCategory, updateCategoryColor } = useCanvasStore();
    const [newCategory, setNewCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleCreateNote = () => {
         addNote({
            x: Math.random() * 400 + 100,
            y: Math.random() * 400 + 100,
            title: 'New Note',
            content: 'Click to edit...',
            type: 'sticky',
            color: 'yellow'
        });
        setInteractionMode('select');
    };
    
    const handleAddCategory = () => {
        if(newCategory.trim()) {
            addCategory(newCategory.trim(), '#' + Math.floor(Math.random()*16777215).toString(16));
            setNewCategory('');
            setIsAdding(false);
        }
    };

    return (
        <aside className="absolute top-6 left-6 bottom-6 w-64 flex flex-col gap-4 z-40 hidden lg:flex pointer-events-none">
            <div className="w-full h-full bg-surface-dark/95 backdrop-blur-sm border border-border-dark rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
                <div className="p-4 border-b border-border-dark">
                    <button 
                        onClick={handleCreateNote}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} />
                        Create Note
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Library</div>
                    <button 
                        onClick={() => setActiveCategory(null)}
                        className={cn("w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 hover:text-white transition-colors border-l-2", activeCategory === null ? 'border-primary bg-white/5 text-white' : 'border-transparent text-gray-300')}
                    >
                        <LayoutDashboard size={20} />
                        <span>All Notes</span>
                    </button>
                    
                    <div className="mt-6">
                        <div className="px-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center group/header">
                            Categories
                        </div>

                        <div className="space-y-1 px-2">
                            {categories.map((cat) => (
                                <div 
                                    key={cat.name}
                                    className={cn(
                                        "flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm border-l-2 border-transparent",
                                        activeCategory === cat.name ? "bg-white/5 text-white border-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                    onClick={() => setActiveCategory(cat.name)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative group/color">
                                            <div className="size-3 rounded-full ring-2 ring-transparent group-hover/color:ring-gray-500 transition-all cursor-pointer" style={{backgroundColor: cat.color}}></div>
                                            <input 
                                                type="color" 
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                value={cat.color}
                                                onChange={(e) => updateCategoryColor(cat.name, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <span>{cat.name}</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCategory(cat.name);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            
                            {/* Add Category Input */}
                            {isAdding ? (
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <input 
                                        className="bg-transparent border-b border-gray-600 text-sm text-white w-full outline-none focus:border-primary pb-1"
                                        placeholder="Name..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') {
                                                handleAddCategory();
                                            } else if (e.key === 'Escape') {
                                                setIsAdding(false);
                                                setNewCategory('');
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!newCategory.trim()) setIsAdding(false);
                                        }}
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                    <span>Add Category</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
