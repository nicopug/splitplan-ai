import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def test_brevo():
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", 587))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    print(f"--- DEBUG BREVO SMTP ---")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"User: {user}")
    print(f"Password settata: {'SI' if password else 'NO'}")
    
    msg = MIMEText("Test di debug da SplitPlan")
    msg['Subject'] = "SplitPlan Debug"
    msg['From'] = user
    msg['To'] = user

    try:
        print("\nConnessione al server...")
        server = smtplib.SMTP(host, port, timeout=10)
        server.set_debuglevel(1)
        
        print("Avvio TLS...")
        server.starttls()
        
        print("Tentativo di login...")
        server.login(user, password)
        
        print("LOGIN RIUSCITO! ✅")
        server.send_message(msg)
        print("EMAIL INVIATA! ✅")
        server.quit()
    except Exception as e:
        print(f"\nERRORE RILEVATO: {e}")
        print("\nCosa significa?")
        if "Authentication failed" in str(e) or "535" in str(e):
            print("-> La password o l'utente di Brevo sono errati.")
        elif "timeout" in str(e).lower():
            print("-> Il tuo PC o la tua rete bloccano la porta 587.")
        else:
            print("-> C'è un problema di configurazione generale.")

if __name__ == "__main__":
    test_brevo()
