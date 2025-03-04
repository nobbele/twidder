const getView = (id) => {
    const el = document.getElementById(id);
    return el.innerHTML;
};

const getRootElement = () => document.getElementById('root');

const views = {
    'welcome': { getView: () => getView('welcome-view'), onLoad: onWelcomeViewLoad },
    'profile': { getView: () => getView('profile-view'), onLoad: onProfileViewLoad },
};

/**
 * @param {keyof views} name 
 */
const setView = (name) => {
    console.log(`Set view to ${name}`);
    const view = views[name];
    getRootElement().innerHTML = view.getView();
    view.onLoad();
};

window.onload = async () => {
    if (localStorage.token != undefined) {
        socketClient.setToken(localStorage.token);
    } else {
        setView('welcome');
    }
};

/** @type {number | undefined} */
let existingToastTimeout = undefined;

/**
 * @param {string} message 
 * @param {'INFO' | 'ERROR'} [type]
 * @param {boolean} [twoline]
 */
const showToast = (message, type = 'INFO', twoline = false) => {
    document.getElementById('toast-text').innerHTML = message;
    const toastEl = document.getElementById('toast');

    if (existingToastTimeout != undefined) 
        clearTimeout(existingToastTimeout);

    toastEl.classList.remove("info");
    if (type == "INFO") 
        toastEl.classList.add("info");
    toastEl.classList.remove("error");
    if (type == "ERROR") 
        toastEl.classList.add("error");
    toastEl.classList.remove('twoline');
    if (twoline)
        toastEl.classList.add('twoline');

    toastEl.classList.add('active');
    existingToastTimeout = setTimeout(() => {
        toastEl.classList.remove('active');
    }, 2000);
};