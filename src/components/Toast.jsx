import React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const Toast = () => {
    const { t } = useTranslation();
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
                    className="animate-in slide-in-from-right-full duration-300 pointer-events-auto shadow-[var(--shadow-xl)] rounded-xl overflow-hidden"
                >
                    <Alert variant={getVariant(toast.type)} className="border border-[var(--border-medium)] bg-[var(--bg-card)] backdrop-blur-md relative pr-12 text-[var(--text-primary)] transition-colors duration-500">
                        <div className="text-[var(--accent-primary)]">
                            {getIcon(toast.type)}
                        </div>
                        <AlertTitle className="capitalize text-sm font-bold pr-4 text-[var(--text-primary)]">
                            {toast.type === 'error' ? (t('common.attention', 'Attenzione')) : toast.type === 'success' ? (t('common.great', 'Ottimo!')) : 'Info'}
                        </AlertTitle>
                        <AlertDescription className="text-[var(--text-muted)] font-medium pr-4">
                            {toast.message}
                        </AlertDescription>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="absolute top-4 right-4 p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors text-[var(--text-subtle)] hover:text-[var(--text-primary)] outline-none"
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
