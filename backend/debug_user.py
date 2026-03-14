from sqlmodel import Session, select
from database import engine
from models import Account

def check_and_reset_user():
    with Session(engine) as session:
        # Trova l'utente (supponiamo sia il primo o cerchiamo per email se la sapessi)
        # In questo caso, prendiamo l'account che ha is_calendar_connected=True
        statement = select(Account).where(Account.is_calendar_connected == True)
        results = session.exec(statement).all()
        
        if not results:
            print("Nessun utente con calendario connesso trovato.")
            # Stampiamo tutti gli utenti per capire
            all_users = session.exec(select(Account)).all()
            for u in all_users:
                print(f"User: {u.name} {u.surname}, Email: {u.email}, Premium: {u.is_subscribed}, Calendar: {u.is_calendar_connected}")
            return

        for user in results:
            print(f"Trovato utente: {user.email}")
            print(f"Stato attuale - Premium: {user.is_subscribed}, Calendar: {user.is_calendar_connected}")
            
            # Reset per permettere un nuovo tentativo pulito
            user.is_calendar_connected = False
            user.google_calendar_token = None
            # Assicuriamoci che sia premium per vedere il tasto
            user.is_subscribed = True 
            
            session.add(user)
            print(f"Resettato stato calendar per {user.email} e forzato Premium.")
        
        session.commit()

if __name__ == "__main__":
    check_and_reset_user()
