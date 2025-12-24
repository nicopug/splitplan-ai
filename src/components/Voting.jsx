import React, { useState } from 'react';
import { voteProposal, simulateVotes } from '../api';

const Voting = ({ proposals, trip, onVoteComplete }) => {
    const [votedId, setVotedId] = useState(null);
    const [stats, setStats] = useState({ count: 0, total: trip.num_people });
    const isSolo = trip.trip_type === 'SOLO';
    const [loadingProposalId, setLoadingProposalId] = useState(null);

    // Gestione del voto / scelta
    const handleVote = async (proposalId) => {
        setLoadingProposalId(proposalId);
        try {
            // Passiamo 0 come userId (il backend lo ignora e usa il token sicuro)
            const res = await voteProposal(proposalId, 0, 1);

            setVotedId(proposalId);

            if (res.votes_count !== undefined) {
                setStats({ count: res.votes_count, total: res.required });
            }

            // Se il viaggio passa a BOOKED o CONSENSUS
            if (res.trip_status === 'BOOKED' || res.trip_status === 'CONSENSUS_REACHED') {
                if (!isSolo) {
                    alert("Consenso raggiunto! Si procede.");
                }
                onVoteComplete();
            } else {
                alert(`Voto registrato! (${res.votes_count}/${res.required})`);
            }
        } catch (e) {
            if (e.message.includes("403")) {
                alert("Non sei autorizzato a votare in questo viaggio.");
            } else {
                alert("Preferenza salvata.");
                setVotedId(proposalId);
            }
        } finally {
            if (!isSolo) {
                setLoadingProposalId(null);
            }
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
                        <p className="text-muted">
                            Il gruppo deve raggiungere il consenso.
                            <br />
                            <strong>Voti attuali: {stats.count} su {stats.total}.</strong>
                        </p>
                    </div>
                )}

                {/* Pulsante Demo visibile solo se è un gruppo e mancano voti */}
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
                                {/* PREZZO RIMOSSO QUI */}
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