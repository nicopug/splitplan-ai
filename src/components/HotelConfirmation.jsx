import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmHotel, extractReceiptData } from '../api';
import { useToast } from '../context/ToastContext';
import { Upload, FileText, Sparkles, Loader2, Info, X } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const HotelConfirmation = ({ trip, onConfirm, setIsGenerating, setProgress }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [flightCost, setFlightCost] = useState('');
    const [hotelCost, setHotelCost] = useState('');
    const [arrivalTime, setArrivalTime] = useState('');
    const [returnTime, setReturnTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(null); // 'hotel' o 'transport'
    const [extractionError, setExtractionError] = useState(null);

    const hotelInputRef = useRef(null);
    const transportInputRef = useRef(null);

    const handleExtract = async (file, type) => {
        if (!file) return;
        setExtracting(type);
        setExtractionError(null);
        showToast(t('hotelConfirm.toast.reading', { type: type === 'hotel' ? 'hotel' : 'trasporto' }), "info");

        try {
            const res = await extractReceiptData(file, type);

            if (res.success) {
                const data = res.data;
                if (type === 'hotel') {
                    if (data.hotel_name) setHotelName(data.hotel_name);
                    if (data.hotel_address) setHotelAddress(data.hotel_address);
                    if (data.hotel_cost) setHotelCost(data.hotel_cost.toString());
                    if (data.arrival_time) setArrivalTime(data.arrival_time);
                    if (data.return_time) setReturnTime(data.return_time);
                } else {
                    if (data.transport_cost) setFlightCost(data.transport_cost.toString());
                    if (data.arrival_time) setArrivalTime(data.arrival_time);
                    if (data.return_time) setReturnTime(data.return_time);
                }
                showToast(t('hotelConfirm.toast.success', "Dati estratti con successo! Verifica i campi."), "success");
            } else {
                setExtractionError(res.message || "L'IA non è riuscita a leggere i dati. Compila pure a mano.");
            }
        } catch (error) {
            console.error("Extraction error:", error);
            setExtractionError("Servizio di analisi temporaneamente non disponibile. Procedi manualmente.");
        } finally {
            setExtracting(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (setIsGenerating) setIsGenerating(true);
        if (setProgress) setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                if (setProgress) {
                    setProgress(prev => {
                        if (prev >= 92) {
                            clearInterval(progressInterval);
                            return 92;
                        }
                        return prev + 2;
                    });
                }
            }, 300);

            await confirmHotel(trip.id, {
                hotel_name: hotelName,
                hotel_address: hotelAddress,
                transport_cost: parseFloat(flightCost) || 0,
                hotel_cost: parseFloat(hotelCost) || 0,
                arrival_time: arrivalTime,
                return_time: returnTime,
                transport_mode: trip.transport_mode
            });

            clearInterval(progressInterval);
            if (setProgress) setProgress(100);

            await new Promise(r => setTimeout(r, 800));

            showToast(t('hotelConfirm.toast.confirmed', "Logistica confermata! Itinerario generato."), "success");
            onConfirm();
        } catch (error) {
            console.error("Error confirming hotel:", error);
            showToast(t('hotelConfirm.toast.error', "Errore nella conferma dell'hotel."), "error");
        } finally {
            setLoading(false);
            if (setIsGenerating) setIsGenerating(false);
        }
    };


    return (
        <div className="container py-12 animate-fade-in">
            <div className="premium-card max-w-4xl mx-auto bg-card border-border-subtle shadow-xl">
                <div className="text-center mb-12 space-y-4">
                    <span className="subtle-heading">Step 2: {t('hotelConfirm.title', 'Conferma Logistica')}</span>
                    <p className="text-muted text-sm mt-2">
                        <span dangerouslySetInnerHTML={{
                            __html: t('hotelConfirm.subtitle', {
                                mode: trip.transport_mode === 'TRAIN' ? t('hotelConfirm.modeTrain') : trip.transport_mode === 'CAR' ? t('hotelConfirm.modeCar') : t('hotelConfirm.modeFlight')
                            })
                        }} />
                    </p>
                </div>

                {extractionError && (
                    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Alert variant="info" className="bg-primary-blue/5 border-primary-blue/20 text-primary-blue rounded-sm relative pr-12">
                            <Info className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <AlertTitle className="text-primary font-bold mb-1 uppercase tracking-wider text-[10px]">
                                    {t('hotelConfirm.aiNote', "Nota dall'AI SplitPlan")}
                                </AlertTitle>
                                <AlertDescription className="text-muted text-xs">
                                    {extractionError}
                                </AlertDescription>
                            </div>
                            <button
                                onClick={() => setExtractionError(null)}
                                className="absolute top-4 right-4 p-1 hover:bg-muted/10 rounded-sm transition-colors text-subtle hover:text-primary outline-none"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </Alert>
                    </div>
                )}

                {/* Automation Buttons */}
                <div className="flex flex-wrap gap-4 justify-center mb-12">
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            ref={hotelInputRef}
                            onChange={(e) => handleExtract(e.target.files[0], 'hotel')}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => hotelInputRef.current.click()}
                            disabled={extracting === 'hotel'}
                            className="h-14 px-8 flex items-center gap-3 group"
                        >
                            {extracting === 'hotel' ? <Loader2 className="w-4 h-4 animate-spin text-primary-blue" /> : <Upload className="w-4 h-4 text-muted group-hover:text-primary-blue transition-colors" />}
                            <span className="text-[10px] font-black tracking-widest uppercase">
                                {t('hotelConfirm.uploadHotel', "Carica prenotazione Hotel")}
                            </span>
                        </Button>
                    </div>

                    {trip.transport_mode !== 'CAR' && (
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                ref={transportInputRef}
                                onChange={(e) => handleExtract(e.target.files[0], 'transport')}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => transportInputRef.current.click()}
                                disabled={extracting === 'transport'}
                                className="h-14 px-8 flex items-center gap-3 group"
                            >
                                {extracting === 'transport' ? <Loader2 className="w-4 h-4 animate-spin text-primary-blue" /> : <Upload className="w-4 h-4 text-muted group-hover:text-primary-blue transition-colors" />}
                                <span className="text-[10px] font-black tracking-widest uppercase">
                                    {t('hotelConfirm.uploadTransport', { mode: trip.transport_mode === 'TRAIN' ? t('hotelConfirm.modeTrain') : t('hotelConfirm.modeFlight') })}
                                </span>
                            </Button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2">
                        <label className="subtle-heading block mb-2">{t('hotelConfirm.hotelLabel', 'Nome Hotel / Airbnb')}</label>
                        <input
                            type="text"
                            value={hotelName}
                            onChange={(e) => setHotelName(e.target.value)}
                            placeholder={t('hotelConfirm.hotelPlaceholder', "Es. Hotel Colosseo")}
                            required
                            className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="subtle-heading block mb-2">{t('hotelConfirm.addressLabel', 'Indirizzo / Zona')}</label>
                        <input
                            type="text"
                            value={hotelAddress}
                            onChange={(e) => setHotelAddress(e.target.value)}
                            placeholder={t('hotelConfirm.addressPlaceholder', "Es. Via dei Fori Imperiali, Roma")}
                            required
                            className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                        />
                    </div>

                    {trip.transport_mode !== 'CAR' && (
                        <div>
                            <label className="subtle-heading block mb-2">
                                {t('hotelConfirm.transportCostLabel', { mode: trip.transport_mode === 'TRAIN' ? 'Treno' : 'Volo' })}
                            </label>
                            <input
                                type="number"
                                value={flightCost}
                                onChange={(e) => setFlightCost(e.target.value)}
                                placeholder="Es. 250"
                                required
                                className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                            />
                        </div>
                    )}

                    <div>
                        <label className="subtle-heading block mb-2">{t('hotelConfirm.hotelCostLabel', 'Costo Hotel Totale (€)')}</label>
                        <input
                            type="number"
                            value={hotelCost}
                            onChange={(e) => setHotelCost(e.target.value)}
                            placeholder="Es. 500"
                            required
                            className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="subtle-heading block mb-2">
                            {trip.transport_mode === 'FLIGHT' ? t('hotelConfirm.arrivalLabel', { mode: 'Volo' }) :
                                trip.transport_mode === 'TRAIN' ? t('hotelConfirm.arrivalLabel', { mode: 'Treno' }) : t('hotelConfirm.arrivalDest', 'Arrivo a Destinazione')}
                        </label>
                        <input
                            type="time"
                            value={arrivalTime}
                            onChange={(e) => setArrivalTime(e.target.value)}
                            required
                            className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="subtle-heading block mb-2">
                            {trip.transport_mode === 'FLIGHT' ? t('hotelConfirm.returnLabel', { mode: 'Volo' }) :
                                trip.transport_mode === 'TRAIN' ? t('hotelConfirm.returnLabel', { mode: 'Treno' }) : t('hotelConfirm.returnStart', 'Partenza per il Ritorno')}
                        </label>
                        <input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            required
                            className="w-full bg-surface border border-border-subtle rounded-sm p-4 text-primary placeholder:text-subtle focus:border-primary-blue outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="md:col-span-2 mt-8">
                        <Button
                            type="submit"
                            variant="default"
                            disabled={loading}
                            className="w-full h-16 text-xs tracking-[0.2em] uppercase font-black"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('hotelConfirm.generatingBtn', 'Generazione Itinerario...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {t('hotelConfirm.submitBtn', 'Salva e Genera Itinerario')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HotelConfirmation;
