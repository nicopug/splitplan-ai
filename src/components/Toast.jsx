import React from 'react';
import { useToast } from '../context/ToastContext';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const Toast = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4" />;
            case 'error': return <AlertCircle className="h-4 w-4" />;
            case 'info': return <Info className="h-4 w-4" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    const getVariant = (type) => {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'destructive';
            case 'info': return 'info';
            default: return 'default';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 max-w-[90vw] sm:max-w-md pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="animate-in slide-in-from-right-full duration-300 pointer-events-auto shadow-2xl rounded-2xl overflow-hidden"
                >
                    <Alert variant={getVariant(toast.type)} className="border-none bg-white/95 backdrop-blur-md shadow-none relative pr-12">
                        {getIcon(toast.type)}
                        <AlertTitle className="capitalize text-sm font-bold">
                            {toast.type === 'error' ? 'Attenzione' : toast.type === 'success' ? 'Ottimo!' : 'Info'}
                        </AlertTitle>
                        <AlertDescription className="text-gray-600 font-medium">
                            {toast.message}
                        </AlertDescription>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 outline-none"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </Alert>
                </div>
            ))}
        </div>
    );
};

export default Toast;
