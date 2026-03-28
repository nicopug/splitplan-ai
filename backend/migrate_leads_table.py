from sqlmodel import SQLModel, create_engine
import os
from dotenv import load_dotenv

# Load .env
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, "..", ".env"))

# Import models to ensure they are registered
from models import DemoLead

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
else:
    engine = create_engine(DATABASE_URL)
    print("Creating DemoLead table...")
    try:
        # This will only create the missing tables
        DemoLead.__table__.create(engine)
        print("Success: DemoLead table created.")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("Notice: DemoLead table already exists.")
        else:
            print(f"Error: {e}")
