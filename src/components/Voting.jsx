import React, { useState } from 'react';
import { voteProposal, simulateVotes, getTrip, getParticipants } from '../api';

const Voting = ({ proposals, trip, onVoteComplete }) => {
    const [votedId, setVotedId] = useState(null);
    const [stats, setStats] = useState({ count: 0, total: trip.num_people });
    const isSolo = trip.trip_type === 'SOLO';
    const [participants, setParticipants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingProposalId, setLoadingProposalId] = useState(null);

    // Fetch Participants on load
    React.useEffect(() => {
        const loadParticipants = async () => {
            try {
                const parts = await getParticipants(trip.id);
                setParticipants(parts);
                // Default to first user (Organizer)
                if (parts.length > 0) setSelectedUser(parts[0].id);
            } catch (e) {
                console.error("Error loading participants", e);
            }
        };
        loadParticipants();
    }, [trip.id]);

    const handleVote = async (proposalId) => {
        if (!selectedUser && !isSolo) {
            alert("Seleziona chi sta votando!");
            return;
        }

        const voterId = isSolo ? (participants[0]?.id) : selectedUser;
        if (!voterId) {
            alert("Errore: Partecipante non trovato. Riprova.");
            return;
        }

        setLoadingProposalId(proposalId);
        try {
            // Mock logic: User ID 1 is the current user. NOW we use voterId
            const res = await voteProposal(proposalId, voterId, 1);
            setVotedId(proposalId);
            setStats({ count: res.votes_count, total: res.required });

            // Refresh to see if status changed
            if (res.trip_status === 'BOOKED' || res.trip_status === 'CONSENSUS_REACHED') {
                onVoteComplete();
            } else {
                alert(`Voto di ${participants.find(p => p.id == voterId)?.name || 'Utente'} registrato! (${res.votes_count}/${res.required})`);
            }
        } catch (e) {
            alert("Errore voto: " + e.message);
        } finally {
            setLoadingProposalId(null);
        }
    };

    const handleSimulate = async () => {
        if (!confirm("Vuoi simulare il voto degli altri partecipanti per demo?")) return;
        try {
            await simulateVotes(trip.id);
            alert("Voti simulati! Itinerario in arrivo...");
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

                        <div style={{ background: '#f0f4f8', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
                            <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Chi sta votando? 🗳️</label>
                            <select
                                value={selectedUser || ''}
                                onChange={(e) => {
                                    setSelectedUser(parseInt(e.target.value));
                                    setVotedId(null);
                                }}
                                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
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
                        style={{ marginTop: '1rem', background: '#ccc', color: '#333', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer' }}
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
                            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                        />
                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{prop.destination}</h3>
                                {/* 
                                <span style={{ background: '#eee', padding: '0.25rem 0.75rem', borderRadius: '12px', fontWeight: 'bold' }}>
                                    €{prop.price_estimate}
                                </span> 
                                */}
                            </div>
                            <p style={{ color: '#666', marginBottom: '1.5rem', flex: 1 }}>{prop.description}</p>

                            <button
                                onClick={() => handleVote(prop.id)}
                                className={`btn ${votedId === prop.id ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%' }}
                                disabled={(votedId !== null && !isSolo) || loadingProposalId !== null} // Disable if already voted (unless solo) or ANY loading
                            >
                                {loadingProposalId === prop.id ? ( // Show spinner only if loading THIS specific action
                                    <span><span className="spinner"></span> Generazione...</span>
                                ) : (
                                    votedId === prop.id
                                        ? (isSolo ? 'Scelta ✅' : 'Votato ✅')
                                        : (isSolo ? 'Genera Itinerario ✨' : 'Vota Questo 👍')
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
