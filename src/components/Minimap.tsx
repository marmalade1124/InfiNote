import React from 'react';
import { Scan } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';

export const Minimap: React.FC = () => {
    const { notes, view } = useCanvasStore();
    const MINIMAP_SCALE = 0.1;
    
    return (
        <div className="absolute bottom-8 right-8 z-20 hidden lg:flex flex-col gap-3 pointer-events-none">
            {/* Zoom Controls */}
            <div className="flex flex-col self-end bg-surface-dark rounded-lg shadow-lg border border-border-dark overflow-hidden pointer-events-auto">
                <button 
                    className="p-2 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                    onClick={() => useCanvasStore.getState().zoomIn()}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
                <div className="h-px bg-border-dark w-full"></div>
                <button 
                    className="p-2 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                    onClick={() => useCanvasStore.getState().zoomOut()}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                </button>
            </div>

            {/* Minimap */}
            <div className="w-64 bg-surface-dark rounded-xl border border-border-dark shadow-2xl overflow-hidden p-3 pointer-events-auto">
                <div 
                    className="relative w-full h-32 bg-[#111418] rounded-lg border border-border-dark overflow-hidden cursor-crosshair"
                    onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const handleMove = (moveEvent: MouseEvent) => {
                            const x = moveEvent.clientX - rect.left;
                            const y = moveEvent.clientY - rect.top;
                            
                            // visual offset logic from rendering: (-view.x + 100) * SCALE
                            // so view.x = 100 - (minimapX / SCALE)
                            // But we want to center the view on the mouse position?
                            // If mouse is at `x`, that should be the center of the viewport.
                            // The rendered rect `left` is the top-left corner.
                            // So we want rectCenter to equal x.
                            // rectLeft = x - rectWidth/2
                            // view.x = 100 - (rectLeft / SCALE)
                            
                            const vw = window.innerWidth / view.zoom;
                            const vh = window.innerHeight / view.zoom;
                            
                            const rectW = vw * MINIMAP_SCALE;
                            const rectH = vh * MINIMAP_SCALE;
                            
                            const targetRectLeft = x - (rectW / 2);
                            const targetRectTop = y - (rectH / 2);
                            
                            const newViewX = 100 - (targetRectLeft / MINIMAP_SCALE);
                            const newViewY = 100 - (targetRectTop / MINIMAP_SCALE);
                            
                            useCanvasStore.getState().setViewState({ x: newViewX, y: newViewY });
                        };
                        
                        handleMove(e.nativeEvent); // Immediate update on click
                        
                        const onMouseMove = (me: MouseEvent) => handleMove(me);
                        const onMouseUp = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };
                        
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    }}
                >
                     {/* Notes Representation */}
                     {notes.map(note => (
                         <div 
                            key={note.id}
                            className={`absolute rounded-[1px] ${note.id === '2' ? 'bg-pink-500' : 'bg-gray-500/80'}`}
                            style={{
                                left: note.x * MINIMAP_SCALE,
                                top: note.y * MINIMAP_SCALE,
                                width: (note.width || 320) * MINIMAP_SCALE,
                                height: (note.height || 200) * MINIMAP_SCALE
                            }}
                         />
                     ))}

                     {/* Viewport Indicator */}
                     <div 
                        className="absolute border-2 border-primary bg-primary/10 rounded-sm shadow-sm transition-all duration-75 pointer-events-none"
                        style={{
                            left: (-view.x + 100) * MINIMAP_SCALE, 
                            top: (-view.y + 100) * MINIMAP_SCALE,
                            width: (window.innerWidth / view.zoom) * MINIMAP_SCALE,
                            height: (window.innerHeight / view.zoom) * MINIMAP_SCALE
                        }}
                     />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-[10px] text-gray-500 font-medium">{Math.round(view.zoom * 100)}%</span>
                    <button 
                        className="text-gray-500 hover:text-white transition-colors" 
                        title="Fit to Screen"
                        onClick={() => useCanvasStore.getState().setViewState({ x: 0, y: 0, zoom: 1 })}
                    >
                        <Scan size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
