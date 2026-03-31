from cryptography.fernet import Fernet
import sqlalchemy.types as types
from app.config import settings

# Initialize the Fernet cipher suite
try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode('utf-8'))
except ValueError as e:
    raise ValueError(f"Invalid ENCRYPTION_KEY configuration: {e}")

def encrypt_data(data: str) -> str:
    """Encrypt a string and return the URL-safe base64-encoded encrypted token."""
    if not data:
        return data
    return cipher_suite.encrypt(data.encode('utf-8')).decode('utf-8')

def decrypt_data(token: str) -> str:
    """Decrypt a URL-safe base64-encoded encrypted token back to the original string."""
    if not token:
        return token
    try:
        return cipher_suite.decrypt(token.encode('utf-8')).decode('utf-8')
    except Exception:
        # If decryption fails (e.g. data was not actually encrypted, or wrong key)
        # return the original token (useful during migration where some rows might be plain text)
        return token

class EncryptedString(types.TypeDecorator):
    """
    A SQLAlchemy custom type that transparently encrypts strings on the way into the database,
    and decrypts them on the way out.
    """
    impl = types.String
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        return encrypt_data(value)

    def process_result_value(self, value, dialect):
        return decrypt_data(value)
