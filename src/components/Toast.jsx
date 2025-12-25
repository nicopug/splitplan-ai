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
                        bg-white border-l-4
                        ${toast.type === 'success' ? 'border-green-500' :
                            toast.type === 'error' ? 'border-red-500' :
                                'border-primary-blue'}
                        text-black
                    `}
                >
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-lg
                            ${toast.type === 'success' ? 'bg-green-100' :
                                toast.type === 'error' ? 'bg-red-100' :
                                    'bg-blue-100'}
                        `}>
                            {toast.type === 'success' && "✅"}
                            {toast.type === 'error' && "❌"}
                            {toast.type === 'info' && "ℹ️"}
                        </div>
                        <p className="font-semibold text-sm md:text-base text-gray-900">{toast.message}</p>
                    </div>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="ml-4 p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
