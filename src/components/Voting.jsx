import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { voteProposal, getParticipants, generateShareLink, getProposals } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { Button } from './ui/button';
import { Share2, CheckCircle2, Users, Loader2 } from 'lucide-react';

const Voting = ({ proposals: initialProposals, trip, onVoteComplete, isOrganizer }) => {
    const { t } = useTranslation();
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
                // 1. Carichiamo i partecipanti
                const parts = await getParticipants(trip.id);
                setParticipants(parts);

                // Initial check moved to participant list loading and selectedUser effect

                // 2. Se non abbiamo proposte, carichiamole dal DB
                if (!initialProposals || initialProposals.length === 0) {
                    const props = await getProposals(trip.id);
                    setProposals(props);
                }

                // 3. Riconoscimento utente loggato
                const storedUser = localStorage.getItem('user');
                if (storedUser && storedUser !== 'undefined') {
                    const userObj = JSON.parse(storedUser);

                    // Match per account_id (più sicuro) o per nome (più flessibile)
                    const match = parts.find(p =>
                        (p.account_id && p.account_id === userObj.id) ||
                        (p.name && p.name.toLowerCase() === userObj.name.toLowerCase()) ||
                        (p.name && userObj.name && (
                            p.name.toLowerCase().includes(userObj.name.toLowerCase()) ||
                            userObj.name.toLowerCase().includes(p.name.toLowerCase())
                        ))
                    );

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
    }, [trip.id]);
    // Removed initialProposals from deps to avoid double trigger

    // Check if the currently selected user has already voted
    useEffect(() => {
        if (!selectedUser) return;
        const participant = participants.find(p => p.id === selectedUser);
        if (participant?.has_voted) {
            setHasVoted(true);
            // If they voted, we might want to highlight which one, but the backend 
            // doesn't send *which* proposal they voted for in the participants list.
            // For now, seeing the "Voted" screen is enough.
        } else {
            // Se cambiamo utente e quello nuovo non ha votato, resettiamo lo stato locale
            // MA solo se non abbiamo votato proprio ora in questa sessione
            if (!localStorage.getItem(`splitplan_voted_session_${trip.id}_${selectedUser}`)) {
                setHasVoted(false);
                setVotedId(null);
            } else {
                setHasVoted(true);
            }
        }
    }, [selectedUser, participants, trip.id]);

    const handleVote = async (proposalId) => {
        if (!selectedUser && !isSolo) {
            showToast(t('voting.toast.selectVoter', "Seleziona chi sta votando!"), "info");
            return;
        }

        const voterId = isSolo ? (participants[0]?.id) : selectedUser;

        if (!voterId) {
            showToast(t('voting.toast.voterNotFound', "Errore: Partecipante non trovato."), "error");
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
                if (!isSolo) showToast(t('voting.toast.consensusReached', "Consenso raggiunto! Si procede."), "success");
                onVoteComplete();
            } else {
                // Global marker removed to allow other participants on same device to vote
                localStorage.setItem(`splitplan_voted_session_${trip.id}_${voterId}`, 'true');
                setHasVoted(true);
                const voterName = participants.find(p => p.id == voterId)?.name || 'Utente';
                showToast(t('voting.toast.voteRegistered', { voterName, count: res.votes_count, total: res.required }), "success");
            }
        } catch (e) {
            showToast(t('voting.common.error', "Errore voto: ") + e.message, "error");
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
                    title: t('voting.shareTitle', 'Vota la nostra meta su SplitPlan!'),
                    text: t('voting.shareText', { destination: trip.destination }),
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast(t('voting.toast.shareSuccess', "🔗 Link di voto copiato! Invialo ai tuoi amici."), "success");
            }
        } catch (e) {
            console.error(e);
            showToast(t('voting.toast.shareError', "Errore condivisione"), "error");
        } finally {
            setIsSharing(false);
        }
    };


    return (
        <div className="section py-8 md:py-12">
            <div className="container">

                {/* GUEST WAITING SCREEN AFTER VOTING */}
                {!isOrganizer && hasVoted && !isSolo ? (
                    <div className="animate-fade-in flex justify-center py-20">
                        <div className="premium-card p-16 text-center max-w-2xl space-y-8 border-white/20">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-white text-black flex items-center justify-center rounded-sm">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="subtle-heading">{t('voting.votedStatus', 'Voto registrato')}</span>
                                <h2 className="text-white text-4xl font-semibold tracking-tight uppercase">
                                    {t('voting.votedSubtitle', 'Pronto per il viaggio.')}
                                </h2>
                                <p className="text-gray-500 text-lg leading-relaxed">
                                    <span dangerouslySetInnerHTML={{ __html: t('voting.votedDesc') }} />
                                </p>
                            </div>
                            <div className="pt-8">
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest border border-white/10 px-6 py-3 rounded-sm">
                                    {t('voting.closePage', 'Puoi chiudere questa pagina')}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="max-w-4xl mx-auto space-y-12 mb-16">
                            <div className="text-left space-y-4">
                                <span className="subtle-heading">{t('voting.section', 'Consenso & Destinazioni')}</span>
                                <h2 className="text-white text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                                    {isSolo ? t('voting.titleSolo', 'Scegli la tua Meta') : t('voting.titleGroup', 'Vota la destinazione')}
                                </h2>

                                {!isSolo && (
                                    <p className="text-gray-500 text-lg leading-relaxed">
                                        {t('voting.groupConsensus', { count: stats.count, total: stats.total })}
                                    </p>
                                )}
                            </div>

                            {!isSolo && (
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    {currentUserParticipant ? (
                                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/20 rounded-sm text-white">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                            <span className="text-sm font-semibold uppercase tracking-tight">
                                                {t('voting.greeting', { name: currentUserParticipant.name })}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-sm pr-4">
                                            <div className="bg-white/10 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {t('voting.voteFor', 'Vota come:')}
                                            </div>
                                            <select
                                                value={selectedUser || ''}
                                                onChange={(e) => {
                                                    setSelectedUser(parseInt(e.target.value));
                                                    setVotedId(null);
                                                }}
                                                className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer uppercase tracking-tight"
                                            >
                                                {participants.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-black text-white">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {isOrganizer && (
                                        <Button
                                            variant="outline"
                                            onClick={handleShareVotingLink}
                                            disabled={isSharing}
                                            className="border-white/20 text-white hover:bg-white hover:text-black"
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            {isSharing ? t('voting.shareBtnGenerating', 'Generando...') : t('voting.shareBtn', 'Condividi Link')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* Proposals Grid */}
                        {loadingProposals ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{t('voting.loading', 'Curatela opzioni in corso...')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                                {proposals.map(prop => (
                                    <div
                                        key={prop.id}
                                        className="premium-card !p-0 group flex flex-col h-full overflow-hidden border-white/10"
                                    >
                                        <div className="relative aspect-[4/5] overflow-hidden">
                                            <img
                                                src={prop.image_url}
                                                alt={prop.destination}
                                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1080&auto=format&fit=crop";
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                            <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                                <h3 className="text-white text-3xl font-bold uppercase tracking-tight">{prop.destination}</h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-sm">AI CHOICE</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-6 flex flex-col flex-1">
                                            <p className="text-gray-500 text-sm leading-relaxed flex-1">
                                                {prop.description}
                                            </p>

                                            <Button
                                                onClick={() => handleVote(prop.id)}
                                                disabled={loadingProposalId !== null}
                                                variant={votedId === prop.id ? "secondary" : "default"}
                                                fullWidth
                                                size="lg"
                                                className={votedId === prop.id ? "bg-white text-black" : ""}
                                            >
                                                {loadingProposalId === prop.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    isSolo
                                                        ? t('voting.chooseAndProceed', "Scegli Destinazione")
                                                        : (votedId === prop.id ? t('voting.voted', 'Destinazione scelta') : t('voting.voteThis', 'Vota questa meta'))
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loadingProposals && proposals.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-2xl font-bold text-gray-300 mb-4">{t('voting.emptyTitle', 'No Data')}</div>
                                <p className="text-text-muted text-lg">{t('voting.emptyDesc', 'Nessuna proposta disponibile.')}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Voting;