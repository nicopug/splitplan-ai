import os
from fastapi_mail import ConnectionConfig

def get_smtp_config():
    """Configurazione SMTP centralizzata."""
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        return None, None, None
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_host = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
    
    # Rilevamento automatico sicurezza in base alla porta
    # 587 -> STARTTLS, 465 -> SSL/TLS
    use_starttls = smtp_port == 587
    use_ssl = smtp_port == 465

    print(f"[SMTP] Configurazione: {smtp_host}:{smtp_port} (STARTTLS: {use_starttls}, SSL: {use_ssl})")
    
    conf = ConnectionConfig(
        MAIL_USERNAME=smtp_user,
        MAIL_PASSWORD=smtp_password,
        MAIL_FROM=os.getenv("SMTP_FROM", smtp_user),
        MAIL_PORT=smtp_port,
        MAIL_SERVER=smtp_host,
        MAIL_STARTTLS=use_starttls,
        MAIL_SSL_TLS=use_ssl,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )
    return smtp_user, smtp_password, conf
