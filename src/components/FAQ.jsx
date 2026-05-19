import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, HelpCircle } from 'lucide-react';
import { JsonLd } from './JsonLd';

const FAQS = [
    {
        q: "Cos'è SplitPlan AI e a chi serve?",
        a: "SplitPlan AI è una piattaforma SaaS che unifica pianificazione viaggi con intelligenza artificiale, gestione trasferte aziendali e nota spese in un unico strumento. È pensata sia per aziende che vogliono ottimizzare le trasferte dei dipendenti (B2B), sia per gruppi di amici che pianificano viaggi insieme (B2C).",
    },
    {
        q: "Come funziona la gestione delle trasferte aziendali con SplitPlan?",
        a: "Il manager crea la trasferta, l'AI propone tre itinerari ottimizzati su budget e policy aziendali, il dipendente conferma o vota. Le spese vengono tracciate in tempo reale dai partecipanti e a fine trasferta SplitPlan genera automaticamente la nota spese in PDF e CSV pronta per la contabilità.",
    },
    {
        q: "Quanto costa SplitPlan per un'azienda?",
        a: "I piani B2B partono da €349/mese (Corporate Starter, fino a 30 utenti) e €890/mese (Business Growth, fino a 120 utenti). Per organizzazioni più grandi è disponibile il piano Enterprise su misura. Non addebitiamo commissioni sui booking né costi nascosti, a differenza di molti competitor.",
    },
    {
        q: "SplitPlan è un'alternativa a SAP Concur, TravelPerk o Navan?",
        a: "Sì. SplitPlan è un software di travel management per aziende che integra in più la pianificazione AI, la votazione di gruppo per trasferte multi-attendee (offsite, eventi, board) e la nota spese, tutto in un'unica piattaforma. Tariffa SaaS pura: nessuna commissione percentuale sui booking, nessun surcharge nascosto.",
    },
    {
        q: "Quanto tempo serve per implementare SplitPlan in azienda?",
        a: "L'onboarding è self-service: in meno di 30 minuti il manager può invitare il team via bulk import, configurare il workflow di approvazione delle trasferte, impostare budget cap e attivare l'export contabile. Nessuna integrazione obbligatoria, nessuna formazione preliminare richiesta.",
    },
    {
        q: "Come si gestiscono le spese di trasferta dei dipendenti?",
        a: "Ogni partecipante registra le spese (ricevute, importi, categorie) direttamente in app durante la trasferta. SplitPlan le aggrega per trasferta o per dipendente, calcola automaticamente i rimborsi e a fine ciclo esporta la nota spese in PDF (per i dipendenti) e CSV (per la contabilità).",
    },
    {
        q: "I dati aziendali sono al sicuro? Siete GDPR compliant?",
        a: "Sì. Il database PostgreSQL è ospitato su Supabase con crittografia at-rest e in-transit, server in Europa. L'isolamento multi-tenant è enforced a livello di foreign key. Siamo pienamente conformi al GDPR e firmiamo Data Processing Agreement per i clienti B2B.",
    },
    {
        q: "C'è una prova gratuita per le aziende?",
        a: "Sì. Offriamo un pilot gratuito di 60 giorni per aziende selezionate, senza carta di credito richiesta. Al termine del pilot l'azienda può decidere se attivare un piano o uscire senza vincoli.",
    },
    {
        q: "SplitPlan funziona anche per viaggi personali con amici?",
        a: "Sì. Il piano Free permette di pianificare un viaggio con AI base e mappa interattiva. Il piano Pro a €7,99/mese (o €76,99/anno) sblocca AI Co-Pilot avanzato, gestione budget e spese di gruppo, export PDF premium e sincronizzazione con Google Calendar.",
    },
    {
        q: "Quali integrazioni sono disponibili?",
        a: "Sincronizzazione automatica con Google Calendar, export PDF/CSV per la contabilità, API access per i piani Business Growth ed Enterprise, e SSO (Single Sign-On) per le organizzazioni Enterprise. Altre integrazioni con sistemi HR e contabili sono in roadmap.",
    },
];

const FAQItem = ({ item, index, isOpen, onToggle }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
        className="rounded-2xl overflow-hidden transition-colors"
        style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
        }}
    >
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        >
            <h3
                className="text-base md:text-lg font-bold tracking-tight m-0"
                style={{ color: 'var(--text-primary)' }}
            >
                {item.q}
            </h3>
            <span
                className={`shrink-0 w-8 h-8 rounded-full bg-primary-blue/10 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-45' : ''
                    }`}
                aria-hidden="true"
            >
                <Plus className="w-4 h-4 text-primary-blue" />
            </span>
        </button>
        {isOpen && (
            <div
                className="px-6 pb-5"
                style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '1rem',
                }}
            >
                <p
                    className="text-sm md:text-base leading-relaxed m-0"
                    style={{ color: 'var(--text-muted)' }}
                >
                    {item.a}
                </p>
            </div>
        )}
    </motion.div>
);

const FAQ_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://splitplan-ai.vercel.app/#faq',
    inLanguage: 'it',
    isPartOf: { '@id': 'https://splitplan-ai.vercel.app/#website' },
    about: { '@id': 'https://splitplan-ai.vercel.app/#software' },
    mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
    })),
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="py-24 relative overflow-hidden"
        >
            <JsonLd id="faq-schema-jsonld" schema={FAQ_SCHEMA} />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] bg-primary-blue/10 blur-[120px] rounded-full pointer-events-none opacity-30" />

            <div className="container relative z-10">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-blue/10 border border-primary-blue/20 mb-4">
                            <HelpCircle className="w-3.5 h-3.5 text-primary-blue" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary-blue">
                                Domande Frequenti
                            </span>
                        </div>
                        <h2
                            id="faq-heading"
                            className="text-4xl md:text-5xl font-black tracking-tight text-primary mb-4"
                        >
                            Tutto quello che ti serve sapere
                        </h2>
                        <p className="text-base md:text-lg text-muted max-w-xl mx-auto leading-relaxed">
                            Dalla gestione trasferte aziendali alla pianificazione viaggi di gruppo:
                            le risposte alle domande più comuni.
                        </p>
                    </motion.div>

                    <div className="space-y-3">
                        {FAQS.map((item, i) => (
                            <FAQItem
                                key={item.q}
                                item={item}
                                index={i}
                                isOpen={openIndex === i}
                                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
