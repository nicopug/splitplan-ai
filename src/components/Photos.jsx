import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadPhoto, getPhotos, deletePhoto } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { Button } from './ui/button';
import { Camera, Plus } from 'lucide-react';

const Photos = ({ trip, readOnly = false, sharedPhotos = [] }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [photos, setPhotos] = useState((readOnly && sharedPhotos) ? sharedPhotos : []);
    const [loading, setLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null); // Stato per la foto ingrandita
    const fileInputRef = useRef(null);

    const fetchPhotos = async () => {
        try {
            const data = await getPhotos(trip.id);
            setPhotos(data);
        } catch (error) {
            console.error("Error fetching photos:", error);
        }
    };

    useEffect(() => {
        if (!readOnly) {
            fetchPhotos();
        }
    }, [trip.id, readOnly]);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleDelete = async (photoId) => {
        const confirmed = await showConfirm(
            t('photos.deleteConfirmTitle', "Elimina Foto"),
            t('photos.deleteConfirmDesc', "Sei sicuro di voler eliminare questa foto? L'azione è irreversibile.")
        );
        if (!confirmed) return;

        try {
            await deletePhoto(photoId);
            setPhotos(photos.filter(p => p.id !== photoId));
            if (selectedPhoto && selectedPhoto.id === photoId) {
                setSelectedPhoto(null); // Chiudi se elimini la foto aperta
            }
            showToast(t('photos.toast.photoDeleted', "Foto eliminata con successo."), "success");
        } catch (error) {
            showToast(t('photos.toast.deleteError', "Errore nell'eliminazione della foto: ") + error.message, "error");
        }
    };


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            await uploadPhoto(trip.id, file);
            await fetchPhotos(); // Refresh list
            showToast(t('photos.toast.photoUploaded', "Foto caricata con successo!"), "success");
        } catch (error) {
            showToast(t('photos.toast.uploadError', "Errore nel caricamento della foto: ") + error.message, "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container py-12 space-y-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-4 text-center md:text-left">
                    <span className="subtle-heading">{t('photos.gallery', 'Gallery')}</span>
                    <h2 className="text-primary text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                        {t('photos.title', 'Foto del viaggio')}
                    </h2>
                    <p className="text-muted text-sm max-w-xl">
                        {t('photos.subtitle', 'Cattura e condividi i momenti migliori con il tuo gruppo.')}
                    </p>
                </div>

                {!readOnly && (
                    <Button
                        onClick={handleUploadClick}
                        variant="accent"
                        className="h-12 px-8 font-black uppercase text-[10px] tracking-widest"
                        disabled={loading}
                    >
                        {loading ? t('photos.loading', 'Caricamento...') : t('photos.addPhoto', '+ Aggiungi Foto')}
                    </Button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                />
            </div>

            {photos.length === 0 ? (
                <div className="premium-card !p-20 text-center flex flex-col items-center gap-4 bg-card border-border-subtle">
                    <div className="text-5xl opacity-40">📸</div>
                    <div className="space-y-1">
                        <p className="text-primary font-bold uppercase tracking-widest">{t('photos.emptyTitle', 'No Photos')}</p>
                        <p className="text-muted text-xs">{t('photos.emptyDesc', 'Non ci sono ancora foto. Sii il primo a caricarne una!')}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square rounded-sm overflow-hidden bg-surface border border-border-subtle cursor-pointer hover:shadow-xl transition-all"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <img
                                src={photo.url}
                                alt={photo.caption || t('photos.alt.tripPhoto', "Foto del viaggio")}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {!readOnly && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(photo.id);
                                    }}
                                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-20"
                                    title={t('photos.deletePhoto', "Elimina foto")}
                                >
                                    ×
                                </button>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                    ))}
                </div>
            )}

            {/* --- LIGHTBOX (MODALE PER VEDERE LA FOTO INTERA) --- */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-5 cursor-zoom-out animate-fade-in"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <img
                        src={selectedPhoto.url}
                        alt={t('photos.alt.fullSize', "Foto intera")}
                        className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl transition-transform duration-300"
                    />
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all"
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};

export default Photos;