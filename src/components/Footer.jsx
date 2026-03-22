import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    return (
        <footer className="py-20 bg-base border-t border-border-subtle transition-colors duration-500">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 group">
                            <img
                                src="/file.svg"
                                alt="SplitPlan Logo"
                                className={`w-14 h-14 transition-all duration-500 group-hover:rotate-12 ${theme === 'dark' ? 'invert' : ''}`}
                            />
                            <div className="text-xl font-black text-primary tracking-tight uppercase">SplitPlan</div>
                        </div>
                        <p className="text-muted text-sm max-w-xs leading-relaxed font-medium">
                            {t('footer.tagline', 'Rendiamo i viaggi di gruppo facili, divertenti e senza stress.')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-10 text-[11px] font-black tracking-[0.2em] uppercase text-muted">
                        <a href="/privacy" className="hover:text-primary transition-colors duration-300">Privacy</a>
                        <a href="/terms" className="hover:text-primary transition-colors duration-300">Terms</a>
                        <a href="mailto:splitplan.ai@gmail.com" className="hover:text-primary transition-colors duration-300">Contact</a>
                    </div>
                </div>

                <div className="mt-20 pt-10 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[10px] text-muted uppercase tracking-[0.3em] font-black">
                        {t('footer.rights', '© 2026 SplitPlan AI.')}
                    </div>
                    <div className="flex items-center gap-3 px-6 py-2 rounded-sm border border-border-medium bg-card shadow-sm">
                        <div className="relative flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-primary animate-ping opacity-75" />
                        </div>
                        <span className="text-[9px] font-black text-muted tracking-[0.2em] uppercase">SYSTEMS OPERATIONAL</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
