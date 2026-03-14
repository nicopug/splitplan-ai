import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv()

def test_gmail_smtp():
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    print(f"--- Test SMTP Gmail ---")
    print(f"User: {smtp_user}")
    print(f"Host: {smtp_host}:{smtp_port}")
    print(f"Password length: {len(smtp_password)}")
    
    if not smtp_user or not smtp_password:
        print("ERRORE: Credenziali SMTP mancanti nel file .env")
        return

    # Crea il messaggio
    msg = MIMEText("Questo è un test di invio da SplitPlan CLI.")
    msg['Subject'] = "SplitPlan SMTP Test"
    msg['From'] = smtp_user
    msg['To'] = smtp_user  # Invia a se stessi

    try:
        print("Connessione al server...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.set_debuglevel(1) # Mostra i log STMP nel dettaglio
        
        print("Avvio TLS (STARTTLS)...")
        server.starttls()
        
        print(f"Tentativo di login per {smtp_user}...")
        server.login(smtp_user, smtp_password)
        
        print("Login effettuato con successo!")
        
        print("Invio email di test...")
        server.send_message(msg)
        print("Email inviata correttamente!")
        
        server.quit()
        print("Connessione chiusa.")
        print("\nRISULTATO: LE TUE CREDENZIALI SONO CORRETTE! ✅")
        
    except Exception as e:
        print(f"\nERRORE DURANTE IL TEST: {e} ❌")
        print("\nSuggerimenti:")
        print("1. Verifica che la password dell'app di Google sia corretta (16 caratteri).")
        print("2. Assicurati che non ci siano spazi nel file .env.")
        print("3. Controlla se il tuo antivirus/firewall blocca la porta 587.")

if __name__ == "__main__":
    test_gmail_smtp()
