import os
import google.generativeai as genai
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

def check_quota():
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print("❌ ERRORE: GOOGLE_API_KEY non trovata nel file .env")
        return

    print(f"🔑 Testando API Key: {api_key[:5]}...{api_key[-3:]}")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash") # Use a lightweight model
        
        print("⏳ Invio richiesta di test a Gemini...")
        response = model.generate_content("Rispondi solo con la parola 'OK' se mi senti.")
        
        if response.text:
            print("\nSUCCESS: La tua API Key è attiva e funzionante!")
            print(f"Risposta dal modello: {response.text.strip()}")
            print("Stato: Crediti disponibili (o piano gratuito attivo).")
        else:
            print("\WARNING: La richiesta ha avuto successo ma la risposta è vuota.")
            
    except Exception as e:
        error_msg = str(e)
        print("\n❌ ERRORE   RILEVATO:")
        
        if "429" in error_msg or "Resource has been exhausted" in error_msg:
            print("🚫 QUOTA ESAURITA: Hai finito i crediti gratuiti o hai raggiunto il limite di richieste.")
            print("   Soluzione: Attendi il reset della quota o collega un account di fatturazione su Google Cloud Console.")
        elif "403" in error_msg or "API_KEY_INVALID" in error_msg:
            print("🚫 CHIAVE NON VALIDA: La chiave API non è corretta o è stata disattivata.")
        elif "User location is not supported" in error_msg:
            print("🌍 ERRORE GEOGRAFICO: L'API non è disponibile nella tua regione attuale.")
        else:
            print(f"   Dettagli errore: {error_msg}")

if __name__ == "__main__":
    check_quota()
