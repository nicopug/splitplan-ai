import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch
from datetime import datetime

# Aggiungi la root del progetto al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import DemoLead
from backend.routers.leads import send_demo_emails

async def test_emails():
    # Mock lead
    test_lead = DemoLead(
        full_name="Mario Rossi",
        company_name="Test Corp",
        work_email="mario@test.com",
        phone_number="+39 123456789",
        team_size="51-200",
        travel_frequency="Monthly",
        message="Voglio una demo personalizzata.",
        created_at=datetime.utcnow()
    )

    print("🔍 Testing send_demo_emails logic...")
    
    # Mock SMTP config
    with patch('backend.routers.leads.get_smtp_config') as mock_config:
        mock_config.return_value = ("admin@test.com", "pass", AsyncMock())
        
        # Mock FastMail
        with patch('backend.routers.leads.FastMail') as MockFastMail:
            mock_fm_instance = MockFastMail.return_value
            mock_fm_instance.send_message = AsyncMock()
            
            await send_demo_emails(test_lead)
            
            # Verifiche
            print(f"✅ FastMail.send_message called: {mock_fm_instance.send_message.call_count} times")
            if mock_fm_instance.send_message.call_count == 2:
                print("✨ BOTH emails (admin & lead) were triggered correctly!")
            else:
                print(f"❌ Expected 2 calls, got {mock_fm_instance.send_message.call_count}")

if __name__ == "__main__":
    asyncio.run(test_emails())
