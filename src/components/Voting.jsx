import React, { useState, useEffect } from 'react';
import { voteProposal, simulateVotes, getParticipants } from '../api';

const Voting = ({ proposals, trip, onVoteComplete }) => {
    const [votedId, setVotedId] = useState(null);
    const [stats, setStats] = useState({ count: 0, total: trip.num_people });
    const isSolo = trip.trip_type === 'SOLO';

    // Stati per la gestione del menu a tendina
    const [participants, setParticipants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingProposalId, setLoadingProposalId] = useState(null);

    // Carichiamo i partecipanti appena si apre la pagina
    useEffect(() => {
        const loadParticipants = async () => {
            try {
                const parts = await getParticipants(trip.id);
                setParticipants(parts);
                // Seleziona automaticamente il primo utente (solitamente l'organizzatore)
                if (parts.length > 0) setSelectedUser(parts[0].id);
            } catch (e) {
                console.error("Error loading participants", e);
            }
        };
        loadParticipants();
    }, [trip.id]);

    const handleVote = async (proposalId) => {
        // Se è un gruppo, devi aver selezionato un utente dal menu
        if (!selectedUser && !isSolo) {
            alert("Seleziona chi sta votando dal menu a tendina!");
            return;
        }

        // Se è SOLO usa il primo (e unico) partecipante, altrimenti usa quello scelto nel menu
        const voterId = isSolo ? (participants[0]?.id) : selectedUser;

        if (!voterId) {
            alert("Errore: Partecipante non trovato.");
            return;
        }

        setLoadingProposalId(proposalId);
        try {
            // Passiamo voterId esplicito al backend
            const res = await voteProposal(proposalId, voterId, 1);

            setVotedId(proposalId);
            if (res.votes_count !== undefined) {
                setStats({ count: res.votes_count, total: res.required });
            }

            if (res.trip_status === 'BOOKED' || res.trip_status === 'CONSENSUS_REACHED') {
                if (!isSolo) alert("Consenso raggiunto! Si procede.");
                onVoteComplete();
            } else {
                // Recuperiamo il nome di chi ha votato per il feedback
                const voterName = participants.find(p => p.id == voterId)?.name || 'Utente';
                alert(`Voto di ${voterName} registrato! (${res.votes_count}/${res.required})`);
            }
        } catch (e) {
            alert("Errore voto: " + e.message);
        } finally {
            if (!isSolo) setLoadingProposalId(null);
        }
    };

    const handleSimulate = async () => {
        if (!confirm("Vuoi simulare il voto degli altri partecipanti per demo?")) return;
        try {
            await simulateVotes(trip.id);
            alert("Voti simulati! Il viaggio è confermato.");
            onVoteComplete();
        } catch (e) {
            alert("Errore simulazione: " + e.message);
        }
    };

    return (
        <div className="container section">
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h2>{isSolo ? 'Scegli la tua Meta 🌍' : 'Vota la destinazione 📦'}</h2>

                {!isSolo && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p className="text-muted">Il gruppo deve raggiungere il consenso. ({stats.count}/{stats.total} voti)</p>

                        {/* --- MENU A TENDINA PER CAMBIARE UTENTE --- */}
                        <div style={{ background: '#f0f4f8', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginTop: '1rem' }}>
                            <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Chi sta votando? 🗳️</label>
                            <select
                                value={selectedUser || ''}
                                onChange={(e) => {
                                    setSelectedUser(parseInt(e.target.value));
                                    setVotedId(null); // Resetta la selezione visiva quando cambi utente
                                }}
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', minWidth: '150px' }}
                            >
                                {participants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {!isSolo && stats.count > 0 && stats.count < stats.total && (
                    <button
                        onClick={handleSimulate}
                        style={{ marginTop: '1rem', background: '#e0e0e0', color: '#333', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        ⚡ Demo: Simula Voti Mancanti
                    </button>
                )}
            </div>

            <div className="grid-3">
                {proposals.map(prop => (
                    <div key={prop.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <img
                            src={prop.image_url}
                            alt={prop.destination}
                            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }}
                        />
                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{prop.destination}</h3>
                            </div>
                            <p style={{ color: '#666', marginBottom: '1.5rem', flex: 1 }}>{prop.description}</p>

                            <button
                                onClick={() => handleVote(prop.id)}
                                className={`btn ${votedId === prop.id ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                disabled={loadingProposalId !== null}
                            >
                                {loadingProposalId === prop.id ? (
                                    <>
                                        <span className="spinner"></span>
                                        {isSolo ? 'Conferma...' : 'Invio...'}
                                    </>
                                ) : (
                                    isSolo
                                        ? "Scegli e Procedi ➡️"
                                        : (votedId === prop.id ? 'Votato ✅' : 'Vota Questa 👍')
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Voting;