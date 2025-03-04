// @ts-check

/**
 * @typedef {'GET' | 'POST' | 'PUT' | 'DELETE'} HttpMethod
 */

/**
 * @typedef WallMessage
 * @property {string} author
 * @property {string} contents
 */

/**
 * @typedef UserDetails
 * @property {string} email
 * @property {string} firstname
 * @property {string} familyname
 * @property {string} gender
 * @property {string} city
 * @property {string} country
 */

/**
 * @typedef UserProperties
 * @property {WallMessage[]} messages
 * @typedef {UserDetails & UserProperties} User
 */

/**
 * @typedef ServerResponseFailure
 * @property {false} success
 * @property {string} message
 */

/**
 * @typedef ServerResponseSuccess
 * @property {true} success
 * @property {string} message
 * @property {any} data
 */


/**
 * @typedef {ServerResponseSuccess | ServerResponseFailure} ServerResponse
 */

/**
 * @param {*} obj
 * @returns {obj is ServerResponse}
 */
function assertServerResponse(obj) {
    if (typeof obj !== 'object') return false;
    if (!('success' in obj)) return false;
    if (!('message' in obj)) return false;
    return true;
}

class Server {
    /** 
     * @type {string | undefined}
     */
    token = undefined

    constructor() {}

    /**
     * @param {HttpMethod} method
     * @param {string} url body
     * @param {object} [body]
     * @returns {Promise<{ text: string, status: number }>}
     */
    async httpRequest(method, url, body) {
        const token = this.token
        return await new Promise((resolve, reject) => {
            const xhttp = new XMLHttpRequest();
            xhttp.addEventListener('loadend', () => {
                resolve({
                    text: xhttp.responseText,
                    status: xhttp.status,
                })
            });
            xhttp.addEventListener('error', () => {
                reject(`Server request failed.`)
            });
            xhttp.open(method, url, true);

            if (body != undefined) xhttp.setRequestHeader('Content-type', 'application/json');
            if (token != undefined) xhttp.setRequestHeader('Authorization', token);
            xhttp.send(JSON.stringify(body, null, 4));
        });
    };

    handleError(obj) {
        if (obj.message == "You are not signed in.") {
            setView('welcome');
            return true;
        }

        return false;
    }

    /**
     * @param {{ text: string, status: number }} response
     */
    async handleResponse(response) {
        return await new Promise((resolve, reject) => {
            const obj = JSON.parse(response.text);
            if (!assertServerResponse(obj)) return reject(`Server response was malformed, expected ServerResponse.`);
            if (!obj.success) {
                if (this.handleError(obj)) return;
                return reject({ status: response.status, data: obj });
            }
            resolve(obj.data)
        });
    }

    /**
     * @param {string | undefined} token 
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * @param {string} endpoint 
     * @param {Record<string, string>} [params]
     * @returns {Promise<any>}
     */
    async get(endpoint, params) {
        let url = `${endpoint}`;
        if (params != undefined) {
            const paramList = Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");
            url += `?${paramList}`;
        }

        const response = await this.httpRequest("GET", url);
        return this.handleResponse(response);
    }

    /**
     * @param {string} endpoint 
     * @param {object} [params]
     * @param {'POST' | 'DELETE' | 'PUT'} [method]
     * @returns {Promise<any>}
     */
    async post(endpoint, params, method = 'POST') {
        const url = `${endpoint}`;

        const response = await this.httpRequest(method, url, params);
        return this.handleResponse(response);
    }

    /**
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<string>}
     */
    signIn = (email, password) => this.post("sign_in", { username: email, password });

    /**
     * @param {UserDetails & { password: string }} data 
     * @returns {Promise<void>} 
     */
    signUp = (data) => this.post("sign_up", data)

    /**
     * @returns {Promise<void>} 
     */
    signOut = () => this.post("sign_out", undefined, "DELETE");

    /**
     * @param {string} oldpassword 
     * @param {string} newpassword 
     * @returns {Promise<void>} 
     */
    changePassword = (oldpassword, newpassword) => 
        this.post("change_password", { oldpassword, newpassword }, 'PUT')

    /**
     * @returns {Promise<UserDetails>} 
     */
    getUserDataByToken = () => 
        this.get("get_user_data_by_token")

    /**
     * @param {string} email
     * @returns {Promise<UserDetails>} 
     */
    getUserDataByEmail = (email) => 
        this.get(`get_user_data_by_email/${email}`);

    /**
     * @returns {Promise<WallMessage[]>} 
     */
    getUserMessagesByToken = () => 
        this.get("get_user_messages_by_token");

    /**
     * @param {string} email
     * @returns {Promise<WallMessage[]>} 
     */
    getUserMessagesByEmail = (email) => 
        this.get(`get_user_messages_by_email/${email}`);

    /**
     * @param {string} message
     * @param {{ lat: number, lon: number }} coords
     * @param {string} [email]
     * @returns {Promise<void>} 
     */
    postMessage = (message, coords, email) => 
        this.post("post_message", { message, coords, email }, "POST");
}

const server = new Server();