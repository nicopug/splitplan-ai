@router.get("/migrate-trip-intent")
async def migrate_trip_intent(session: Session = Depends(get_session)):
    """Aggiunge trip_intent alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS trip_intent VARCHAR DEFAULT 'LEISURE';"))
        session.commit()
        return {"status": "success", "message": "Colonna trip_intent aggiunta."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}
