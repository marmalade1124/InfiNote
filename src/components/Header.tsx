import React, { useEffect, useState } from 'react';
import { Settings, Share, Download, Grid, Edit2, FileJson, Image as ImageIcon, Wifi, WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { toPng } from 'html-to-image';
import { Link } from 'react-router-dom';
import { ShortcutsModal } from './ShortcutsModal';

interface HeaderProps {
    boardId?: string;
}

export const Header: React.FC<HeaderProps> = ({ boardId }) => {
    const { setSearchQuery, notes, saveBoard, view, setViewState, status } = useCanvasStore();
    const [title, setTitle] = React.useState('My Infinite Board');
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false);
    
    // Local visual state for "Saved!" feedback
    const [visualSaveState, setVisualSaveState] = useState<'idle' | 'saved'>('idle');

    useEffect(() => {
        if (status === 'connected') {
            setVisualSaveState('saved');
            const timer = setTimeout(() => setVisualSaveState('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSave = () => {
        if (boardId) {
             saveBoard(boardId, title);
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'saving': return <RefreshCw size={18} className="animate-spin text-blue-400" />;
            case 'connected': return <Wifi size={18} className="text-green-400" />;
            case 'disconnected': return <WifiOff size={18} className="text-red-400" />;
            case 'connecting': return <RefreshCw size={18} className="animate-spin text-yellow-400" />;
            default: return <Cloud size={18} className="text-gray-400" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'saving': return 'Saving...';
            case 'connected': return 'Online';
            case 'disconnected': return 'Offline';
            case 'connecting': return 'Connecting...';
            default: return 'Online';
        }
    };

    const [isExportOpen, setIsExportOpen] = React.useState(false);

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "infinote-board.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleExportPng = async () => {
        // Find the canvas container (the one with the transform)
        // We'll target the main browser window for "Viewport" capture
        // Or specific element if strict ID is set. Capturing document.body is easiest for "Screenshot"
        const element = document.getElementById('canvas-container'); // Need to ensure ID exists or use body
        if (element) {
             try {
                 const dataUrl = await toPng(element, { backgroundColor: '#101922' });
                 const link = document.createElement('a');
                 link.download = `infinote-export-${Date.now()}.png`;
                 link.href = dataUrl;
                 link.click();
             } catch (err) {
                 console.error('Export failed', err);
                 alert('Failed to export image.');
             }
        } else {
             // Fallback to body
             const dataUrl = await toPng(document.body, { backgroundColor: '#101922' });
             const link = document.createElement('a');
             link.download = `infinote-screenshot-${Date.now()}.png`;
             link.href = dataUrl;
             link.click();
        }
    };
    
    const handleShare = () => {
        alert("Link copied to clipboard! (Simulation)");
    };

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-border-dark bg-background-dark px-6 py-3 z-50">
            {/* ... Left Section ... */}
            <div className="flex items-center gap-4 text-white w-auto md:w-60 shrink-0">
                <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mr-2" title="Back to Dashboard">
                    <div className="p-1.5 rounded-md hover:bg-white/10">
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </div>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="size-6 flex items-center justify-center text-primary">
                        <Grid size={24} />
                    </div>
                </div>
                {/* Editable Title */}
                <div className="hidden sm:flex items-center gap-2 group/title">
                    {isEditingTitle ? (
                         <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                            autoFocus
                            className="bg-transparent text-white text-lg font-display font-bold leading-tight tracking-[-0.015em] outline-none border-b border-primary w-40"
                         />
                    ) : (
                        <h2 
                            onClick={() => setIsEditingTitle(true)}
                            className="text-white text-lg font-display font-bold leading-tight tracking-[-0.015em] cursor-pointer hover:text-gray-200"
                        >
                            {title}
                        </h2>
                    )}
                    <Edit2 size={12} className="text-gray-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                </div>
            </div>
            
            {/* ... Search Bar ... */}
            <div className="flex-1 max-w-2xl px-4 md:px-8">
                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <span className="material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors">search</span>
                    </div>
                    <input 
                        ref={searchInputRef}
                        className="block w-full rounded-lg border border-border-dark bg-surface-dark text-white placeholder-gray-500 pl-10 pr-12 h-10 focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm text-sm" 
                        placeholder="Search notes, tags, or content..." 
                        type="text"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <kbd className="hidden sm:inline-flex items-center border border-gray-600 rounded px-1.5 py-0.5 text-[10px] font-sans font-medium text-gray-400">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center justify-end gap-3 w-auto shrink-0">
                 {/* Shortcuts Button */}
                 <button 
                    onClick={() => setIsShortcutsOpen(true)}
                    className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent text-gray-400 hover:text-white hover:bg-[#374151] transition-colors"
                    title="Keyboard Shortcuts (?)"
                >
                    <span className="text-sm font-bold">?</span>
                </button>
                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                {boardId && (
                    <button 
                        onClick={handleSave}
                        disabled={status === 'saving' || status === 'disconnected'}
                        className={`flex items-center gap-2 h-9 px-3 rounded-lg transition-all font-medium text-sm
                            ${visualSaveState === 'saved' ? 'bg-green-500/20 text-green-400' : 'bg-surface-dark border border-border-dark text-gray-300 hover:bg-[#374151]'}
                        `}
                        title={`Status: ${getStatusText()}`}
                    >
                         {status === 'saving' ? (
                             <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                         ) : visualSaveState === 'saved' ? (
                             <span className="material-symbols-outlined text-[18px]">check</span>
                         ) : (
                             getStatusIcon()
                         )}
                         <span className="hidden sm:inline">
                             {status === 'saving' ? 'Saving...' : visualSaveState === 'saved' ? 'Saved' : getStatusText()}
                         </span>
                    </button>
                )}
                

                
                <button 
                    className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent text-gray-400 hover:text-white hover:bg-[#374151] transition-colors" 
                    title="Undo (Ctrl+Z)" 
                    onClick={() => useCanvasStore.getState().undo()}
                >
                    <span className="material-symbols-outlined text-[20px]">undo</span>
                </button>
                <button 
                    className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent text-gray-400 hover:text-white hover:bg-[#374151] transition-colors" 
                    title="Redo (Ctrl+Y)" 
                    onClick={() => useCanvasStore.getState().redo()}
                >
                    <span className="material-symbols-outlined text-[20px]">redo</span>
                </button>
                
                <div className="relative">
                    <button 
                        className={`flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg transition-colors ${isSettingsOpen ? 'bg-primary text-white' : 'bg-border-dark text-white hover:bg-[#374151]'}`} 
                        title="Settings"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    >
                        <Settings size={20} />
                    </button>
                    
                    {isSettingsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-surface-dark border border-border-dark rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                            <div className="p-2 space-y-1">
                                <button 
                                    className="w-full flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-white/5 rounded transition-colors"
                                    onClick={() => {
                                        setViewState({ showGrid: !view.showGrid });
                                    }}
                                >
                                    <span>Show Grid</span>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${view.showGrid ? 'bg-primary' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 size-3 bg-white rounded-full transition-all ${view.showGrid ? 'left-4.5' : 'left-0.5'}`} style={{ left: view.showGrid ? 'calc(100% - 14px)' : '2px' }} />
                                    </div>
                                </button>
                                
                                <button 
                                    className="w-full flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-white/5 rounded transition-colors"
                                    onClick={() => {
                                         setViewState({ snapToGrid: !view.snapToGrid });
                                    }}
                                >
                                    <span>Snap to Grid</span>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${view.snapToGrid ? 'bg-primary' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-0.5 size-3 bg-white rounded-full transition-all`} style={{ left: view.snapToGrid ? 'calc(100% - 14px)' : '2px' }} />
                                    </div>
                                </button>
                            </div>
                            
                            <div className="border-t border-gray-700 my-1" />
                            
                            <div className="p-2">
                                <button 
                                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    onClick={() => {
                                        if(confirm('Are you sure you want to clear the entire canvas?')) {
                                            useCanvasStore.getState().resetCanvas();
                                            setIsSettingsOpen(false);
                                        }
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                    Clear Canvas
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setIsExportOpen(!isExportOpen)}
                        className={`flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg transition-colors ${isExportOpen ? 'bg-primary text-white' : 'bg-border-dark text-white hover:bg-[#374151]'}`} 
                        title="Export"
                    >
                        <Download size={20} />
                    </button>

                    {isExportOpen && (
                         <div className="absolute top-full right-0 mt-2 w-48 bg-surface-dark border border-border-dark rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                            <div className="p-2 space-y-1">
                                <button 
                                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-white/5 rounded transition-colors"
                                    onClick={() => {
                                        handleExportJson();
                                        setIsExportOpen(false);
                                    }}
                                >
                                    <FileJson size={16} className="text-blue-400" />
                                    <span>Export as JSON</span>
                                </button>
                                
                                <button 
                                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-white/5 rounded transition-colors"
                                    onClick={() => {
                                        handleExportPng();
                                        setIsExportOpen(false);
                                    }}
                                >
                                    <ImageIcon size={16} className="text-green-400" />
                                    <span>Export as PNG</span>
                                </button>
                            </div>
                         </div>
                    )}
                </div>
                <button 
                    onClick={handleShare}
                    className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-border-dark text-white hover:bg-[#374151] transition-colors" 
                    title="Share Board"
                >
                    <Share size={20} />
                </button>
            </div>
            <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        </header>
    );
};
