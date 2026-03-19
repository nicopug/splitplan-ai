
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="c:/Users/nicol/Desktop/splitplan-ai/backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def fix_db():
    queries = [
        "ALTER TABLE trip ALTER COLUMN start_date DROP NOT NULL;",
        "ALTER TABLE trip ALTER COLUMN end_date DROP NOT NULL;"
    ]
    
    with engine.connect() as conn:
        for query in queries:
            try:
                print(f"Executing: {query}")
                conn.execute(text(query))
                conn.commit()
                print("Done.")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
