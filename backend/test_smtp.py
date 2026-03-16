import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Carica variabili d'ambiente
load_dotenv()

def test_gmail_smtp():
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    logger.info(f"--- Test SMTP Gmail ---")
    logger.info(f"User: {smtp_user}")
    logger.info(f"Host: {smtp_host}:{smtp_port}")
    logger.info(f"Password length: {len(smtp_password)}")
    
    if not smtp_user or not smtp_password:
        logger.error("ERRORE: Credenziali SMTP mancanti nel file .env")
        return

    # Crea il messaggio
    msg = MIMEText("Questo è un test di invio da SplitPlan CLI.")
    msg['Subject'] = "SplitPlan SMTP Test"
    msg['From'] = smtp_user
    msg['To'] = smtp_user  # Invia a se stessi

    try:
        logger.info("Connessione al server...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.set_debuglevel(1) # Mostra i log STMP nel dettaglio
        
        logger.info("Avvio TLS (STARTTLS)...")
        server.starttls()
        
        logger.info(f"Tentativo di login per {smtp_user}...")
        server.login(smtp_user, smtp_password)
        
        logger.info("Login effettuato con successo!")
        
        logger.info("Invio email di test...")
        server.send_message(msg)
        logger.info("Email inviata correttamente!")
        
        server.quit()
        logger.info("Connessione chiusa.")
        logger.info("\nRISULTATO: LE TUE CREDENZIALI SONO CORRETTE! ✅")
        
    except Exception as e:
        logger.error(f"\nERRORE DURANTE IL TEST: {e} ❌")
        logger.info("\nSuggerimenti:")
        logger.info("1. Verifica che la password dell'app di Google sia corretta (16 caratteri).")
        logger.info("2. Assicurati che non ci siano spazi nel file .env.")
        logger.info("3. Controlla se il tuo antivirus/firewall blocca la porta 587.")

if __name__ == "__main__":
    test_gmail_smtp()
