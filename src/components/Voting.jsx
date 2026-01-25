import React, { useState, useEffect } from 'react';
import { voteProposal, getParticipants, generateShareLink } from '../api';
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
    const [currentUserParticipant, setCurrentUserParticipant] = useState(null);
    const [loadingProposalId, setLoadingProposalId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        const loadParticipants = async () => {
            try {
                const parts = await getParticipants(trip.id);
                setParticipants(parts);

                // Riconoscimento utente loggato
                const storedUser = localStorage.getItem('user');
                if (storedUser && storedUser !== 'undefined') {
                    const userObj = JSON.parse(storedUser);
                    // Cerchiamo se l'utente loggato è tra i partecipanti (match per nome)
                    const match = parts.find(p => p.name.toLowerCase() === userObj.name.toLowerCase());
                    if (match) {
                        setCurrentUserParticipant(match);
                        setSelectedUser(match.id);
                    } else if (parts.length > 0) {
                        setSelectedUser(parts[0].id);
                    }
                } else if (parts.length > 0) {
                    setSelectedUser(parts[0].id);
                }
            } catch (e) {
                console.error("Error loading participants", e);
            }
        };
        loadParticipants();
    }, [trip.id]);

    const handleVote = async (proposalId) => {
        if (!selectedUser && !isSolo) {
            showToast("Seleziona chi sta votando!", "info");
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

    const handleShareVotingLink = async () => {
        setIsSharing(true);
        try {
            const res = await generateShareLink(trip.id);
            const shareUrl = `${window.location.origin}/share/${res.share_token}`;

            if (navigator.share) {
                await navigator.share({
                    title: 'Vota la nostra meta su SplitPlan!',
                    text: `Ehi! Il nostro viaggio a ${trip.destination} è pronto. Entra e vota la tua meta preferita!`,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast("🔗 Link di voto copiato! Invialo ai tuoi amici.", "success");
            }
        } catch (e) {
            console.error(e);
            showToast("Errore condivisione", "error");
        } finally {
            setIsSharing(false);
        }
    };


    return (
        <div className="section py-8 md:py-12">
            <div className="container">

                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        {isSolo ? 'Scegli la tua Meta' : 'Vota la destinazione'}
                    </h2>

                    {!isSolo && (
                        <div className="space-y-6">
                            <p className="text-text-muted text-base md:text-lg">
                                Il gruppo deve raggiungere il consenso. ({stats.count}/{stats.total} voti)
                            </p>

                            <div className="flex flex-col items-center gap-4">
                                {/* Se l'utente è riconosciuto, gli mostriamo il suo nome, altrimenti il selettore (per l'organizzatore o demo) */}
                                {currentUserParticipant ? (
                                    <div className="bg-green-50 border border-green-200 px-6 py-3 rounded-2xl animate-fade-in">
                                        <p className="text-green-800 font-bold m-0 flex items-center gap-2">
                                            <span>👋</span> Ciao {currentUserParticipant.name}, stai votando per te stesso
                                        </p>
                                    </div>
                                ) : (
                                    <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-blue-50 px-4 md:px-6 py-3 md:py-4 rounded-xl">
                                        <label className="font-bold text-sm md:text-base text-text-main">
                                            Vota per:
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
                                )}

                                {/* Pulsante Condividi - Solo per chi ha creato il viaggio (se riconosciuto come organizzatore) o per tutti in questa fase */}
                                <button
                                    onClick={handleShareVotingLink}
                                    disabled={isSharing}
                                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-primary-blue text-primary-blue rounded-xl font-bold hover:bg-primary-blue hover:text-white transition-all shadow-md group"
                                >
                                    <span>{isSharing ? 'Generando...' : '🔗 Condividi per il voto'}</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9.158a3 3 0 100-2.684 3 3 0 000 2.684z" />
                                    </svg>
                                </button>
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
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1080&auto=format&fit=crop";
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                <h3 className="absolute bottom-4 left-4 text-white text-xl md:text-2xl font-bold drop-shadow-lg">
                                    {prop.destination}
                                </h3>
                            </div>

                            {/* Content */}
                            <div className="p-5 md:p-6 flex-1 flex flex-col">
                                <p className="text-text-muted text-sm md:text-base mb-4 flex-1" style={{ minHeight: '4.5rem' }}>
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
                                            ? "Scegli e Procedi"
                                            : (votedId === prop.id ? 'Votato' : 'Vota Questa')
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {proposals.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4"></div>
                        <p className="text-text-muted text-lg">Nessuna proposta disponibile.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Voting;