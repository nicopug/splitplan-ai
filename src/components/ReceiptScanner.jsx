import React, { useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { uploadReceipt } from '../api';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

/**
 * ReceiptScanner
 * --------------
 * A single button that opens a hidden file input, sends the selected
 * image/PDF to the backend OCR endpoint, and notifies the parent.
 *
 * Props
 *   tripId     {number}   - ID of the current trip
 *   onSuccess  {function} - called with the new Expense object on success
 *   className  {string}   - extra classes for the button (optional)
 */
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';
const MAX_MB = 5;

const ReceiptScanner = ({ tripId, onSuccess, className }) => {
    const { showToast } = useToast();
    const inputRef = useRef(null);
    const [scanning, setScanning] = useState(false);

    const handleClick = () => {
        if (scanning) return;
        inputRef.current?.click();
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        // Reset input so the same file can be re-selected if needed
        e.target.value = '';
        if (!file) return;

        // Client-side size guard (mirrors backend 5 MB limit)
        if (file.size > MAX_MB * 1024 * 1024) {
            showToast(
                `File troppo grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Il limite è ${MAX_MB} MB.`,
                'error'
            );
            return;
        }

        setScanning(true);
        try {
            const expense = await uploadReceipt(tripId, file);
            const amount = expense.original_amount ?? expense.amount;
            const currency = expense.currency ?? 'EUR';
            showToast(
                `Spesa di ${amount?.toFixed(2)} ${currency} aggiunta automaticamente!`,
                'success'
            );
            onSuccess?.(expense);
        } catch (err) {
            if (err.status === 413) {
                showToast('File troppo grande. Il limite è 5 MB.', 'error');
            } else if (err.status === 422) {
                showToast(
                    'Non riesco a leggere la ricevuta. Inserisci la spesa a mano.',
                    'warning'
                );
            } else {
                showToast('Errore scanner: ' + err.message, 'error');
            }
        } finally {
            setScanning(false);
        }
    };

    return (
        <>
            {/* Hidden file input — click triggered programmatically */}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFile}
            />

            <button
                type="button"
                onClick={handleClick}
                disabled={scanning}
                className={cn(
                    'h-12 px-6 border border-border-strong text-primary font-black uppercase',
                    'text-[10px] tracking-widest transition-all flex items-center gap-2',
                    'hover:bg-surface disabled:opacity-60 disabled:cursor-not-allowed',
                    className
                )}
                title="Scansiona ricevuta con AI"
            >
                {scanning ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
                        <span>L&apos;AI sta leggendo...</span>
                    </>
                ) : (
                    <>
                        <ScanLine size={14} className="flex-shrink-0" />
                        <span>Scansiona Ricevuta</span>
                    </>
                )}
            </button>
        </>
    );
};

export default ReceiptScanner;
