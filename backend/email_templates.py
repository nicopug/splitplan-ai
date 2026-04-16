"""
Template HTML premium per le email transazionali di SplitPlan.
Tutti i template usano inline CSS per massima compatibilità con i client email.
"""


def base_template(content: str) -> str:
    """Layout wrapper con header SplitPlan, footer e branding."""
    return f"""
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SplitPlan</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f2f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                        
                        <!-- HEADER -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #23599E 0%, #1a4580 50%, #0f2d54 100%); border-radius: 24px 24px 0 0; padding: 40px 40px 30px 40px; text-align: center;">
                                <div style="font-size: 36px; margin-bottom: 8px;">\u2708\ufe0f</div>
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; font-style: italic;">
                                    Split<span style="color: #7cb8ff;">Plan</span>
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
                                    AI-Powered Trip Planner
                                </p>
                            </td>
                        </tr>

                        <!-- CONTENT -->
                        <tr>
                            <td style="background-color: #ffffff; padding: 40px;">
                                {content}
                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="background-color: #fafafa; border-radius: 0 0 24px 24px; padding: 30px 40px; border-top: 1px solid #eef1f5;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <p style="margin: 0 0 12px 0; color: #999; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                                                Pianifica • Vota • Parti
                                            </p>
                                            <p style="margin: 0; color: #bbb; font-size: 11px; line-height: 1.6;">
                                                &copy; 2026 SplitPlan. Tutti i diritti riservati.<br>
                                                Questa email è stata inviata automaticamente.<br>
                                                Non rispondere a questo messaggio.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def verification_email(name: str, verification_url: str) -> str:
    """Template email per la verifica dell'account."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f4fd; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \U0001f510
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Verifica il tuo Account
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 30px 0;">
            Grazie per esserti registrato su SplitPlan! Per completare la registrazione e iniziare a pianificare i tuoi viaggi, verifica il tuo indirizzo email cliccando il pulsante qui sotto.
        </p>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verification_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                \u2713&nbsp;&nbsp;Verifica Email
            </a>
        </div>

        <!-- DIVIDER -->
        <div style="border-top: 1px solid #eef1f5; margin: 30px 0;"></div>

        <!-- FALLBACK LINK -->
        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:
        </p>
        <p style="color: #23599E; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
            <a href="{verification_url}" style="color: #23599E; text-decoration: underline;">{verification_url}</a>
        </p>
    """
    return base_template(content)


def reset_password_email(name: str, reset_url: str) -> str:
    """Template email per il reset della password."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fef3e8; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \U0001f511
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Reset della Password
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 30px 0;">
            Abbiamo ricevuto una richiesta di reset per la tua password. Clicca il pulsante qui sotto per impostarne una nuova. Il link scadrà tra <strong>1 ora</strong>.
        </p>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}"
               style="display: inline-block; background: linear-gradient(135deg, #E87C3E, #d4652d); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(232, 124, 62, 0.35);">
                \U0001f511&nbsp;&nbsp;Reimposta Password
            </a>
        </div>

        <!-- SECURITY NOTE -->
        <div style="background-color: #fff8f3; border-left: 4px solid #E87C3E; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 24px 0;">
            <p style="color: #c45a1e; font-size: 12px; font-weight: 700; margin: 0;">
                \u26a0\ufe0f Se non hai richiesto tu il reset, ignora questa email. La tua password rimarrà invariata.
            </p>
        </div>

        <!-- DIVIDER -->
        <div style="border-top: 1px solid #eef1f5; margin: 30px 0;"></div>

        <!-- FALLBACK LINK -->
        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:
        </p>
        <p style="color: #23599E; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
            <a href="{reset_url}" style="color: #23599E; text-decoration: underline;">{reset_url}</a>
        </p>
    """
    return base_template(content)


def booking_confirmation_email(
    name: str,
    trip_name: str,
    destination: str,
    dates: str,
    price: str,
    itinerary_url: str,
) -> str:
    """Template email per la conferma della prenotazione del viaggio."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \U0001f389
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Viaggio Confermato!
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ottime notizie <strong style="color: #23599E;">{name}</strong>!
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Il vostro viaggio <strong>{trip_name}</strong> è stato confermato ufficialmente. Preparate le valigie per <strong>{destination}</strong>!
        </p>

        <!-- TRAVEL SUMMARY -->
        <div style="background-color: #f8f9fa; border-radius: 16px; padding: 24px; margin-bottom: 30px; border: 1px solid #eef1f5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; color: #999; font-size: 12px; font-weight: 600; text-transform: uppercase;">Riepilogo Viaggio</td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <span style="color: #555; font-size: 14px;">Destinazione:</span>
                        <span style="color: #1a1a1a; font-size: 14px; font-weight: 700; float: right;">{destination}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <span style="color: #555; font-size: 14px;">Date:</span>
                        <span style="color: #1a1a1a; font-size: 14px; font-weight: 700; float: right;">{dates}</span>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span style="color: #555; font-size: 14px;">Stima Budget:</span>
                        <span style="color: #23599E; font-size: 14px; font-weight: 900; float: right;">{price}</span>
                    </td>
                </tr>
            </table>
        </div>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="{itinerary_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                \U0001f4c5&nbsp;&nbsp;Vedi Itinerario
            </a>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
            Puoi accedere ai dettagli del volo, hotel e costi nella sezione "CFO & Spese" dell'app.
        </p>
    """
    return base_template(content)


def purchase_receipt_email(
    name: str, product_name: str, amount: str, credits_added: str, market_url: str
) -> str:
    """Template email per la ricevuta d'acquisto."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \U0001f4b3
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Ricevuta d'Acquisto
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Grazie per il tuo acquisto <strong style="color: #23599E;">{name}</strong>!
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Il tuo pagamento è andato a buon fine. Ecco i dettagli della transazione:
        </p>

        <!-- PURCHASE DETAILS -->
        <div style="background-color: #f8f9fa; border-radius: 16px; padding: 24px; margin-bottom: 30px; border: 1px solid #eef1f5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; color: #999; font-size: 12px; font-weight: 600; text-transform: uppercase;">Dettagli Transazione</td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <span style="color: #555; font-size: 14px;">Prodotto:</span>
                        <span style="color: #1a1a1a; font-size: 14px; font-weight: 700; float: right;">{product_name}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <span style="color: #555; font-size: 14px;">Importo Totale:</span>
                        <span style="color: #1a1a1a; font-size: 14px; font-weight: 700; float: right;">{amount}</span>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span style="color: #555; font-size: 14px;">Crediti Sbloccati:</span>
                        <span style="color: #23599E; font-size: 14px; font-weight: 900; float: right;">{credits_added}</span>
                    </td>
                </tr>
            </table>
        </div>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="{market_url}"
               style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;">
                \U0001f6cd\ufe0f&nbsp;&nbsp;Torna al Market
            </a>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
            Grazie per aver scelto SplitPlan per i tuoi viaggi di gruppo!
    """
    return base_template(content)


def demo_request_notification_email(
    full_name: str,
    company_name: str,
    work_email: str,
    phone_number: str,
    team_size: str,
    travel_frequency: str,
    message: str,
) -> str:
    """Template email per notificare l'admin di una nuova richiesta demo B2B."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #f0f7ff; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \U0001f4bc
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Nuova Richiesta Demo B2B
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Hai ricevuto una nuova richiesta di demo per <strong>SplitPlan Business</strong>. Ecco i dettagli del lead:
        </p>

        <!-- LEAD DETAILS -->
        <div style="background-color: #fff; border-radius: 16px; padding: 24px; margin-bottom: 30px; border: 1px solid #eef1f5; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f0f2f5;">
                        <span style="color: #999; font-size: 12px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Nominativo</span>
                        <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">{full_name}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f0f2f5;">
                        <span style="color: #999; font-size: 12px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Azienda</span>
                        <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">{company_name}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f0f2f5;">
                        <span style="color: #999; font-size: 12px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Email Lavorativa</span>
                        <span style="color: #23599E; font-size: 15px; font-weight: 600;">{work_email}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f0f2f5;">
                        <span style="color: #999; font-size: 12px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Telefono</span>
                        <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">{phone_number or "Non fornito"}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f0f2f5;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="50%" style="padding-right: 10px;">
                                    <span style="color: #999; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Dimensione Team</span>
                                    <span style="color: #1a1a1a; font-size: 14px; font-weight: 600;">{team_size}</span>
                                </td>
                                <td width="50%">
                                    <span style="color: #999; font-size: 11px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Frequenza Viaggi</span>
                                    <span style="color: #1a1a1a; font-size: 14px; font-weight: 600;">{travel_frequency}</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0;">
                        <span style="color: #999; font-size: 12px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">Messaggio/Note</span>
                        <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
                            "{message or "Nessun messaggio aggiuntivo."}"
                        </p>
                    </td>
                </tr>
            </table>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
            Si prega di ricontattare il potenziale cliente entro le prossime 24 ore lavorative.
        </p>
    """
    return base_template(content)


def welcome_email(name: str, login_url: str) -> str:
    """Email di benvenuto per nuovo utente registrato."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#127881;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Benvenuto su SplitPlan!
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Il tuo account è attivo. Inizia subito a pianificare viaggi di gruppo con l'AI — proponi destinazioni, vota e organizza tutto in un'unica piattaforma.
        </p>

        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #eef1f5;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 8px 0;">
                        <span style="color: #23599E; font-size: 16px; margin-right: 10px;">&#9989;</span>
                        <span style="color: #333; font-size: 14px;">Crea il tuo primo viaggio con l'AI</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">
                        <span style="color: #23599E; font-size: 16px; margin-right: 10px;">&#9989;</span>
                        <span style="color: #333; font-size: 14px;">Invita il tuo gruppo e vota la destinazione</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;">
                        <span style="color: #23599E; font-size: 16px; margin-right: 10px;">&#9989;</span>
                        <span style="color: #333; font-size: 14px;">Gestisci spese e budget in tempo reale</span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="{login_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                &#9992;&#65039;&nbsp;&nbsp;Inizia a Pianificare
            </a>
        </div>
    """
    return base_template(content)


def company_invite_email(company_name: str, invite_url: str) -> str:
    """Email di invito a unirsi a un'azienda su SplitPlan."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #f0f7ff; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#127970;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Sei stato invitato!
            </h2>
        </div>

        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Sei stato invitato a unirti a <strong style="color: #23599E;">{company_name}</strong> su SplitPlan.
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
            SplitPlan è la piattaforma che gestisce le trasferte aziendali con l'AI — pianificazione, approvazioni e note spese, tutto in un posto.
        </p>

        <div style="background-color: #f0f7ff; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px; border: 1px solid #d0e7ff; text-align: center;">
            <p style="color: #23599E; font-size: 14px; font-weight: 700; margin: 0;">
                &#127970; Organizzazione: <strong>{company_name}</strong>
            </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="{invite_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                Accetta Invito
            </a>
        </div>

        <div style="border-top: 1px solid #eef1f5; margin: 30px 0;"></div>
        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
            <a href="{invite_url}" style="color: #23599E; text-decoration: underline;">{invite_url}</a>
        </p>
    """
    return base_template(content)


def email_approval_requested(manager_name: str, trip_name: str, requester_name: str, manager_url: str) -> str:
    """Email al manager: dipendente ha richiesto approvazione trasferta."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fffbeb; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#9203;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Nuova Richiesta di Approvazione
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{manager_name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            <strong>{requester_name}</strong> ha richiesto l'approvazione della seguente trasferta aziendale:
        </p>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 18px 20px; margin-bottom: 28px;">
            <p style="color: #92400e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Trasferta in attesa</p>
            <p style="color: #1a1a1a; font-size: 17px; font-weight: 800; margin: 0;">&#128188; {trip_name}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="{manager_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                &#9989;&nbsp;&nbsp;Approva o Rifiuta
            </a>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Accedi alla dashboard manager per visualizzare i dettagli e prendere una decisione.
        </p>
    """
    return base_template(content)


def email_trip_approved(organizer_name: str, trip_name: str, manager_name: str, trip_url: str) -> str:
    """Email all'organizzatore: trasferta approvata dal manager."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#9989;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Trasferta Approvata!
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{organizer_name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Ottima notizia! La tua trasferta aziendale è stata approvata.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 12px 12px 0; padding: 18px 20px; margin-bottom: 28px;">
            <p style="color: #14532d; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Approvato da {manager_name}</p>
            <p style="color: #1a1a1a; font-size: 17px; font-weight: 800; margin: 0;">&#128188; {trip_name}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="{trip_url}"
               style="display: inline-block; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);">
                &#9992;&#65039;&nbsp;&nbsp;Vai alla Trasferta
            </a>
        </div>
    """
    return base_template(content)


def email_trip_rejected(organizer_name: str, trip_name: str, manager_name: str, trip_url: str, reason: str = None) -> str:
    """Email all'organizzatore: trasferta rifiutata dal manager."""
    reason_block = f"""
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 6px 0;">Motivazione</p>
            <p style="color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 0;">{reason}</p>
        </div>
    """ if reason else ""

    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#10060;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Trasferta Non Approvata
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{organizer_name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
            La tua trasferta aziendale <strong>"{trip_name}"</strong> è stata rifiutata da <strong>{manager_name}</strong>.
        </p>

        {reason_block}

        <div style="text-align: center; margin: 32px 0;">
            <a href="{trip_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 16px 48px;
                      text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px;
                      letter-spacing: 0.5px; text-transform: uppercase;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                Modifica e Richiedi di Nuovo
            </a>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Puoi rivedere il piano e richiedere nuovamente l'approvazione.
        </p>
    """
    return base_template(content)


def demo_request_confirmation_email(full_name: str, company_name: str) -> str:
    """Template email di conferma/ringraziamento per il cliente che richiede la demo."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                \u2705
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Richiesta Ricevuta!
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{full_name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Grazie per l'interesse verso <strong>SplitPlan Business</strong> per la tua azienda (<strong>{company_name}</strong>).
        </p>

        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Abbiamo preso in carico la tua richiesta. Un nostro esperto analizzerà le vostre esigenze di trasferta e ti contatterà via email o telefono per fissare una demo personalizzata nei prossimi giorni.
        </p>

        <div style="background-color: #f0f7ff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; border: 1px solid #d0e7ff;">
            <p style="color: #23599E; font-size: 14px; font-weight: 700; margin: 0;">
                Presto scoprirai come ottimizzare i viaggi del tuo team con l'AI!
            </p>
        </div>

        <p style="color: #999; font-size: 12px; line-height: 1.6; text-align: center; margin: 0;">
            A presto,<br>
            Il Team di SplitPlan Corporate
        </p>
    """
    return base_template(content)


def duplicate_registration_attempt_email(name: str, login_url: str, reset_url: str) -> str:
    """
    Email silenziosa inviata quando qualcuno tenta di registrarsi con un'email
    già presente nel DB. Previene l'account-enumeration: l'endpoint pubblico
    ritorna sempre il medesimo messaggio generico, e il proprietario reale
    dell'account viene avvisato via mail.
    """
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fff8f3; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                &#128274;
            </div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">
                Tentativo di registrazione rilevato
            </h2>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
            Ciao <strong style="color: #23599E;">{name}</strong>,
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            Qualcuno (forse tu stesso) ha tentato di registrare un nuovo account
            su SplitPlan usando questa email, ma <strong>sei già registrato</strong>.
        </p>

        <div style="background-color: #fff8f3; border-left: 4px solid #E87C3E; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 0 0 28px 0;">
            <p style="color: #c45a1e; font-size: 13px; font-weight: 600; margin: 0;">
                &#9888;&#65039; Se non sei stato tu, ti consigliamo di cambiare la password per sicurezza.
            </p>
        </div>

        <div style="text-align: center; margin: 0 0 20px 0;">
            <a href="{login_url}"
               style="display: inline-block; background: linear-gradient(135deg, #23599E, #1a6fd1); color: #ffffff; padding: 14px 36px;
                      text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 13px;
                      letter-spacing: 0.5px; text-transform: uppercase; margin: 0 6px 10px 6px;
                      box-shadow: 0 4px 15px rgba(35, 89, 158, 0.35);">
                Accedi al tuo account
            </a>
            <a href="{reset_url}"
               style="display: inline-block; background: #ffffff; color: #23599E; border: 2px solid #23599E; padding: 12px 34px;
                      text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 13px;
                      letter-spacing: 0.5px; text-transform: uppercase; margin: 0 6px 10px 6px;">
                Reimposta la password
            </a>
        </div>

        <div style="border-top: 1px solid #eef1f5; margin: 30px 0;"></div>

        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
            Se sei stato tu a tentare la registrazione e non ricordavi di avere
            un account, nessun problema: puoi accedere o reimpostare la password
            usando i pulsanti qui sopra. Non \u00e8 necessaria alcuna altra azione.
        </p>
    """
    return base_template(content)
