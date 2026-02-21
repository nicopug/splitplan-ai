import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadPhoto, getPhotos, deletePhoto } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

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
        <div className="container section">
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h2>{t('photos.title', 'Foto del viaggio')}</h2>
                <p>{t('photos.subtitle', 'Cattura e condividi i momenti migliori con il tuo gruppo.')}</p>

                {!readOnly && (
                    <button
                        onClick={handleUploadClick}
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ background: 'var(--accent-orange)', marginTop: '1rem' }}
                    >
                        {loading ? t('photos.loading', 'Caricamento...') : t('photos.addPhoto', '+ Aggiungi Foto')}
                    </button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
            </div>

            {photos.length === 0 ? (
                <div className="text-center" style={{ padding: '4rem', background: 'white', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '1rem' }}>{t('photos.emptyTitle', 'No Photos')}</div>
                    <p className="text-muted">{t('photos.emptyDesc', 'Non ci sono ancora foto. Sii il primo a caricarne una!')}</p>
                </div>
            ) : (
                <div className="grid-3" style={{ gap: '1.5rem' }}>
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            style={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'white',
                                boxShadow: 'var(--shadow-md)',
                                aspectRatio: '1/1',
                                position: 'relative',
                                cursor: 'pointer', // Cursore a manina
                                transition: 'transform 0.2s'
                            }}
                            onClick={() => setSelectedPhoto(photo)} // Apre la foto al click
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <img
                                src={photo.url}
                                alt={photo.caption || t('photos.alt.tripPhoto', "Foto del viaggio")}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover' // Mantiene la griglia ordinata
                                }}
                            />
                            {!readOnly && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Evita di aprire la foto quando cancelli
                                        handleDelete(photo.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        transition: 'background 0.2s',
                                        zIndex: 10
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                    title={t('photos.deletePhoto', "Elimina foto")}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- LIGHTBOX (MODALE PER VEDERE LA FOTO INTERA) --- */}
            {selectedPhoto && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setSelectedPhoto(null)} // Chiudi cliccando sullo sfondo
                >
                    <img
                        src={selectedPhoto.url}
                        alt={t('photos.alt.fullSize', "Foto intera")}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '90vh',
                            objectFit: 'contain', // Qui si vede INTERA senza tagli
                            borderRadius: '8px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}
                    />
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default Photos;