import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { updateItineraryItem } from '../api';
import { useToast } from '../context/ToastContext';

const Timeline = ({ items, tripId, onUpdate }) => {
    const { showToast } = useToast();
    const [localItems, setLocalItems] = useState(items);

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    if (!localItems || localItems.length === 0) return null;

    // Raggruppamento dati
    const grouped = localItems.reduce((acc, item) => {
        const date = item.start_time.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return; // Mollato fuori
        if (destination.droppableId === source.droppableId && destination.index === source.index) return; // Non è cambiato nulla

        const itemToMove = localItems.find(it => it.id.toString() === draggableId);
        const newDate = destination.droppableId; // L'ID della droppable è la data (YYYY-MM-DD)

        // Prepariamo il nuovo orario mantenendo l'ora originale ma cambiando la data
        const originalTime = itemToMove.start_time.split('T')[1];
        const newStartTime = `${newDate}T${originalTime}`;

        // Update Ottimistico nel frontend (spostiamo subito l'elemento)
        const updatedItems = localItems.map(it =>
            it.id.toString() === draggableId ? { ...it, start_time: newStartTime } : it
        );
        setLocalItems(updatedItems);

        try {
            await updateItineraryItem(itemToMove.id, { start_time: newStartTime });
            showToast("Itinerario aggiornato!", "success");
            if (onUpdate) onUpdate(); // Rinfresca i dati dal server se necessario
        } catch (error) {
            setLocalItems(items); // Rollback in caso di errore
            showToast("Errore nello spostamento", "error");
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ maxWidth: '850px', margin: '0 auto', position: 'relative', padding: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    {/* Linea Verticale */}
                    <div style={{ position: 'absolute', left: '25px', top: '20px', bottom: '20px', width: '4px', background: 'linear-gradient(to bottom, var(--primary-blue), var(--primary-blue-light))', borderRadius: '4px', opacity: 0.3 }}></div>

                    {sortedDates.map((date, idx) => (
                        <div key={date} style={{ marginBottom: '3rem', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div className="day-badge" style={{ width: '54px', height: '54px', background: 'var(--bg-white)', borderRadius: '18px', border: '2px solid var(--primary-blue)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', fontWeight: '800' }}>
                                    {idx + 1}
                                </div>
                                <h3 style={{ marginLeft: '1.5rem', margin: 0 }}>
                                    Giorno {idx + 1} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>• {new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                                </h3>
                            </div>

                            {/* ZONA DROP PER IL GIORNO */}
                            <Droppable droppableId={date}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        style={{
                                            marginLeft: '65px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            minHeight: '50px',
                                            background: snapshot.isDraggingOver ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                            borderRadius: '20px',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        {grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((item, i) => (
                                            <Draggable key={item.id.toString()} draggableId={item.id.toString()} index={i}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            background: 'var(--bg-white)',
                                                            padding: '1.2rem',
                                                            borderRadius: '20px',
                                                            boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.03)',
                                                            border: '1px solid #f1f5f9',
                                                            borderLeft: `6px solid ${item.type === 'CHECKIN' ? '#f59e0b' : item.type === 'FOOD' ? '#ef4444' : '#10b981'}`,
                                                            opacity: snapshot.isDragging ? 0.8 : 1
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '1.1rem' }}>{item.title}</strong>
                                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{item.description}</p>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>
                                                                {item.start_time.split('T')[1].substring(0, 5)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </div>
        </DragDropContext>
    );
};

export default Timeline;