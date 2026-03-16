import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()

def test_brevo():
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", 587))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    logger.info(f"--- DEBUG BREVO SMTP ---")
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"User: {user}")
    logger.info(f"Password settata: {'SI' if password else 'NO'}")
    
    msg = MIMEText("Test di debug da SplitPlan")
    msg['Subject'] = "SplitPlan Debug"
    msg['From'] = user
    msg['To'] = user

    try:
        logger.info("\nConnessione al server...")
        server = smtplib.SMTP(host, port, timeout=10)
        server.set_debuglevel(1)
        
        logger.info("Avvio TLS...")
        server.starttls()
        
        logger.info("Tentativo di login...")
        server.login(user, password)
        
        logger.info("LOGIN RIUSCITO! ✅")
        server.send_message(msg)
        logger.info("EMAIL INVIATA! ✅")
        server.quit()
    except Exception as e:
        logger.error(f"\nERRORE RILEVATO: {e}")
        logger.error("\nCosa significa?")
        if "Authentication failed" in str(e) or "535" in str(e):
            logger.error("-> La password o l'utente di Brevo sono errati.")
        elif "timeout" in str(e).lower():
            logger.error("-> Il tuo PC o la tua rete bloccano la porta 587.")
        else:
            logger.error("-> C'è un problema di configurazione generale.")

if __name__ == "__main__":
    test_brevo()
