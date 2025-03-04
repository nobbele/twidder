from twidder import app
from flask_sock import Sock

sock = Sock(app)

from . import routes