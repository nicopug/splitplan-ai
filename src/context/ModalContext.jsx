import React, { createContext, useContext, useState, useRef } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState({
        isOpen: false,
        type: 'confirm', // 'confirm' or 'prompt'
        title: '',
        message: '',
        placeholder: '',
        resolve: null,
    });

    const showConfirm = (title, message) => {
        return new Promise((resolve) => {
            setModal({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                resolve,
            });
        });
    };

    const showPrompt = (title, message, placeholder = '') => {
        return new Promise((resolve) => {
            setModal({
                isOpen: true,
                type: 'prompt',
                title,
                message,
                placeholder,
                resolve,
            });
        });
    };

    const closeModal = (result) => {
        if (modal.resolve) {
            modal.resolve(result);
        }
        setModal(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    return (
        <ModalContext.Provider value={{ modal, showConfirm, showPrompt, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
