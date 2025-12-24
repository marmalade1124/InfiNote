import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useCanvasStore, type Note } from '../store/canvasStore';
import { cn } from '../lib/utils';
import { MoreHorizontal, CheckCircle, Circle, X, Plus, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

// ... props
interface NoteItemProps {
  note: Note;
  onConnectStart?: (noteId: string, handle: 'left' | 'right', e: React.MouseEvent) => void;
  onConnectEnd?: (noteId: string, handle: 'left' | 'right', e: React.MouseEvent) => void;
}

export const NoteItem: React.FC<NoteItemProps> = ({ note, onConnectStart, onConnectEnd }) => {
  const { moveNote, moveNotes, interactionMode, selectNote, selectedNoteIds, updateNote, searchQuery, activeCategory, deleteNote, disconnectNote, categories } = useCanvasStore();
  const noteRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [focusTarget, setFocusTarget] = React.useState<'title' | 'content' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = React.useState(false);
  const [editContent, setEditContent] = React.useState(note.content);
  const [editTitle, setEditTitle] = React.useState(note.title);

  const isSelected = selectedNoteIds.includes(note.id);
  
  // Search & Category filtering logic
  const match = searchQuery.toLowerCase();
  
  // Tag matching logic
  const noteTags = (note.tags || []).map(t => t.toLowerCase());
  
  const matchesSearch = !searchQuery || 
                        note.title.toLowerCase().includes(match) || 
                        note.content.toLowerCase().includes(match) || 
                        noteTags.some(t => t.includes(match));
                        
  const matchesCategory = !activeCategory || 
                          (note.tags && note.tags.includes(activeCategory)) || 
                          (activeCategory === 'All Notes'); // Fallback

  const isDimmed = !matchesSearch || !matchesCategory;

  // Handle Delete key when selected and not editing
  React.useEffect(() => {
      if(isSelected && !isEditing) {
          const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                  deleteNote(note.id);
              }
          };
          window.addEventListener('keydown', handleKeyDown);
          return () => window.removeEventListener('keydown', handleKeyDown);
      }
  }, [isSelected, isEditing, deleteNote, note.id]);

  // Helper to get color classes
  const getColorClass = (color: string) => {
      switch(color) {
          case 'blue': return 'bg-blue-500';
          case 'green': return 'bg-green-500';
          case 'yellow': return 'bg-yellow-500';
          case 'purple': return 'bg-purple-500';
          default: return 'bg-gray-500';
      }
  };

  const handleSave = () => {
      setIsEditing(false);
      setFocusTarget(null);
      updateNote(note.id, { title: editTitle, content: editContent });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
        // Prevent event propagation for basic typing to avoid triggering global shortcuts
       e.stopPropagation();

      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSave();
      }
  };

  return (
    <motion.div
      ref={noteRef}
      className={cn(
        "absolute transition-all group flex flex-col",
         note.type === 'text' 
            ? "border-none shadow-none bg-transparent" // Text Styling
            : "bg-surface-dark border border-border-dark rounded-xl shadow-xl hover:shadow-2xl hover:border-gray-600", // Default Styling
         interactionMode === 'select' ? "cursor-grab active:cursor-grabbing" : "cursor-default",
         isDimmed && "opacity-20 grayscale hover:opacity-100 hover:grayscale-0"
      )}
      style={{ 
          x: note.x, 
          y: note.y,
          width: note.type === 'text' ? 'auto' : (note.width || 320),
          height: note.type === 'text' ? 'auto' : (note.height || 'auto'),
          minHeight: note.type === 'text' ? 0 : 150,
          minWidth: note.type === 'text' ? 50 : 200
      }}
      drag={interactionMode === 'select' && !isEditing} // Only drag in select mode and not editing
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (isSelected && selectedNoteIds.length > 0) {
            moveNotes(info.offset.x, info.offset.y);
        } else {
            moveNote(note.id, note.x + info.offset.x, note.y + info.offset.y);
        }
      }}
      onClick={(e) => {
          e.stopPropagation();
          if (interactionMode === 'select') {
               selectNote(note.id, e.shiftKey);
          }
      }}
      onDoubleClick={(e) => {
          e.stopPropagation();
          if (interactionMode === 'select') {
              setFocusTarget('content');
              setIsEditing(true);
          }
      }}
      whileDrag={{ scale: 1.02, zIndex: 100, cursor: 'grabbing' }}
    >
        {/* Selection Highlight */}
         <div className={cn("absolute inset-0 rounded-xl pointer-events-none transition-opacity border-2 border-primary shadow-[0_0_15px_rgba(19,127,236,0.3)]", isSelected ? "opacity-100" : "opacity-0")} />


      {/* Header Color Strip - Hidden for text type */}
      {note.type !== 'text' && (
          <div 
            className={cn(
                "h-1.5 w-full rounded-t-xl",
                getColorClass(note.color)
            )} 
          />
      )}
      
      <div className="p-4 relative z-10 flex-col flex h-full">
        <div className="flex justify-between items-start mb-2">
            {isEditing ? (
                 <input 
                    className="bg-transparent text-white text-lg font-bold border-b border-gray-600 focus:border-primary outline-none w-full mr-2"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus={focusTarget === 'title'}
                 />
            ) : (
                note.type !== 'text' && (
                    <h3 
                        className="text-white text-lg font-bold cursor-text hover:text-blue-300 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFocusTarget('title');
                            setIsEditing(true);
                        }}
                    >
                        {note.title}
                    </h3>
                )
            )}
            
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                    className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MoreHorizontal size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-6 w-48 bg-gray-800 border border-border-dark rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                        {/* Color Picker */}
                        <div className="p-2 grid grid-cols-5 gap-1 border-b border-gray-700">
                            {['blue', 'green', 'yellow', 'purple', 'gray'].map(c => (
                                <button
                                    key={c}
                                    className={cn("size-6 rounded-full hover:scale-110 transition-transform ring-1 ring-white/10", getColorClass(c))}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateNote(note.id, { color: c as any });
                                    }}
                                />
                            ))}
                        </div>
                        
                        <div className="border-b border-gray-700 p-1">
                            <button 
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                onClick={(e) => { e.stopPropagation(); useCanvasStore.getState().bringToFront(note.id); setIsMenuOpen(false); }}
                            >
                                <ArrowUpToLine size={14} />
                                Bring to Front
                            </button>
                             <button 
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                onClick={(e) => { e.stopPropagation(); useCanvasStore.getState().sendToBack(note.id); setIsMenuOpen(false); }}
                            >
                                <ArrowDownToLine size={14} />
                                Send to Back
                            </button>
                        </div>

                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                            onClick={(e) => { e.stopPropagation(); disconnectNote(note.id); setIsMenuOpen(false); }}
                        >
                            <Circle size={14} />
                            Disconnect
                        </button>
                         <button 
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                            onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        >
                            <X size={14} />
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Image Content */}
        {note.imageUrl && (
            <div 
                className="mb-3 rounded-lg overflow-hidden h-32 w-full bg-cover bg-center border border-border-dark" 
                style={{backgroundImage: `url("${note.imageUrl}")`}}
            />
        )}
        
        {/* Text Content */}
        {isEditing ? (
            <textarea 
                className={cn(
                    "w-full bg-transparent resize-none outline-none p-1 rounded focus:border-primary",
                    note.type === 'text' 
                        ? "text-white text-2xl font-bold font-heading border-none" 
                        : "text-gray-300 text-sm leading-relaxed border border-gray-700 min-h-[80px]"
                )}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    const current = editContent.trim().toLowerCase();
                    if (current === 'click to edit' || current === 'type here...') {
                        setEditContent('');
                    }
                }}
                autoFocus={focusTarget === 'content'}
            />
        ) : (
            note.title === 'Ideas' ? (
                 <ul className="space-y-2 mt-2">
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle size={16} className="text-green-500" />
                        Dark mode toggle
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                        <Circle size={16} className="text-gray-600" />
                        Mobile responsive view
                    </li>
                </ul>
            ) : (
                <p className={cn(
                    "whitespace-pre-wrap leading-relaxed",
                    note.type === 'text' ? "text-white text-2xl font-bold font-heading p-0" : "text-gray-400 text-sm"
                )}>
                    {note.content}
                </p>
            )
        )}

        {/* Footer: Tags or Collaborators - Hidden for text notes */}
        {note.type !== 'text' && (
        <div className="flex flex-wrap gap-2 mt-3 items-center">
             {note.tags && note.tags.map(tag => {
                 const category = categories.find(c => c.name === tag);
                 const style = category ? { 
                     backgroundColor: `${category.color}20`, // 20% opacity
                     color: category.color,
                     border: `1px solid ${category.color}40`
                 } : {};
                 
                 return (
                 <span 
                    key={tag} 
                    className={cn("px-2 py-1 text-xs rounded-md font-medium flex items-center gap-1 group/tag cursor-pointer", !category && "bg-white/5 text-gray-400")}
                    style={style}
                 >
                     {tag}
                     <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const newTags = note.tags?.filter(t => t !== tag);
                            updateNote(note.id, { tags: newTags });
                        }}
                        className="hover:text-red-400 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                    >
                        <X size={10} />
                     </button>
                 </span>
                 );
             })}
             
             {/* Add Tag Button */}
            <div className="relative">
                <button
                    className="size-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
                    title="Add Tag"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsTagMenuOpen(!isTagMenuOpen);
                    }}
                >
                    <Plus size={12} />
                </button>
                
                {isTagMenuOpen && (
                     <div className="absolute left-0 top-full mt-2 w-32 bg-gray-800 border border-border-dark rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const currentTags = note.tags || [];
                                    if(!currentTags.includes(cat.name)) {
                                        updateNote(note.id, { tags: [...currentTags, cat.name] });
                                    }
                                    setIsTagMenuOpen(false);
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
        )}

        {note.collaborators && note.collaborators.length > 0 && (
            <div className="flex -space-x-2 mt-4">
                {note.collaborators.map((url, i) => (
                    <div key={i} className="size-6 rounded-full ring-2 ring-surface-dark bg-cover" style={{backgroundImage: `url("${url}")`}} />
                ))}
            </div>
        )}

      </div>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 size-4 bg-white rounded-full border-2 border-primary opacity-0 group-hover:opacity-100 cursor-crosshair z-50 hover:scale-125 transition-all shadow-sm"
           onMouseDown={(e) => { e.stopPropagation(); onConnectStart?.(note.id, 'right', e); }}
           onPointerDownCapture={(e) => { e.stopPropagation(); }}
           onMouseUp={(e) => { e.stopPropagation(); onConnectEnd?.(note.id, 'right', e); }}
      />
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 size-4 bg-white rounded-full border-2 border-primary opacity-0 group-hover:opacity-100 cursor-crosshair z-50 hover:scale-125 transition-all shadow-sm"
           onMouseDown={(e) => { e.stopPropagation(); onConnectStart?.(note.id, 'left', e); }}
           onPointerDownCapture={(e) => { e.stopPropagation(); }}
           onMouseUp={(e) => { e.stopPropagation(); onConnectEnd?.(note.id, 'left', e); }}
      />
      
      {/* Resize Handle */}
      {!isEditing && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 z-50"
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = note.width || 320;
                const startH = note.height || noteRef.current?.offsetHeight || 200;

                const onMouseMove = (moveEvent: MouseEvent) => {
                    const newW = Math.max(200, startW + (moveEvent.clientX - startX));
                    const newH = Math.max(150, startH + (moveEvent.clientY - startY));
                    useCanvasStore.getState().updateNote(note.id, { width: newW, height: newH });
                };

                const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            }}
          >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-gray-500">
                  <path d="M19 5v14H5" />
              </svg>
          </div>
      )}
    </motion.div>
  );
};
