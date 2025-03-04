// @ts-check

/** Non-null coercion when type checking
 * @template T
 * @param {T} item
 * @returns {NonNullable<T>}
 */
function NonNull(item) {
    return /** @type {NonNullable<T>} */(item)
}

/** Type casting when type checking
 * @param {any} item
 * @returns {HTMLElement}
 */
function AsHTMLElement(item) {
    return /** @type {HTMLElement} */(item)
}

/** Type casting when type checking
 * @param {any} item
 * @returns {HTMLInputElement}
 */
function AsHTMLInputElement(item) {
    return /** @type {HTMLInputElement} */(item)
}

const getHomeEntry = () => NonNull(document.getElementById('nav-home'));
const getBrowseEntry = () => NonNull(document.getElementById('nav-browse'));
const getAccountEntry = () => NonNull(document.getElementById('nav-account'));

const getHomeButton = () => NonNull(getHomeEntry().querySelector('button'));
const getBrowseButton = () => NonNull(getBrowseEntry().querySelector('button'));
const getAccountButton = () => NonNull(getAccountEntry().querySelector('button'));

const getProfileRoot = () => NonNull(document.getElementById('profile-root'));

const tabs = {
    'home': {
        getNavEntry: getHomeEntry,
        getSection: () => NonNull(document.getElementById('home-section')),
        refresh: () => onHomeViewRefresh(),
    },
    'browse': {
        getNavEntry: getBrowseEntry,
        getSection: () => NonNull(document.getElementById('browse-section')),
        refresh: () => {},
    },
    'account': {
        getNavEntry: getAccountEntry,
        getSection: () => NonNull(document.getElementById('account-section')),
        refresh: () => {},
    }
};

/** @type {keyof tabs} */
let _activeTab;
const getActiveTab = () => tabs[_activeTab];
const setActiveTab = (tabName, keepViewing = false) => {
    _activeTab = tabName;
    
    Object.values(tabs).forEach(tab => {
        tab.getSection().classList.remove('active')
        tab.getNavEntry().classList.remove('active')
    })

    if (!keepViewing) _viewingUser = null;
    
    const activeTab = getActiveTab();
    activeTab.getSection().classList.add('active');
    if (_activeTab != 'home' || !_viewingUser) {
        activeTab.getNavEntry().classList.add('active');
    }

    activeTab.refresh();
};

/** @type {string} */
let _userEmail;

const onProfileViewLoad = async () => {
    getHomeButton().addEventListener('click', () => setActiveTab('home'));
    getBrowseButton().addEventListener('click', () => setActiveTab('browse'));
    getAccountButton().addEventListener('click', () => setActiveTab('account'));

    const userDetails = await server.getUserDataByToken();
    _userEmail = userDetails.email;

    onHomeViewLoad();
    onBrowseViewLoad();
    onAccountViewLoad();

    setActiveTab('home');
};

/* Home */

const getDetailsEmail = () => NonNull(document.getElementById("details-email"));
const getDetailsFirstName = () => NonNull(document.getElementById("details-firstname"));
const getDetailsFamilyName = () => NonNull(document.getElementById("details-familyname"));
const getDetailsGender = () => NonNull(document.getElementById("details-gender"));
const getDetailsCity = () => NonNull(document.getElementById("details-city"));
const getDetailsCountry = () => NonNull(document.getElementById("details-country"));

const getMessageWallList = () => NonNull(document.getElementById("wall-message-list"));

