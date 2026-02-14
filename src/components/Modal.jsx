import React from 'react';
import { useModal } from '../context/ModalContext';

const Modal = () => {
    const { modal, closeModal } = useModal();

    if (!modal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <h3 className="text-2xl font-bold mb-4 text-primary-blue">{modal.title}</h3>
                <p className="text-text-muted mb-8">{modal.message}</p>

                {modal.type === 'prompt' && (
                    <input
                        autoFocus
                        type="text"
                        placeholder={modal.placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20 outline-none mb-6 transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') closeModal(e.target.value);
                            if (e.key === 'Escape') closeModal(null);
                        }}
                    />
                )}

                <div className="flex gap-4 justify-end">
                    <button
                        onClick={() => closeModal(null)}
                        className="px-6 py-2 rounded-full font-semibold text-gray-500 hover:bg-gray-100 transition-all"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => {
                            if (modal.type === 'prompt') {
                                const input = document.querySelector('input[type="text"]');
                                closeModal(input ? input.value : '');
                            } else {
                                closeModal(true);
                            }
                        }}
                        className="px-8 py-2 rounded-full font-semibold text-white bg-primary-blue hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                    >
                        {modal.type === 'prompt' ? 'Invia' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
