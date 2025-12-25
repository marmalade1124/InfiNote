import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useCanvasStore } from "../store/canvasStore";
import { NoteItem } from "./NoteItem";
import { Toolbar } from "./Toolbar";

export const InfiniteCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
    const { notes, connections, addConnection, view, pan, zoomIn, zoomOut, interactionMode, deselectAll, searchQuery, activeCategory, deleteConnection, selectedConnectionId, selectConnection } = useCanvasStore();
    const [isDragging, setIsDragging] = React.useState(false);
    
    // Global Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea or contentEditable
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            // Delete Note or Connection
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedConnectionId) {
                    deleteConnection(selectedConnectionId);
                } else {
                    useCanvasStore.getState().deleteSelectedNotes();
                }
            }
            
            // Undo / Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    useCanvasStore.getState().redo();
                } else {
                    useCanvasStore.getState().undo();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                useCanvasStore.getState().redo();
            }

            // Space -> Pan Mode
            if (e.code === 'Space' && useCanvasStore.getState().interactionMode !== 'pan') {
                useCanvasStore.getState().setInteractionMode('pan');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
             if (e.code === 'Space' && useCanvasStore.getState().interactionMode === 'pan') {
                 useCanvasStore.getState().setInteractionMode('select');
             }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [selectedConnectionId, deleteConnection]);
    
    // Connection Logic
    const [connectingFrom, setConnectingFrom] = React.useState<{ id: string, handle: 'left' | 'right' } | null>(null);
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  // Handle wheel for pan and zoom
  useEffect(() => {
    // ... existing wheel logic ...
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        if (e.deltaY > 0) zoomOut();
        else zoomIn();
      } else {
        pan(-e.deltaX, -e.deltaY);
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [pan, zoomIn, zoomOut]);
  
    // Drawing Logic
    const [currentPath, setCurrentPath] = React.useState<{ x: number, y: number }[]>([]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (interactionMode === 'draw') {
             setIsDragging(true); // Re-use dragging state for drawing loop
             const rect = containerRef.current?.getBoundingClientRect();
             if(rect) {
                 const x = (e.clientX - rect.left - view.x) / view.zoom;
                 const y = (e.clientY - rect.top - view.y) / view.zoom;
                 setCurrentPath([{ x, y }]);
             }
        } else if (interactionMode === 'text') {
             const rect = containerRef.current?.getBoundingClientRect();
             if(rect) {
                 const x = (e.clientX - rect.left - view.x) / view.zoom;
                 const y = (e.clientY - rect.top - view.y) / view.zoom;
                 
                 // Create Text Note
                 useCanvasStore.getState().addNote({
                     x, y,
                     title: '',
                     content: 'Type here...',
                     type: 'text',
                     color: 'gray' // Default, doesn't matter much
                 });
                 useCanvasStore.getState().setInteractionMode('select');
             }
        } else if (e.button === 1 || e.buttons === 4 || (e.button === 0 && e.shiftKey) || (interactionMode === 'pan' && e.button === 0)) {
            setIsDragging(true);
            e.preventDefault();
        } else if (e.button === 0 && interactionMode === 'select') {
             if (e.target === e.currentTarget) {
                 deselectAll();
             }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            if (interactionMode === 'draw') {
                 const rect = containerRef.current?.getBoundingClientRect();
                 if(rect) {
                     const x = (e.clientX - rect.left - view.x) / view.zoom;
                     const y = (e.clientY - rect.top - view.y) / view.zoom;
                     setCurrentPath(prev => [...prev, { x, y }]);
                 }
            } else {
                pan(e.movementX, e.movementY);
            }
        }
        
        // Update connection line
        if (connectingFrom) {
            const rect = containerRef.current?.getBoundingClientRect();
             if (rect) {
                 setMousePos({
                     x: (e.clientX - rect.left - view.x) / view.zoom,
                     y: (e.clientY - rect.top - view.y) / view.zoom
                 });
             }
        }
    };

    const handleMouseUp = () => {
        if (interactionMode === 'draw' && isDragging && currentPath.length > 1) {
            useCanvasStore.getState().addDrawing({
                id: crypto.randomUUID(),
                points: currentPath,
                color: '#ef4444', // Red for now, or use active color
                strokeWidth: 3
            });
            setCurrentPath([]);
        }
        setIsDragging(false);
        if (connectingFrom) {
            setConnectingFrom(null); // Cancel connection if dropped on canvas
        }
    };

    // Connection Helpers
    const getHandlePosition = (id: string, handle: 'left' | 'right' | undefined) => {
        const note = notes.find(n => n.id === id);
        if (!note) return { x: 0, y: 0 };
        const w = note.width || 320;
        // const h = note.height || 200;
        
        // Better vertical centering if height is known, else fallback to roughly 80-100px down
        const yCenter = note.height ? note.y + (note.height / 2) : note.y + 100;

        if (handle === 'left') return { x: note.x, y: yCenter };
        if (handle === 'right') return { x: note.x + w, y: yCenter };
        return { x: note.x + w/2, y: yCenter };
    };

    const handleConnectStart = (id: string, handle: 'left' | 'right', e: React.MouseEvent) => {
        if (interactionMode !== 'draw') { // Prevent connection while drawing
            setConnectingFrom({ id, handle });
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                 setMousePos({
                     x: (e.clientX - rect.left - view.x) / view.zoom,
                     y: (e.clientY - rect.top - view.y) / view.zoom
                 });
            }
        }
    };

    const handleConnectEnd = (id: string, handle: 'left' | 'right', _e: React.MouseEvent) => {
        if (connectingFrom && connectingFrom.id !== id) {
            addConnection({
                id: crypto.randomUUID(),
                fromId: connectingFrom.id,
                toId: id,
                sourceHandle: connectingFrom.handle,
                targetHandle: handle,
                type: 'curve',
                color: '#6b7280',
                strokeWidth: 2
            });
            setConnectingFrom(null);
        }
    };

    // Helper to convert points to SVG path
    const pointsToPath = (points: {x: number, y: number}[]) => {
        if (points.length === 0) return '';
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return d;
    };


  return (
    <div 
        ref={containerRef} 
        className={`w-full h-full relative overflow-hidden bg-background-dark ${
            interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 
            interactionMode === 'draw' ? 'cursor-crosshair' : 
            interactionMode === 'text' ? 'cursor-text' : 
            interactionMode === 'eraser' ? 'cursor-[url(https://bytes.dev/eraser.png),_auto] cursor-cell' : 
            'cursor-default'
        }`} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {/* Background Dot Pattern */}
      {view.showGrid && (
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
            backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', // Lighter gray for visibility
            backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
            opacity: 0.3 // Explicit opacity
        }}
      />
      )}

      {/* Canvas Content Container */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full origin-top-left"
        style={{
          x: view.x,
          y: view.y,
          scale: view.zoom,
        }}
        transition={{ type: "tween", ease: "linear", duration: 0 }}
      >
        {/* Drawings Layer (Behind connections) */}
        <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0" style={{ width: '10000px', height: '10000px' }}>
             {useCanvasStore.getState().drawings.map(drawing => (
                 <path
                    key={drawing.id}
                    d={pointsToPath(drawing.points)}
                    stroke={drawing.color}
                    strokeWidth={drawing.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-auto"
                     onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Optional: Select or Delete on double click?
                        useCanvasStore.getState().deleteDrawing(drawing.id);
                    }}
                    onMouseEnter={(e) => {
                        if (useCanvasStore.getState().interactionMode === 'eraser' && e.buttons === 1) {
                             useCanvasStore.getState().deleteDrawing(drawing.id);
                        }
                    }}
                    onClick={(e) => {
                         if (useCanvasStore.getState().interactionMode === 'eraser') {
                             e.stopPropagation();
                             useCanvasStore.getState().deleteDrawing(drawing.id);
                         }
                    }}
                 />
             ))}
             {/* Current Drawing being drawn */}
             {currentPath.length > 0 && (
                 <path 
                    d={pointsToPath(currentPath)}
                    stroke="#ef4444"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                 />
             )}
        </svg>

        {/* Connections Layer */}
        <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0" style={{ width: '10000px', height: '10000px' }}>
             <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
            </defs>
            
            {connections.map(conn => {
                const start = getHandlePosition(conn.fromId, conn.sourceHandle);
                const end = getHandlePosition(conn.toId, conn.targetHandle);
                
                let d = '';
                if (conn.type === 'straight') {
                    d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                } else {
                    // Bezier curve (default)
                    const c1x = start.x + (conn.sourceHandle === 'left' ? -50 : 50);
                    const c2x = end.x + (conn.targetHandle === 'left' ? -50 : 50);
                    d = `M ${start.x} ${start.y} C ${c1x} ${start.y} ${c2x} ${end.y} ${end.x} ${end.y}`;
                }
                
                return (
                     <motion.path 
                        key={conn.id}
                        d={d}
                        stroke={selectedConnectionId === conn.id ? "#3b82f6" : (conn.color || "#6b7280")} 
                        strokeWidth={selectedConnectionId === conn.id ? 4 : (conn.strokeWidth || 2)} 
                        fill="none"
                        markerEnd="url(#arrowhead)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="cursor-pointer hover:stroke-primary transition-colors pointer-events-auto"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectConnection(conn.id);
                        }}
                    />
                );
            })}

            {/* Dragging Line */}
            {connectingFrom && (
                <path 
                    d={`M ${getHandlePosition(connectingFrom.id, connectingFrom.handle).x} ${getHandlePosition(connectingFrom.id, connectingFrom.handle).y} L ${mousePos.x} ${mousePos.y}`}
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="5,5"
                />
            )}
        </svg>

        {notes.map((note) => {
            // Filter Logic
            const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  note.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesCategory = !activeCategory || note.tags?.includes(activeCategory);
            const isDimmed = (searchQuery || activeCategory) && (!matchesSearch || !matchesCategory);

            return (
              <div key={note.id} className={`transition-opacity duration-300 ${isDimmed ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                  <NoteItem 
                    note={note} 
                    onConnectStart={handleConnectStart}
                    onConnectEnd={handleConnectEnd}
                  />
              </div>
            );
        })}
        
        {/* Selected Connection Toolbar */}
        {selectedConnectionId && (() => {
            const conn = connections.find(c => c.id === selectedConnectionId);
            if (!conn) return null;
            
            // Calculate midpoint for toolbar position
            const start = getHandlePosition(conn.fromId, conn.sourceHandle);
            const end = getHandlePosition(conn.toId, conn.targetHandle);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
                <div 
                    className="absolute bg-surface-dark border border-border-dark p-2 rounded-lg shadow-xl flex gap-2 z-50 pointer-events-auto"
                    style={{ 
                        left: midX, 
                        top: midY - 40,
                        transform: 'translate(-50%, -100%)' 
                    }}
                >
                    {/* Curve/Straight Toggle */}
                    <button 
                         onClick={() => useCanvasStore.getState().updateConnection(conn.id, { type: conn.type === 'straight' ? 'curve' : 'straight' })}
                         className="p-1 hover:bg-white/10 rounded text-gray-300"
                         title="Toggle Line Style"
                    >
                        {conn.type === 'straight' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M4 12h16" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M4 18c0-5 5-12 16-12" /></svg>
                        )}
                    </button>
                    
                    {/* Color Picker (Mini) */}
                    <div className="flex gap-1 border-l border-gray-700 pl-2 ml-1">
                        {['#6b7280', '#ef4444', '#3b82f6', '#10b981'].map(c => (
                            <button
                                key={c}
                                className={`size-4 rounded-full ${conn.color === c ? 'ring-2 ring-white' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => useCanvasStore.getState().updateConnection(conn.id, { color: c })}
                            />
                        ))}
                    </div>

                    <div className="w-px bg-gray-700 mx-1" />
                    
                    <button 
                        onClick={() => useCanvasStore.getState().deleteConnection(conn.id)} 
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        title="Delete Connection"
                    >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                    
                    <div className="w-px bg-gray-700 mx-1" />

                    <button 
                        onClick={() => useCanvasStore.getState().selectConnection(null)} 
                        className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                        title="Done"
                    >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M20 6 9 17l-5-5" /></svg>
                    </button>
                </div>
            );
        })()}

      </motion.div>
      
      {/* Floating Toolbar is now in App.tsx layout? No, HTML has it absolute positioned relative to main. 
          Actually user HTML structure has Toolbar inside <main>. 
          My InfiniteCanvas IS <main> equivalent in function but App.tsx wraps it.
          Let's leave Toolbar here for now as it's absolute positioned.
      */}
      <Toolbar />
      
    </div>
  );
};
