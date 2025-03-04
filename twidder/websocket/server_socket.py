import json
from typing import Any

from twidder.backend import database_helper
from .lib import ClientAction, ClientRequest, ServerAction

class ServerSocket:
    closed = False
    timeout_count = 0

    msg_id: int = None
    action: ClientAction
    data: Any

    token = None
    email = None
    logged_in = False

    def __init__(self, ws) -> None:
        self.ws = ws

    def close(self):
        print("Closing ServerSocket.")
        if self.email != None and self.email in activeConnections:
            del activeConnections[self.email]
        self.ws.close()
        self.closed = True

    def recv(self, req: ClientRequest):
        self.msg_id, msg = req.id, req.message
        self.action, self.data = msg.action, msg.data
        
        if self.action == ClientAction.PING:
            self.onPing()
            return
        elif self.action == ClientAction.PONG:
            self.onPong()
            return
        elif self.action == ClientAction.LOGIN:
            self.onLogin()
            return
        
        # Protected actions
        if not self.logged_in:
            # Return an error?
            print("Not logged in.")
            self.close()
        
        print(f"Unhandled client action {self.action}")
        
    def send(self, action: ServerAction, data: Any = None):
        self.ws.send(json.dumps({
            "action": action,
            "data": data
        }))
        
    def sendResponse(self, action: ServerAction, data: Any = None):
        self.ws.send(json.dumps({
            "clientId": self.msg_id,
            "action": action,
            "data": data
        }))
        
    def onPing(self):
        self.send(ServerAction.PONG, self.data)

    def onPong(self):
        self.timeout_count = 0

    def onLogin(self):
        if self.logged_in:
            self.sendResponse(ServerAction.LOGGED_IN)
        
        if self.data == None:
            raise Exception("Missing token.")
        
        self.token = self.data
        self.email = database_helper.try_get_email_from_session(self.token)
        if self.email == None:
            print(f"Token ({self.token}) is not associated with any user.")
            self.send(ServerAction.LOGOUT, { "reason": "Token is not associated with any user." })
            return
        
        # Logout other clients.
        oldClient = activeConnections.get(self.email)
        if oldClient != None and oldClient.token != self.token:
            print(self.token)
            print("You logged in at another location.")
            oldClient.send(ServerAction.LOGOUT, { "reason": "You logged in at another location." })

        self.logged_in = True
        self.sendResponse(ServerAction.LOGGED_IN)
        activeConnections[self.email] = self

# Email -> ServerSocket
activeConnections: dict[str, ServerSocket] = {}