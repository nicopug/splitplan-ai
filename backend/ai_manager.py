import os
from google import genai
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class AIManager:
    def __init__(self):
        self.provider = None
        self.client = None
        self.model_name = None
        
        # Carica le chiavi
        self.google_key = os.getenv("GOOGLE_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        
        # Avvia il test di connessione
        self.initialize_best_provider()

    def initialize_best_provider(self):
        """Testa Google. Se fallisce, attiva OpenRouter."""
        print("--- AI ORCHESTRATOR: Checking providers ---")
        
        # 1. PROVA GOOGLE (PIANO A)
        if self.google_key:
            try:
                print("Testing Google Gemini API...")
                temp_client = genai.Client(api_key=self.google_key)
                # Facciamo una chiamata leggerissima per testare la quota
                temp_client.models.generate_content(
                    model='gemini-2.0-flash-exp', 
                    contents='Test'
                )
                
                # Se siamo qui, Google funziona!
                self.client = temp_client
                self.provider = "GOOGLE"
                self.model_name = "gemini-2.0-flash-exp" # O 2.5 se disponibile
                print(f"✅ Google API Active. Using model: {self.model_name}")
                return
            except Exception as e:
                print(f"⚠️ Google API Failed (Quota or Error): {e}")
                print("Switching to Fallback...")

        # 2. PROVA OPENROUTER (PIANO B)
        if self.openrouter_key:
            print("Activating OpenRouter (Plan B)...")
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.openrouter_key,
                default_headers={"X-Title": "SplitPlan AI"}
            )
            self.provider = "OPENROUTER"
            self.model_name = "google/gemini-2.0-flash-exp:free" # O il modello che preferisci su OpenRouter
            print(f"✅ OpenRouter Active. Using model: {self.model_name}")
            return
        
        # 3. DISASTRO (NESSUNA CHIAVE)
        self.provider = "NONE"
        print("❌ CRITICAL: No AI providers available.")

    def generate_response(self, prompt: str) -> str:
        """Metodo unificato per generare testo, indipendentemente dal provider."""
        if self.provider == "GOOGLE":
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                print(f"Error during Google generation: {e}")
                return None

        elif self.provider == "OPENROUTER":
            try:
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a helpful travel assistant. Output strictly valid JSON."},
                        {"role": "user", "content": prompt}
                    ]
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(f"Error during OpenRouter generation: {e}")
                return None
        
        return None

# Creiamo un'istanza singola da importare negli altri file
ai_manager = AIManager()