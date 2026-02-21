import os
from fastapi_mail import ConnectionConfig

def get_smtp_config():
    """Configurazione SMTP centralizzata."""
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        return None, None, None
    conf = ConnectionConfig(
        MAIL_USERNAME=smtp_user,
        MAIL_PASSWORD=smtp_password,
        MAIL_FROM=os.getenv("SMTP_FROM", smtp_user),
        MAIL_PORT=int(os.getenv("SMTP_PORT", 587)),
        MAIL_SERVER=os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )
    return smtp_user, smtp_password, conf
