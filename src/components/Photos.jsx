import React, { useState, useEffect, useRef } from 'react';
import { uploadPhoto, getPhotos, deletePhoto } from '../api';

const Photos = ({ trip }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
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
        fetchPhotos();
    }, [trip.id]);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleDelete = async (photoId) => {
        if (!window.confirm("Sei sicuro di voler eliminare questa foto?")) return;

        try {
            await deletePhoto(photoId);
            setPhotos(photos.filter(p => p.id !== photoId));
        } catch (error) {
            alert("Errore nell'eliminazione della foto: " + error.message);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            await uploadPhoto(trip.id, file);
            await fetchPhotos(); // Refresh list
        } catch (error) {
            alert("Errore nel caricamento della foto: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container section">
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h2>Foto del viaggio 📸</h2>
                <p>Cattura e condividi i momenti migliori con il tuo gruppo.</p>

                <button
                    onClick={handleUploadClick}
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ background: 'var(--accent-orange)', marginTop: '1rem' }}
                >
                    {loading ? 'Caricamento... ⏳' : '+ Aggiungi Foto'}
                </button>
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
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                    <p className="text-muted">Non ci sono ancora foto. Sii il primo a caricarne una!</p>
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
                                position: 'relative'
                            }}
                        >
                            <img
                                src={photo.url}
                                alt={photo.caption || "Trip photo"}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.7)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                title="Elimina foto"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Photos;
