import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { key: 'Space + Drag', description: 'Pan the canvas' },
        { key: 'Shift + Click', description: 'Select multiple notes' },
        { key: 'Wheel / Scroll', description: 'Zoom in / out (with Ctrl)' },
        { key: 'Double Click', description: 'Edit text / Delete line' },
        { key: 'Backspace / Del', description: 'Delete selected item' },
        { key: 'Cmd/Ctrl + K', description: 'Focus search bar' },
        { key: 'Cmd/Ctrl + Z', description: 'Undo last action' },
        { key: 'Cmd/Ctrl + Y', description: 'Redo last action' },
        { key: 'Esc', description: 'Deselect / Return to Select tool' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-2 text-white">
                        <Keyboard className="text-primary" size={20} />
                        <h2 className="font-semibold text-lg">Keyboard Shortcuts</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-1">
                        {shortcuts.map((shortcut, index) => (
                            <div key={index} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group">
                                <span className="text-gray-300 font-medium">{shortcut.description}</span>
                                <kbd className="hidden sm:inline-flex items-center border border-gray-600 bg-gray-800 rounded px-2 py-1 text-xs font-sans font-semibold text-gray-200 shadow-sm group-hover:border-primary/50 transition-colors">
                                    {shortcut.key}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 text-center">
                    <p className="text-xs text-gray-500">
                        Pro tip: Use <kbd className="border border-gray-700 rounded px-1 text-[10px] mx-1">Space</kbd> to toggle pan mode temporarily!
                    </p>
                </div>
            </div>
            
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
};
