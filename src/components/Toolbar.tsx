import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { MousePointer2, Hand, StickyNote, Image, Pencil, Type, Eraser, Trash, X, Share2 } from 'lucide-react';

export const Toolbar: React.FC = () => {
    const { addNote, interactionMode, setInteractionMode, selectedNoteIds, boardId, activeBoardIsPublic, togglePublic } = useCanvasStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const selectedCount = selectedNoteIds.length;

    const handleAddNote = () => {
        addNote({
            x: Math.random() * 500 + 100,
            y: Math.random() * 500 + 100,
            title: 'New Note',
            content: 'Click to edit',
            type: 'sticky',
            color: 'yellow'
        });
        setInteractionMode('select'); 
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if(event.target?.result) {
                     addNote({
                        x: Math.random() * 500 + 100,
                        y: Math.random() * 500 + 100,
                        title: file.name,
                        content: '',
                        type: 'card',
                        color: 'blue',
                        imageUrl: event.target.result as string
                    });
                    setInteractionMode('select');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 transform transition-transform duration-200 hover:scale-105">
            <div className="flex items-center gap-1 p-2 rounded-full bg-surface-dark border border-border-dark shadow-2xl backdrop-blur-sm bg-opacity-90 ring-1 ring-white/5">
                <button 
                    onClick={() => setInteractionMode('select')}
                    className={`p-3 rounded-full shadow-lg transition-all ${interactionMode === 'select' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title="Select Tool"
                >
                    <MousePointer2 size={24} />
                </button>
                <button 
                    onClick={() => setInteractionMode('pan')}
                    className={`p-3 rounded-full transition-colors ${interactionMode === 'pan' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title="Pan Tool"
                >
                    <Hand size={24} />
                </button>
                <button 
                    onClick={() => setInteractionMode('draw')}
                    className={`p-3 rounded-full transition-colors ${interactionMode === 'draw' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title="Pencil Tool"
                >
                    <Pencil size={24} />
                </button>
                <button 
                    onClick={() => setInteractionMode('text')}
                    className={`p-3 rounded-full transition-colors ${interactionMode === 'text' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title="Text Tool"
                >
                    <Type size={24} />
                </button>
                <button 
                    onClick={() => setInteractionMode('eraser')}
                    className={`p-3 rounded-full transition-colors ${interactionMode === 'eraser' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title="Eraser Tool"
                >
                    <Eraser size={24} />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                <button 
                    onClick={handleAddNote}
                    className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors relative group" 
                    title="Add Note"
                >
                    <StickyNote size={24} />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Add Note
                    </span>
                </button>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" 
                    title="Add Image"
                >
                    <Image size={24} />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                <button 
                  onClick={async () => {
                      // Manual Save Trigger
                      const state = useCanvasStore.getState();
                      if (state.boardId) {
                          const btn = document.getElementById('toolbar-save-btn');
                          if(btn) {
                              const icon = btn.querySelector('span');
                              if(icon) {
                                  icon.innerText = 'sync';
                                  icon.classList.add('animate-spin');
                              }
                          }
                          
                          await state.saveBoard(state.boardId, 'Untitled Board');
                          
                          if(btn) {
                              const icon = btn.querySelector('span');
                              if(icon) {
                                  icon.classList.remove('animate-spin');
                                  icon.innerText = 'check';
                                  btn.classList.add('bg-green-500');
                                  btn.classList.remove('bg-blue-600');
                                  setTimeout(() => {
                                      icon.innerText = 'save';
                                      btn.classList.remove('bg-green-500');
                                      btn.classList.add('bg-blue-600');
                                  }, 2000);
                              }
                          }
                      }
                  }}
                  id="toolbar-save-btn"
                  className="p-3 text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all shadow-lg flex items-center justify-center transform active:scale-95" 
                  title="Save Board"
                >
                    <span className="material-symbols-outlined text-[24px]">save</span>
                </button>
            </div>
            
            {/* Multi-Selection Context Menu */}
            {selectedCount > 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-lg bg-surface-dark border border-border-dark shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
                    <span className="text-sm font-medium text-white px-2 border-r border-gray-700">
                        {selectedCount} selected
                    </span>
                    
                    <div className="flex items-center gap-1">
                        {['blue', 'green', 'yellow', 'purple', 'gray'].map((color) => (
                            <button
                                key={color}
                                onClick={() => useCanvasStore.getState().updateSelectedNotesColor(color as any)}
                                className={`w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform ${
                                    color === 'blue' ? 'bg-blue-500' :
                                    color === 'green' ? 'bg-green-500' :
                                    color === 'yellow' ? 'bg-yellow-500' :
                                    color === 'purple' ? 'bg-purple-500' :
                                    'bg-gray-500'
                                }`}
                                title={`Color ${color}`}
                            />
                        ))}
                    </div>
                    
                    <div className="w-px h-4 bg-gray-700 mx-1"></div>
                    
                    <button 
                        onClick={() => useCanvasStore.getState().deleteSelectedNotes()}
                        className="p-1.5 text-red-400 hover:text-white hover:bg-red-500/20 rounded-md transition-colors"
                        title="Delete Selected"
                    >
                        <Trash size={18} />
                    </button>
                    
                     <button 
                        onClick={() => useCanvasStore.getState().deselectAll()}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        title="Deselect"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};
