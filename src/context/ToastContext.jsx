import { useToast as useShadcnToast } from '../hooks/use-toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const { toast } = useShadcnToast();

    const showToast = useCallback((message, type = 'info') => {
        toast({
            title: type === 'error' ? 'Errore' : (type === 'success' ? 'Successo' : 'Info'),
            description: message,
            variant: type === 'error' ? 'destructive' : 'default',
        });
    }, [toast]);

    return (
        <ToastContext.Provider value={{ showToast, toasts: [] }}>
            {children}
        </ToastContext.Provider>
    );
};
