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
                                <div style="font-size: 36px; margin-bottom: 8px;">✈️</div>
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
                                                &copy; 2025 SplitPlan. Tutti i diritti riservati.<br>
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
                🔐
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
                ✓&nbsp;&nbsp;Verifica Email
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
                🔑
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
                🔑&nbsp;&nbsp;Reimposta Password
            </a>
        </div>

        <!-- SECURITY NOTE -->
        <div style="background-color: #fff8f3; border-left: 4px solid #E87C3E; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 24px 0;">
            <p style="color: #c45a1e; font-size: 12px; font-weight: 700; margin: 0;">
                ⚠️ Se non hai richiesto tu il reset, ignora questa email. La tua password rimarrà invariata.
            </p>
        </div>

        <!-- DIVIDER -->
        <div style="border-top: 1px solid #eef1f5; margin: 30px 0;"></div>

        <!-- FALLBACK LINK -->
        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:
        </p>
def booking_confirmation_email(name: str, trip_name: str, destination: str, dates: str, price: str, itinerary_url: str) -> str:
    """Template email per la conferma della prenotazione del viaggio."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                🎉
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
                📅&nbsp;&nbsp;Vedi Itinerario
            </a>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
            Puoi accedere ai dettagli del volo, hotel e costi nella sezione "CFO & Spese" dell'app.
        </p>
    """
    return base_template(content)


def purchase_receipt_email(name: str, product_name: str, amount: str, credits_added: str, market_url: str) -> str:
    """Template email per la ricevuta d'acquisto."""
    content = f"""
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e8f5e9; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; margin-bottom: 16px;">
                💳
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
                🛍️&nbsp;&nbsp;Torna al Market
            </a>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
            Grazie per aver scelto SplitPlan per i tuoi viaggi di gruppo!
        </p>
    """
    return base_template(content)
