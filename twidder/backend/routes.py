from flask import request
from twidder import app
import bcrypt
from . import database_helper
from .lib import BadRequestError, ChangePasswordData, ConflictError, ForbiddenError, NotFoundError, PostMessageData, SignInData, SignUpData, UnauthorizedError, check_password, create_token, handle_errors, hash_password, protected, success
from twidder.websocket.lib import ServerAction
from twidder.websocket.server_socket import activeConnections

@app.route("/sign_in", methods = ['POST'])
@handle_errors
def sign_in():
    """ 
    HTTP Error Codes:
    500 Bad Request - Missing or invalid data. (Should be validated by client.)
    401 Unauthorized - Invalid credentials.
    """

    data = SignInData(request.json)

    if not check_password(data.email, data.password):
        raise UnauthorizedError("Invalid credentials.")

    token = create_token()
    database_helper.insert_session(token, data.email)

    return success("Successfully signed in.", token), 200

@app.route("/sign_up", methods = ['POST'])
@handle_errors
def sign_up():
    """ 
    HTTP Error Codes:
    500 Bad Request - Missing or invalid data. (Should be validated by client.)
    409 Conflict - User already exists.
    """

    data = SignUpData(request.json)
    if database_helper.check_user_exists(data.email):
        # print(f"{data.email} already exists")
        raise ConflictError("User already exists.")

    database_helper.insert_user(data)

    return success("Successfully created a new user."), 201
    
@app.route("/get_user_data_by_token", methods = ['GET'])
@protected
@handle_errors
def get_user_data_by_token():
    """ 
    HTTP Error Codes:
    401 Unauthorized - Not logged in or invalid token.
    """

    email = database_helper.get_email_from_session(request.headers['Authorization'])
    user = database_helper.get_user_by_email(email)

    return success("User data retrieved.", user.as_dict()), 200

@app.route("/get_user_data_by_email/<email>", methods = ['GET'])
@protected
@handle_errors
def get_user_data_by_email(email):
    """ 
    HTTP Error Codes:
    401 Unauthorized - Not logged in or invalid token.
    404 Not Found - No user with the email found.
    """

    user = database_helper.get_user_by_email(email)

    return success("User data retrieved.", user.as_dict()), 200
    
@app.route("/change_password", methods = ['PUT'])
@protected
@handle_errors
def change_password():
    """ 
    HTTP Error Codes:
    500 Bad Request - Missing or invalid data. (Should be validated by client.)
    401 Unauthorized - Not logged in or invalid token.
    403 Forbidden - Invalid credentials.
    """

    data = ChangePasswordData(request.json)
    email = database_helper.get_email_from_session(request.headers['Authorization'])

    if not check_password(email, data.old_password):
        raise ForbiddenError("Wrong password.")
    database_helper.change_password(email, hash_password(data.new_password))

    return success("Password changed."), 200

@app.route("/post_message", methods = ['POST'])
@protected
@handle_errors
def post_message():
    """ 
    HTTP Error Codes:
    500 Bad Request - Missing or invalid data. (Should be validated by client.)
    401 Unauthorized - Not logged in or invalid token.
    404 Not Found -  Recipient was not found.
    """

    data = PostMessageData(request.json)
    email = database_helper.get_email_from_session(request.headers['Authorization'])

    if not database_helper.check_user_exists(data.recipient):
        raise NotFoundError("No such recipient.")
    
    recipientClient = activeConnections.get(data.recipient)
    if (recipientClient != None):
        recipientClient.send(ServerAction.NEW_MESSAGE)
    
    database_helper.post_message(email, data.message, data.recipient)

    return success("Message posted."), 201

@app.route("/get_user_messages_by_token", methods = ['GET'])
@protected
@handle_errors
def get_user_messages_by_token():
    """ 
    HTTP Error Codes:
    401 Unauthorized - Not logged in or invalid token.
    """

    email = database_helper.get_email_from_session(request.headers['Authorization'])
    messages = database_helper.get_user_messages(email)

    return success("User messages retrieved.", [message.as_dict() for message in messages]), 200

@app.route("/get_user_messages_by_email/<email>", methods = ['GET'])
@protected
@handle_errors
def get_user_messages_by_email(email):
    """ 
    HTTP Error Codes:
    401 Unauthorized - Not logged in or invalid token.
    404 Not Found - No user with the email found.
    """

    if not database_helper.check_user_exists(email):
        raise BadRequestError("No such user.")
    
    messages = database_helper.get_user_messages(email)

    return success("User messages retrieved.", [message.as_dict() for message in messages]), 200

@app.route("/sign_out", methods = ['DELETE'])
@protected
@handle_errors
def sign_out():  
    """ 
    HTTP Error Codes:
    401 Unauthorized - Not logged in or invalid token.
    """

    database_helper.delete_session(request.headers['Authorization'])
    return success("Successfully signed out."), 200