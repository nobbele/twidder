const getSignupForm = () => /** @type {HTMLFormElement} */ (document.getElementById('signup-form'));

const getFirstNameInput = () => document.getElementById("firstname");
const getFamilyNameInput = () => document.getElementById("familyname");
const getGenderInput = () => document.getElementById("gender");
const getCityInput = () => document.getElementById("city");
const getCountryInput = () => document.getElementById("country");
const getSignupEmailInput = () => document.getElementById("signup-email");

const getSignupPasswordInput = () => document.getElementById("signup-password");
const getRepeatPasswordInput = () => document.getElementById("repeat-password");

const getSignupSubmitInput = () => getSignupForm().querySelector("#signup-form input[type='submit']");
const getSignupFormMessage = () => getSignupForm().querySelector(".form-message")

const email_regex = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}';

const validateSignupForm = () => {
    const emailInput = getSignupEmailInput();
    emailInput.setCustomValidity("");
    if (!emailInput.value.match(email_regex)) {
        emailInput.setCustomValidity("Invalid email format.");
        return false;
    }

    const passwordInput = getSignupPasswordInput()
    const repeatPasswordInput = getRepeatPasswordInput();

    repeatPasswordInput.setCustomValidity("");
    if (passwordInput.value != repeatPasswordInput.value) {
        repeatPasswordInput.setCustomValidity("Password doesn't match!");
        return false;
    }

    return true;
};

const getLoginForm = () => document.getElementById('login-form');

const validateLoginForm = () => {
    const emailInput = getLoginEmailInput();
    emailInput.setCustomValidity("");
    if (!emailInput.value.match(email_regex)) {
        emailInput.setCustomValidity("Invalid email format.");
        return false;
    }

    return true;
}

const getLoginEmailInput = () => document.getElementById("login-email");
const getLoginPasswordInput = () => document.getElementById("login-password");

const getLoginFormMessage = () => getLoginForm().querySelector(".form-message")

const onWelcomeViewLoad = () => {
    getSignupForm().addEventListener('input', validateSignupForm);
    getSignupForm().addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateSignupForm()) {
            return false;
        }

        const signupFormMessage = getSignupFormMessage();
        signupFormMessage.classList.remove("active");
        await server.signUp({
          email: getSignupEmailInput().value,
          password: getSignupPasswordInput().value,
          firstname: getFirstNameInput().value,
          familyname: getFamilyNameInput().value,
          gender: getGenderInput().value,
          city: getCityInput().value,
          country: getCountryInput().value,
        }).then(() => {
            getSignupForm().reset()
            showToast("Signup successful.");
        }, ({ status }) => {
            let message = "An unknown error occured.";
            if (status == 409) {
                message = "A user already exists with this email.";
            }

            signupFormMessage.innerText = message;
            signupFormMessage.classList.add("active");
        });

        return true;
    });

    getLoginForm().addEventListener('input', validateLoginForm);
    getLoginForm().addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateLoginForm()) {
            return false;
        }

        const loginFormMessage = getLoginFormMessage();
        loginFormMessage.classList.remove("active");
        await server.signIn(getLoginEmailInput().value, getLoginPasswordInput().value).then(token => {
            socketClient.setToken(token);
            socketClient.login();
        }, ({ status }) => {
            let message = "An unknown error occured.";
            if (status == 403) {
                message = "Invalid credentials.";
            }

            loginFormMessage.innerText = message;
            loginFormMessage.classList.add("active");
        });

        return true;
    });
};