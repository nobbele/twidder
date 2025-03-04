import random
import re
import string
from typing import Any
from flask import jsonify, request
from . import database_helper
import bcrypt


def validate_password(password: str):
    if len(password) < 3: 
        raise BadRequestError("Password needs to be at least 3 characters long.")

email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
def validate_email(email: str):
    if len(email) == 0: 
        raise BadRequestError("Email is empty.")
    if not re.fullmatch(email_regex, email): 
        raise BadRequestError("Invalid email format.")
    
# Start of HTTP Errors

class BadRequestError(Exception):
    pass

class ConflictError(Exception):
    pass

class UnauthorizedError(Exception):
    pass

class ForbiddenError(Exception):
    pass

class NotFoundError(Exception):
    pass

class InternalServerError(Exception):
    pass

def missing(field: str):
    return BadRequestError(f"Missing {field}.")

class SignInData:
    email: str
    password: str

    def __init__(self, data: dict[str, Any] | None):
        if data == None: return
        if not isinstance(data.get('username'), str): raise missing("Email")
        if len(data.get('username')) == 0: raise BadRequestError("Email is empty.")
        if not isinstance(data.get('password'), str): raise missing("Password")

        self.email = data['username']
        self.password = data['password']

class SignUpData:
    email: str
    password: str

    firstname: str
    familyname: str
    gender: str
    city: str
    country: str

    def __init__(self, data: dict[str, Any] | None):
        if data == None: return
        if not isinstance(data.get('email'), str): raise missing("Email")
        validate_email(data.get('email'))
        if not isinstance(data.get('password'), str): raise missing("Password")
        validate_password(data.get('password'))

        if not isinstance(data.get('firstname'), str): raise missing("First name")
        if len(data.get('firstname')) == 0: raise BadRequestError("First name is empty.")
        if not isinstance(data.get('familyname'), str): raise missing("Family name")
        if len(data.get('familyname')) == 0: raise BadRequestError("Family name is empty.")

        if not isinstance(data.get('gender'), str): raise missing("Gender")
        if len(data.get('gender')) == 0: raise BadRequestError("Gender is empty.")

        if not isinstance(data.get('city'), str): raise missing("City")
        if len(data.get('city')) == 0: raise BadRequestError("City is empty.")
        if not isinstance(data.get('country'), str): raise missing("Country")
        if len(data.get('country')) == 0: raise BadRequestError("Country is empty.")

        self.email = data['email']
        self.password = data['password']

        self.firstname = data['firstname']
        self.familyname = data['familyname']
        self.gender = data['gender']
        self.city = data['city']
        self.country = data['country']

class ChangePasswordData:
    old_password: str
    new_password: str

    def __init__(self, data: dict[str, Any] | None):
        if data == None: return
        if not isinstance(data.get('oldpassword'), str): raise missing("Old password")
        if len(data.get('oldpassword')) == 0: raise BadRequestError("Old password is empty.")
        if not isinstance(data.get('newpassword'), str): raise missing("New password")
        validate_password(data.get('newpassword'))

        self.old_password = data['oldpassword']
        self.new_password = data['newpassword']

class PostMessageData:
    message: str
    recipient: str | None
    lat: float
    lon: float

    def __init__(self, data: dict[str, Any] | None):
        if data == None: return
        if not isinstance(data.get('message'), str): raise missing("Message")
        if len(data.get('message')) == 0: raise BadRequestError("Message is empty.")
        if isinstance(data.get('email'), str):
            validate_email(data.get('email'))
            self.recipient = data['email']
        else:
            self.recipient = None

        self.message = data['message']

        if data.get('coords') != None \
            and not isinstance(data["coords"].get("lat"), float) \
            and not isinstance(data["coords"].get("lon"), float):
            raise missing("coords object need lat and lon fields.")
        self.lat = data['coords']['lat']
        self.lon = data['coords']['lon']

def hash_password(plaintext: str) -> str:
    return bcrypt.hashpw(plaintext.encode(), bcrypt.gensalt()).decode()

def create_token():
    return ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits) for _ in range(36))

def error(message: str):
    return jsonify({
        "success": False,
        "message": str(message)
    })

def success(message: str, data: Any = None):
    d = {
        "success": True,
        "message": str(message),
    }
    if data != None: d['data'] = data
    return jsonify(d)

def handle_errors(func):
    def check_errors(*args, **kwargs):
        try:
            return func(*args, **kwargs)        
        except BadRequestError as err:
            return error(err), 400
        except UnauthorizedError as err:
            return error(err), 401
        except ForbiddenError as err:
            return error(err), 403
        except NotFoundError as err:
            return error(err), 404
        except ConflictError as err:
            return error(err), 409
        except InternalServerError as err:
            return error(err), 500
        except Exception as err:
            return error(err), 500

    check_errors.__name__ = func.__name__
    return check_errors

def protected(func):
    def check_token(*args, **kwargs):
        if 'Authorization' not in request.headers:
            return error("You are not signed in."), 401
        if not database_helper.check_session(request.headers['Authorization']):
            return error("You are not signed in."), 401

        return func(*args, **kwargs)

    check_token.__name__ = func.__name__
    return check_token

def check_password(email: str, password: str) -> bool:
    try:
        password_hash = database_helper.get_password_hash(email)
    except Exception as err:
        print(err)
        return False
    
    if password_hash == None:
        return False

    if not bcrypt.checkpw(password.encode(), password_hash.encode()):
        return False
    
    return True