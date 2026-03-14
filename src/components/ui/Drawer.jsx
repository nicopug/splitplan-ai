import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

const Drawer = ({ isOpen, onClose, title, children }) => {
    // Disable scrolling when the drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-stretch justify-end bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className={cn(
                    "bg-card w-full sm:max-w-md h-[90vh] sm:h-full border-l border-border-subtle p-8 flex flex-col",
                    "animate-slide-in-right shadow-2xl relative transition-all duration-500"
                )}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-10 transition-all duration-500">
                    <h3 className="m-0 text-2xl font-black text-primary uppercase tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="bg-surface border border-border-subtle text-primary w-10 h-10 rounded-sm cursor-pointer flex items-center justify-center hover:bg-elevated transition-all shadow-sm"
                    >
                        <X className="w-5 h-5 text-primary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Drawer;
