from enum import StrEnum
import json
from typing import Any
from flask import jsonify


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

class ClientAction(StrEnum):
    PING = "PING"
    PONG = "PONG"
    LOGIN = "LOGIN"

class ClientMessage:
    action: ClientAction
    data: Any

    def __init__(self, data: dict[str, Any]):
        if data == None: raise Exception("Malformed request.")
        if not isinstance(data.get('action'), str): raise Exception("Malformed request.")

        self.action = data['action']
        if self.action not in ClientAction: raise Exception("Malformed request.")

        self.data = data.get('data')

class ClientRequest:
    id: int
    message: ClientMessage

    def __init__(self, data: dict[str, Any]):
        if data == None: raise Exception("Malformed request.")
        if not isinstance(data.get('id'), int): raise Exception("Malformed request.")
        if data.get('message') == None: raise Exception("Malformed request.")

        self.id = data['id']
        self.message = ClientMessage(data['message'])

def parse_client_request(data):
    return ClientRequest(json.loads(data))

class ServerAction(StrEnum):
    PING = "PING"
    PONG = "PONG"
    LOGGED_IN = "LOGGED_IN"
    LOGOUT = "LOGOUT"
    NEW_MESSAGE = "NEW_MESSAGE"