import os
from fastapi_mail import ConnectionConfig
import logging

logger = logging.getLogger(__name__)

def get_smtp_config():
    """Configurazione SMTP centralizzata con pulizia stringhe e logging robusto."""
    try:
        smtp_user = os.getenv("SMTP_USER", "").replace('"', '').replace("'", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "").replace('"', '').replace("'", "").strip()
        
        if not smtp_user or not smtp_password:
            logger.error("[SMTP] ERRORE: Credenziali mancanti (SMTP_USER o SMTP_PASSWORD)")
            return None, None, None
            
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        
        # Log di debug sicuro
        logger.info(f"[SMTP] Preparo config per: {smtp_host}:{smtp_port}")
        logger.info(f"[SMTP] User: {smtp_user}")
        logger.info(f"[SMTP] Password Length: {len(smtp_password)}")

        # Rilevamento automatico sicurezza in base alla porta
        use_starttls = smtp_port == 587
        use_ssl = smtp_port == 465

        conf = ConnectionConfig(
            MAIL_USERNAME=smtp_user,
            MAIL_PASSWORD=smtp_password,
            MAIL_FROM=os.getenv("SMTP_FROM", smtp_user).strip(),
            MAIL_PORT=smtp_port,
            MAIL_SERVER=smtp_host,
            MAIL_STARTTLS=use_starttls,
            MAIL_SSL_TLS=use_ssl,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
        return smtp_user, smtp_password, conf
    except Exception as e:
        logger.error(f"[SMTP] Errore critico in get_smtp_config: {e}")
        return None, None, None

