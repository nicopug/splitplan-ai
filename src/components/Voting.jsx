import React, { useState, useEffect } from 'react';
import { voteProposal, getParticipants } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Voting = ({ proposals, trip, onVoteComplete }) => {
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [votedId, setVotedId] = useState(null);
    const [stats, setStats] = useState({ count: 0, total: trip.num_people });
    const isSolo = trip.trip_type === 'SOLO';

    const [participants, setParticipants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingProposalId, setLoadingProposalId] = useState(null);

    useEffect(() => {
        const loadParticipants = async () => {
            try {
                const parts = await getParticipants(trip.id);
                setParticipants(parts);
                if (parts.length > 0) setSelectedUser(parts[0].id);
            } catch (e) {
                console.error("Error loading participants", e);
            }
        };
        loadParticipants();
    }, [trip.id]);

    const handleVote = async (proposalId) => {
        if (!selectedUser && !isSolo) {
            showToast("Seleziona chi sta votando dal menu a tendina!", "info");
            return;
        }

        const voterId = isSolo ? (participants[0]?.id) : selectedUser;

        if (!voterId) {
            showToast("Errore: Partecipante non trovato.", "error");
            return;
        }

        setLoadingProposalId(proposalId);
        try {
            const res = await voteProposal(proposalId, voterId, 1);

            setVotedId(proposalId);
            if (res.votes_count !== undefined) {
                setStats({ count: res.votes_count, total: res.required });
            }

            if (res.trip_status === 'BOOKED' || res.trip_status === 'CONSENSUS_REACHED') {
                if (!isSolo) showToast("Consenso raggiunto! Si procede.", "success");
                onVoteComplete();
            } else {
                const voterName = participants.find(p => p.id == voterId)?.name || 'Utente';
                showToast(`Voto di ${voterName} registrato! (${res.votes_count}/${res.required})`, "success");
            }
        } catch (e) {
            showToast("Errore voto: " + e.message, "error");
        } finally {
            if (!isSolo) setLoadingProposalId(null);
        }
    };


    return (
        <div className="section py-8 md:py-12">
            <div className="container">

                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        {isSolo ? 'Scegli la tua Meta 🌍' : 'Vota la destinazione 📦'}
                    </h2>

                    {!isSolo && (
                        <div className="space-y-4">
                            <p className="text-text-muted text-base md:text-lg">
                                Il gruppo deve raggiungere il consenso. ({stats.count}/{stats.total} voti)
                            </p>

                            {/* User Selector */}
                            <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-blue-50 px-4 md:px-6 py-3 md:py-4 rounded-xl">
                                <label className="font-bold text-sm md:text-base text-text-main">
                                    Chi sta votando? 🗳️
                                </label>
                                <select
                                    value={selectedUser || ''}
                                    onChange={(e) => {
                                        setSelectedUser(parseInt(e.target.value));
                                        setVotedId(null);
                                    }}
                                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none min-w-[150px] text-sm md:text-base"
                                >
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>


                {/* Proposals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {proposals.map(prop => (
                        <div
                            key={prop.id}
                            className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl 
                                     transition-all duration-300 transform hover:-translate-y-1
                                     flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative overflow-hidden h-48 md:h-56">
                                <img
                                    src={prop.image_url}
                                    alt={prop.destination}
                                    className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                <h3 className="absolute bottom-4 left-4 text-white text-xl md:text-2xl font-bold drop-shadow-lg">
                                    {prop.destination}
                                </h3>
                            </div>

                            {/* Content */}
                            <div className="p-5 md:p-6 flex-1 flex flex-col">
                                <p className="text-text-muted text-sm md:text-base mb-4 flex-1 line-clamp-3">
                                    {prop.description}
                                </p>

                                {/* Vote Button */}
                                <button
                                    onClick={() => handleVote(prop.id)}
                                    disabled={loadingProposalId !== null}
                                    className={`w-full py-3 md:py-4 rounded-xl font-bold text-sm md:text-base
                                              transition-all duration-200 transform active:scale-95
                                              flex items-center justify-center gap-2
                                              ${votedId === prop.id
                                            ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                            : 'bg-primary-blue text-white hover:bg-opacity-90 hover:shadow-lg'
                                        }
                                              disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {loadingProposalId === prop.id ? (
                                        <>
                                            <span className="spinner border-current"></span>
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

                {/* Empty State */}
                {proposals.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🗺️</div>
                        <p className="text-text-muted text-lg">Nessuna proposta disponibile.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Voting;