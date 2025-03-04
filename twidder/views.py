from . import app

@app.route('/')
def index():
    return app.send_static_file("client.html")