const escapeHtml = (unsafe) => {
    if (unsafe == undefined) return unsafe;
    return unsafe
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

const refreshMessageWall = async () => {
    const messages = await server.getUserMessagesByEmail(getTargetUserEmail());

    const messagesHtml = messages.map(message => `<li>
        ${escapeHtml(message.author)} says <em>${escapeHtml(message.contents)}</em>!
    </li>`).join("<hr />");

    getMessageWallList().innerHTML = messagesHtml;
};

const getMessageWallPostContents = () => AsHTMLInputElement(NonNull(document.getElementById("message-form-content")));
const getMessageWallForm = () => NonNull(document.getElementById("message-form"));
const getMessageWallFormServerMessage = () => AsHTMLElement(NonNull(getMessageWallForm().querySelector(".form-message")));
const getMessageWallRefresh = () => NonNull(document.getElementById("message-wall-refresh"));

const onHomeViewRefresh = async () => {
    const userDetails = await server.getUserDataByEmail(getTargetUserEmail());
    getDetailsEmail().innerText = `Email: ${userDetails.email}`;
    getDetailsFirstName().innerText = `First Name: ${userDetails.firstname}`;
    getDetailsFamilyName().innerText = `Family Name: ${userDetails.familyname}`;
    getDetailsGender().innerText = `Gender: ${userDetails.gender}`;
    getDetailsCity().innerText = `City: ${userDetails.city}`;
    getDetailsCountry().innerText = `Country: ${userDetails.country}`;

    refreshMessageWall();
};

const onHomeViewLoad = () => {    
    getMessageWallRefresh().addEventListener('click', refreshMessageWall);   
    getMessageWallForm().addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageContent = getMessageWallPostContents().value;

        const messageWallFormServerMessage = getMessageWallFormServerMessage();
        messageWallFormServerMessage.classList.remove("active");
        try {
            await server.postMessage(
                messageContent,
                getTargetUserEmail()
            );

            getMessageWallPostContents().value = "";
            await refreshMessageWall();
        } catch {
            // There are no expected errors here.
            messageWallFormServerMessage.innerText = "An unknown error has occured.";
            messageWallFormServerMessage.classList.add("active");
        };
    });

    onHomeViewRefresh();
};

/* Browse */

/** @type {string | null} */
let _viewingUser = null;

/** @param {string | null} email */
const setViewingUser = (email) => {
    _viewingUser = email;
}

const getTargetUserEmail = () => _viewingUser ?? _userEmail;

const getBrowseForm = () => NonNull(document.getElementById("browse-form"));
const getBrowseEmailInput = () => AsHTMLInputElement(document.getElementById("browse-email"));
const getBrowseFormMessage = () => AsHTMLElement(getBrowseForm().querySelector(".form-message"));

const onBrowseViewLoad = () => {
    getBrowseForm().addEventListener('submit', async (e) => {
        e.preventDefault();

        _viewingUser = getBrowseEmailInput().value;
        if (_viewingUser == _userEmail) _viewingUser = null;

        let success = true;
        if (_viewingUser != null) {
            const browseFormMessage = getBrowseFormMessage();
            browseFormMessage.classList.remove("active");
            try {
                await server.getUserDataByEmail(_viewingUser);
            } catch ({ status }) {
                let message = "An unknown error has occured.";
                if (status == 404) {
                    message = "No such user.";
                }
            
                browseFormMessage.innerText = message;
                browseFormMessage.classList.add("active");

                success = false;
            }
        }
        
        if (success)
            setActiveTab('home', true);

        return success;
    });
};

/* Account */

const getChangePasswordForm = () => NonNull(document.getElementById('change-password-form'));
const getChangePasswordOldPasswordInput = () => AsHTMLInputElement(document.getElementById("old-password"));
const getChangePasswordNewPasswordInput = () => AsHTMLInputElement(document.getElementById("new-password"));
const getChangePasswordRepeatNewPasswordInput = () => AsHTMLInputElement(document.getElementById("repeat-new-password"));

const getChangePasswordMessage = () => AsHTMLElement(getChangePasswordForm().querySelector(".form-message"));

const validateChangePasswordForm = () => {
    const newPasswordInput = getChangePasswordNewPasswordInput()
    const repeatPasswordInput = getChangePasswordRepeatNewPasswordInput();

    repeatPasswordInput.setCustomValidity("");
    if (newPasswordInput.value != repeatPasswordInput.value) {
        repeatPasswordInput.setCustomValidity("Password doesn't match!");
        return false;
    }

    return true;
};

const getLogoutButton = () => NonNull(document.getElementById("logout"));

const onAccountViewLoad = () => {
    getLogoutButton().addEventListener('click', async () => {
        await server.signOut();
        socketClient.logout();
    });

    getChangePasswordForm().addEventListener('input', validateChangePasswordForm);
    getChangePasswordForm().addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateChangePasswordForm()) {
            return false;
        }

        const changePasswordMessage = getChangePasswordMessage();
        changePasswordMessage.classList.remove("active");
        await server.changePassword(
            getChangePasswordOldPasswordInput().value, 
            getChangePasswordNewPasswordInput().value
        ).catch(({ status }) => {
            let message = "An unknown error has occured.";
            if (status == 403) {
                message = "Wrong password."
            }

            changePasswordMessage.innerText = message;
            changePasswordMessage.classList.add("active");
        });

        return true;
    });
}