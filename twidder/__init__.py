from flask import Flask
app = Flask(__name__,
            static_url_path='', 
            static_folder='static')

from . import views
from . import backend
from . import websocket