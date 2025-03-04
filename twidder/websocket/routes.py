from twidder.websocket.server_socket import ServerSocket
from .lib import ServerAction, parse_client_request
from . import sock

@sock.route('/socket')
def socket(ws):
    server_socket = ServerSocket(ws)
    try:
        while True:
            if server_socket.closed:
                print("server_socket.closed")
                break
            
            if server_socket.timeout_count >= 2:
                print("server_socket.timeout_count >= 2")
                break

            req_text = ws.receive(30)
            if req_text == None:
                server_socket.timeout_count += 1
                server_socket.send(ServerAction.PING)
            else:
                req = parse_client_request(req_text)
                server_socket.recv(req)
    except Exception as e:
        print(e)
    finally:
        if not server_socket.closed:
            server_socket.close()