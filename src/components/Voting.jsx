import React, { useState, useEffect } from 'react';
import { voteProposal, getParticipants, generateShareLink, getProposals } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Voting = ({ proposals: initialProposals, trip, onVoteComplete, isOrganizer }) => {
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [proposals, setProposals] = useState(initialProposals || []);
    const [votedId, setVotedId] = useState(null);
    const [stats, setStats] = useState({ count: 0, total: trip.num_people });
    const isSolo = trip.trip_type === 'SOLO';

    const [participants, setParticipants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentUserParticipant, setCurrentUserParticipant] = useState(null);
    const [loadingProposalId, setLoadingProposalId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);
    const [loadingProposals, setLoadingProposals] = useState(true);
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoadingProposals(true);
            try {
                // Check if already voted (Local Persistence for guests)
                if (localStorage.getItem(`splitplan_voted_${trip.id}`)) {
                    setHasVoted(true);
                }

                // 1. Carichiamo i partecipanti
                const parts = await getParticipants(trip.id);
                setParticipants(parts);

                // 2. Se non abbiamo proposte, carichiamole dal DB
                if (!initialProposals || initialProposals.length === 0) {
                    const props = await getProposals(trip.id);
                    setProposals(props);
                }

                // 3. Riconoscimento utente loggato
                const storedUser = localStorage.getItem('user');
                if (storedUser && storedUser !== 'undefined') {
                    const userObj = JSON.parse(storedUser);
                    const match = parts.find(p => p.name && p.name.toLowerCase() === userObj.name.toLowerCase());
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
                console.error("Error loading voting data", e);
            } finally {
                setLoadingProposals(false);
            }
        };
        loadData();
    }, [trip.id, initialProposals]);

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
                localStorage.setItem(`splitplan_voted_${trip.id}`, 'true');
                setHasVoted(true);
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
            const shareUrl = `${window.location.origin}/trip/join/${res.share_token}`;

            if (navigator.share) {
                await navigator.share({
                    title: 'Vota la nostra meta su SplitPlan!',
                    text: `Ehi! Il nostro viaggio a ${trip.destination} è pronto. Entra, registrati con il tuo nome e vota la tua meta preferita!`,
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

                {/* GUEST WAITING SCREEN AFTER VOTING */}
                {!isOrganizer && hasVoted && !isSolo ? (
                    <div className="animate-fade-in" style={{
                        marginTop: '2rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'var(--bg-white)',
                            padding: '3rem',
                            borderRadius: '32px',
                            textAlign: 'center',
                            border: '1px solid var(--primary-blue)',
                            maxWidth: '600px',
                            boxShadow: 'var(--shadow-lg)'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '1.5rem', letterSpacing: '2px' }}>VOTED</div>
                            <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontWeight: '800' }}>
                                Voto Registrato!
                            </h2>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
                                Grazie per aver espresso la tua preferenza.
                                <br /><br />
                                <strong>L'organizzatore deve ora finire di pianificare il viaggio.</strong>
                                <br />
                                Una volta completato, chiedi di farti mandare il <b>link di sola lettura</b> per vedere l'itinerario finale.
                            </p>
                            <div style={{
                                display: 'inline-block',
                                padding: '0.8rem 1.5rem',
                                background: 'var(--bg-soft-gray)',
                                borderRadius: '16px',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                fontSize: '0.9rem'
                            }}>
                                Puoi chiudere questa pagina.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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
                                        {isOrganizer && !currentUserParticipant && (
                                            <div style={{ maxWidth: '500px', marginBottom: '1rem' }} className="animate-fade-in">
                                                <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '16px', border: '1px solid #dbeafe' }}>
                                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0 }}>
                                                        <strong>Organizzatore:</strong> Manda il link qui sotto ai tuoi amici.
                                                        Quando entreranno, il sistema li riconoscerà per nome e permetterà loro di votare!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {currentUserParticipant ? (
                                            <div className="bg-green-50 border border-green-200 px-6 py-3 rounded-2xl animate-fade-in">
                                                Ciao {currentUserParticipant.name}, stai votando per te stesso
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

                                        {isOrganizer && (
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
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Proposals Grid */}
                        {loadingProposals ? (
                            <div className="text-center py-12">
                                <div className="spinner-large" style={{ margin: '0 auto' }}></div>
                                <p className="mt-4 text-text-muted">Caricamento mete in corso...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {proposals.map(prop => (
                                    <div
                                        key={prop.id}
                                        className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl 
                                         transition-all duration-300 transform hover:-translate-y-1
                                         flex flex-col"
                                    >
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

                                        <div className="p-5 md:p-6 flex-1 flex flex-col">
                                            <p className="text-text-muted text-sm md:text-base mb-4 flex-1" style={{ minHeight: '4.5rem' }}>
                                                {prop.description}
                                            </p>

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
                        )}

                        {!loadingProposals && proposals.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-2xl font-bold text-gray-300 mb-4">No Data</div>
                                <p className="text-text-muted text-lg">Nessuna proposta disponibile.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Voting;