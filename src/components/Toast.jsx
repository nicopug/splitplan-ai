import React from 'react';
import { useToast } from '../context/ToastContext';

const Toast = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-[90vw] sm:max-w-md">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        flex items-center justify-between p-4 rounded-xl shadow-2xl 
                        animate-slideLeft transition-all duration-300
                        ${toast.type === 'success' ? 'bg-green-600' :
                            toast.type === 'error' ? 'bg-red-600' :
                                'bg-primary-blue'}
                        text-white border border-white/20
                    `}
                >
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' && <span className="text-xl">✅</span>}
                        {toast.type === 'error' && <span className="text-xl">❌</span>}
                        {toast.type === 'info' && <span className="text-xl">ℹ️</span>}
                        <p className="font-medium text-sm md:text-base">{toast.message}</p>
                    </div>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}

            <style jsx>{`
                @keyframes slideLeft {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .animate-slideLeft {
                    animation: slideLeft 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Toast;
