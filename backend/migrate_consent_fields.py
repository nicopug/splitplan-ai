import os
from sqlalchemy import text
from sqlmodel import Session, create_engine
import logging

# Carica setup base
DATABASE_URL = "postgresql://postgres.fjvcmhiwxeoohnbthbtd:BS1ZCHp9ctLSQimy@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        try:
            logger.info("Adding terms_accepted column...")
            session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT TRUE;"))
            
            logger.info("Adding privacy_accepted column...")
            session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT TRUE;"))
            
            session.commit()
            logger.info("✅ Migration completed successfully.")
        except Exception as e:
            session.rollback()
            logger.error(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
