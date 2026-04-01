import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise RuntimeError("ENCRYPTION_KEY env variable is not set.")
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_text(plaintext: str) -> str:
    """Cifra una stringa e restituisce il testo cifrato (str)."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_text(ciphertext: str) -> str:
    """
    Decifra una stringa cifrata con Fernet.
    Se il valore è legacy (plaintext JSON), lo restituisce invariato per
    garantire compatibilità durante la transizione.
    """
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception):
        # Token già in chiaro (salvato prima dell'introduzione della cifratura)
        logger.warning("decrypt_text: token non cifrato trovato, restituito as-is.")
        return ciphertext
