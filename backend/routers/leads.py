import os
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlmodel import Session, select
from database import get_session
from models import DemoLead
from utils.email_utils import get_smtp_config
from email_templates import demo_request_notification_email, demo_request_confirmation_email
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])

async def send_demo_emails(lead: DemoLead):
    """
    Sends notification email to admin and confirmation email to the lead.
    """
    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    if not smtp_user or not smtp_password:
        logger.warning("[LEADS] SMTP not configured. Skipping emails.")
        return

    fm = FastMail(smtp_conf)
    
    # 1. Email to Admin
    try:
        admin_email = os.getenv("ADMIN_EMAIL", smtp_user)
        admin_message = MessageSchema(
            subject=f"🚀 Nuova Richiesta Demo: {lead.company_name}",
            recipients=[admin_email],
            body=demo_request_notification_email(
                full_name=lead.full_name,
                company_name=lead.company_name,
                work_email=lead.work_email,
                phone_number=lead.phone_number,
                team_size=lead.team_size,
                travel_frequency=lead.travel_frequency,
                message=lead.message
            ),
            subtype=MessageType.html
        )
        await fm.send_message(admin_message)
        logger.info(f"[LEADS] Admin notification sent for {lead.company_name}")
    except Exception as e:
        logger.error(f"[LEADS] Failed to send admin notification: {e}")

    # 2. Email to Lead (Thank You)
    try:
        user_message = MessageSchema(
            subject="Grazie per l'interesse verso SplitPlan Business! ✈️",
            recipients=[lead.work_email],
            body=demo_request_confirmation_email(
                full_name=lead.full_name,
                company_name=lead.company_name
            ),
            subtype=MessageType.html
        )
        await fm.send_message(user_message)
        logger.info(f"[LEADS] Confirmation email sent to {lead.work_email}")
    except Exception as e:
        logger.error(f"[LEADS] Failed to send confirmation email to {lead.work_email}: {e}")

@router.post("/demo")
async def create_demo_lead(
    lead: DemoLead, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """
    Saves a new demo lead request and triggers email notifications.
    """
    try:
        session.add(lead)
        session.commit()
        session.refresh(lead)
        
        # Trigger emails in background to not block the response
        background_tasks.add_task(send_demo_emails, lead)
        
        return {"success": True, "id": lead.id, "message": "Demo request received successfully."}
    except Exception as e:
        session.rollback()
        logger.error(f"[LEADS] Error saving lead: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")

@router.get("/demo", tags=["admin"])
async def list_demo_leads(session: Session = Depends(get_session)):
    """
    Returns a list of all demo leads.
    """
    leads = session.exec(select(DemoLead).order_by(DemoLead.created_at.desc())).all()
    return leads
