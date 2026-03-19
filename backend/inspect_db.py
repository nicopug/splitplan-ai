
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(dotenv_path="c:/Users/nicol/Desktop/splitplan-ai/backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def inspect_columns():
    query = """
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'trip'
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        print("Column inspection for 'trip':")
        for row in result:
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    inspect_columns()
