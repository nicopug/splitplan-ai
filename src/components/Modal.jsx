import React, { useState, useEffect } from 'react';
import { useModal } from '../context/ModalContext';

const Modal = () => {
    const { modal, closeModal } = useModal();
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (modal.isOpen) {
            setInputValue('');
        }
    }, [modal.isOpen]);

    if (!modal.isOpen) return null;

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

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={handleCancel}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slideUp border border-gray-100">
                <h3 className="text-xl font-bold text-primary-blue mb-2">{modal.title}</h3>
                <p className="text-gray-600 mb-6">{modal.message}</p>

                {modal.type === 'prompt' && (
                    <input
                        type="text"
                        autoFocus
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={modal.placeholder}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirm();
                            if (e.key === 'Escape') handleCancel();
                        }}
                    />
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleCancel}
                        className="px-6 py-2 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`
                            px-6 py-2 rounded-xl font-semibold text-white transition-all transform hover:scale-105 active:scale-95
                            ${modal.type === 'confirm' && modal.title.toLowerCase().includes('elimina') ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-blue hover:bg-blue-600'}
                        `}
                    >
                        {modal.type === 'prompt' ? 'Conferma' : 'Sì, continua'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default Modal;
