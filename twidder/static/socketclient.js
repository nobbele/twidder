// @ts-check

const createWebSocketUrl = (path) => {
    var protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    return protocolPrefix + '//' + location.host + path;
};
/**
 * @param {*} obj
 * @returns {obj is SocketResponse}
 */
function assertSocketResponse(obj) {
    if (typeof obj !== 'object') return false;
    if (!('success' in obj)) return false;
    if (!('message' in obj)) return false;
    return true;
}

/**
 * @typedef {'PING' | 'PONG' | 'LOGOUT' | 'LOGIN'} SocketClientAction
 */

/**
 * @typedef SocketClientMessage
 * @property {SocketClientAction} action
 * @property {any} [data]
 */

/**
 * @typedef {'OPEN' | 'CLOSE' | 'PING' | 'PONG' | 'LOGOUT' | 'LOGGED_IN' | 'NEW_MESSAGE'} SocketServerAction
 */

/**
 * @typedef SocketServerMessage
 * @property {SocketServerAction} action
 * @property {number} [clientId]
 * @property {any} [data]
 */

/**
 * @param {*} obj
 * @returns {obj is SocketServerMessage}
 */
function assertSocketServerMessage(obj) {
    if (typeof obj !== 'object') return false;
    if (!('action' in obj)) return false;
    return true;
}

class SocketClient {
    /** @type {WebSocket} */
    socket;
    id = 0;

    /**
     * @typedef {(data: any) => void} MessageHandler
     * @type {Partial<Record<SocketServerAction, MessageHandler[]>>}
     */
    messageListeners = {};

    timeoutCounter = 0;
    lastHeartbeat = Date.now();

    lastRequestTimestamp = 0
    waitingForResponse = false;

    isOpen = false;
    isLoggedIn = false;
    isLoggingIn = false;

    /** @type {string | undefined} */
    token = undefined

    constructor() {
        this.open();

        this.addListener('PING', () => this.sendMessage('PONG'));
        this.addListener('OPEN', () => {
            this.isOpen = true;
            console.log("Socket open.");

            this.addListener('PONG', (data) => {
                if (data != 0xDEADBEEF) 
                    console.warn("Invalid PONG response.");

                this.timeoutCounter = 0;
            });

            if (this.token != undefined) {
                this.login();
            }
        });
        this.addListener('CLOSE', () => {
            if (this.isOpen) 
                this.onClose();

            // TODO Exponential back-off?
            setTimeout(() => this.open(), 1000);
        });
        this.addListener('LOGGED_IN', () => {
            console.log("Successfully logged in to websocket.");
            this.isLoggingIn = false;
            this.isLoggedIn = true;
        });
    }

    /**
     * @param {string | undefined} token 
     */
    setToken(token) {
        if (token != this.token) {
            this.isLoggingIn = false;
            this.isLoggedIn = false;

            this.token = token;
        }

        if (token == undefined) {
            delete localStorage.token;
        } else {
            localStorage.token = token;
        }
    }

    /**
     * @param {string} [reason] 
     */
    close = (reason) => this.handleMessage('CLOSE', { reason });

    onClose() {
        this.isOpen = false;
        this.isLoggedIn = false;

        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;

        this.socket.close();

        console.log("Socket closed.");
    }

    open() {
        this.socket = new WebSocket(createWebSocketUrl("/socket"));
        this.socket.onmessage = (e) => this.onMessage(e);
        this.socket.onopen = () => this.handleMessage('OPEN');
        this.socket.onclose = (e) => this.close(`onclose(${e.reason || "no reason..."})`);
    }

    startHeartbeatHandler() {
        if (this.heartbeatTimer != undefined) 
            clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
            const timeSinceHeartbeat = this.lastHeartbeat - Date.now();
            if (timeSinceHeartbeat < 25 * 1000) return;

            if (this.timeoutCounter >= 2) {
                console.warn("Socket connection timed out.");
                this.close("Socket connection timed out.");
                return;
            };

            this.timeoutCounter += 1;
            this.ping(0xDEADBEEF);
        }, 30 * 1000);
    }

    nextId = () => this.id++;

    /**
     * 
     * @param {SocketClientMessage} message
     */
    send(message) {
        if (this.waitingForResponse && (this.lastRequestTimestamp - Date.now()) > 30 * 1000) {
            console.warn("Request timed out.");
            this.close("Request timed out.");
        }

        const id = this.nextId();
        this.socket.send(JSON.stringify({
            id,
            message
        }));
        return id;
    }

    /**
     * 
     * @param {SocketClientAction} action 
     * @param {any} [data] 
     */
    sendMessage(action, data) {
        this.waitingForResponse = true;
        this.lastRequestTimestamp = Date.now();

        this.send({ action, data });
    }

    /**
     * 
     * @param {SocketServerAction} action 
     * @param {(data: any) => void} callback 
     */
    addListener(action, callback) {
        if (this.messageListeners[action] == undefined) 
            this.messageListeners[action] = [];
        this.messageListeners[action].push(callback);
    }

    /** 
     * @param {SocketServerAction} action
     * @param {any} [data] 
    */
    handleMessage(action, data) {
        console.log(`handleMessage(${action})`, data);
        if (this.messageListeners[action] == undefined) {
            console.warn(`Unhandled websocket action ${action}`);
            return;
        }

        this.messageListeners[action].forEach(handler => handler(data));
    }

    /**
     * 
     * @param {MessageEvent} event 
     */
    onMessage(event) {
        this.lastHeartbeat = Date.now();

        const msgData = JSON.parse(event.data);
        if (!assertSocketServerMessage(msgData)) {
            console.error(`Server response was malformed, expected SocketServerMessage. Received ${event.data}`);
            this.waitingForResponse = false;
            return;
        }

        /** @type {{ action: SocketServerAction, data?: any }} */
        const { action, data } = msgData;
        if (action != 'PONG' && action != 'PING') {
            this.waitingForResponse = false;
        }

        this.handleMessage(action, data);
    }

    /**
     * 
     * @param {any} [value] 
     */
    ping = (value) => this.sendMessage("PING", value);

    logout = () => this.handleMessage("LOGOUT", { reason: "Logged out by user." });

    login() {
        if (this.token == undefined) 
            throw new Error("Token is undefined.");
        if (!this.isOpen || this.isLoggedIn || this.isLoggingIn) 
            return;

        this.isLoggingIn = true;
        this.sendMessage("LOGIN", this.token);
    }
}

const socketClient = new SocketClient();

socketClient.addListener('LOGGED_IN', () => {
    showToast("You are logged in.");

    server.setToken(socketClient.token);
    setView('profile');
});
socketClient.addListener('LOGOUT', ({ reason }) => {
    showToast(`You are logged out.<br/>Reason: ${reason}`, "INFO", true);

    socketClient.setToken(undefined);
    server.setToken(undefined);
    setView('welcome');
});

socketClient.addListener('NEW_MESSAGE', () => {
    try { refreshMessageWall(); }
    catch {}
})
