import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="py-20 bg-black border-t border-white/5">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
                    <div className="space-y-6">
                        <div className="text-xl font-semibold text-white tracking-tight uppercase">SplitPlan</div>
                        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                            {t('footer.tagline', 'Rendiamo i viaggi di gruppo facili, divertenti e senza stress.')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-10 text-[11px] font-medium tracking-[0.2em] uppercase text-gray-500">
                        <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
                        <a href="mailto:splitplan.ai@gmail.com" className="hover:text-white transition-colors duration-300">Contact</a>
                    </div>
                </div>

                <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-medium">
                        {t('footer.rights', '© 2025 SplitPlan AI.')}
                    </div>
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-sm border border-white/5 bg-white/2">
                        <div className="relative flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">SYSTEMS OPERATIONAL</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
