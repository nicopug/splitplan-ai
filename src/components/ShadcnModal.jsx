import React, { useState, useEffect } from 'react';
import { useModal } from '../context/ModalContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ShadcnModal = () => {
    const { modal, closeModal } = useModal();
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (modal.isOpen) {
            setInputValue('');
        }
    }, [modal.isOpen]);

    const handleConfirm = () => {
        if (modal.type === 'prompt') {
            closeModal(inputValue);
        } else {
            closeModal(true);
        }
    };

    const handleCancel = () => {
        closeModal(null);
    };

    // Determina se il bottone di conferma deve essere distruttivo
    const isDestructive = modal.title.toLowerCase().includes('elimina') ||
        modal.title.toLowerCase().includes('reset') ||
        modal.title.toLowerCase().includes('rimuovi');

    return (
        <Dialog open={modal.isOpen} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-md border-white/10 bg-slate-950/95 backdrop-blur-xl text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-blue-400">
                        {modal.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 py-2">
                        {modal.message}
                    </DialogDescription>
                </DialogHeader>

                {modal.type === 'prompt' && (
                    <div className="py-4">
                        <Input
                            autoFocus
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={modal.placeholder}
                            className="bg-slate-900 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                        />
                    </div>
                )}

                <DialogFooter className="flex gap-2 sm:justify-end mt-4">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="hover:bg-white/5 text-slate-400 hover:text-white"
                    >
                        Annulla
                    </Button>
                    <Button
                        variant={isDestructive ? "destructive" : "premium"}
                        onClick={handleConfirm}
                        className={!isDestructive ? "bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20" : ""}
                    >
                        {modal.type === 'prompt' ? 'Conferma' : 'Continua'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShadcnModal;
