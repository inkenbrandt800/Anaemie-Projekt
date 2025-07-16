let BACKEND_URL = ""
await fetch('./config.json')
    .then(res => res.json())
    .then(config => {
        BACKEND_URL = config.BACKEND_URL
    });

// call backend to receive userdata such as name, birthday etc. and write into sessionStorage
export async function getUserdata(){
    let uid = localStorage.getItem("uid")
    if(uid !== null || uid !== ""){
        await axios.get(BACKEND_URL + "/userdata?uid=" + uid, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(response => {
            const resData = response.data
            if(resData.name !== "" || resData.name !== null){
                sessionStorage.setItem("name", resData.name)
            }
            if(resData.birthday !== "" || resData.birthday !== null){
                sessionStorage.setItem("birthday", resData.birthday)
            }
            if(resData.gender !== "" || resData.gender !== null){
                sessionStorage.setItem("gender", resData.gender)
            }
            if(resData.vorerkrankung !== "" || resData.vorerkrankung !== null){
                sessionStorage.setItem("vorerkrankung", resData.vorerkrankung)
            }
            if(resData.medikamente !== "" || resData.medikamente !== null){
                sessionStorage.setItem("medikamente", resData.medikamente)
            }
        })
    }
}

// send new userdata to backend to save it in the db
export function saveUserdata(){
    sessionStorage.setItem("name", document.getElementById("name").value)
    sessionStorage.setItem("birthday", document.getElementById("geburtsdatum").value)
    sessionStorage.setItem("gender", document.getElementById("geschlecht").value)

    let body = {
        uid: localStorage.getItem("uid"),
        name: sessionStorage.getItem("name"),
        birthday: sessionStorage.getItem("birthday"),
        gender: sessionStorage.getItem("gender"),
        vorerkrankung: sessionStorage.getItem("vorerkrankung"),
        medikamente: sessionStorage.getItem("medikamente")
    }
    axios.post(BACKEND_URL + "/userdata", body, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
}

// clear the sessionStorage (so the user gets redirected to login everytime trying to view a page) and redirect to login page
export function logout() {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = "login.html"
}

// send username, password to backend, check if passwords are matching and check if user already exists
export async function register() {
    let username = document.getElementById("username").value
    let password = document.getElementById("password").value
    let password2 = document.getElementById("password2").value
    document.getElementById("errormessage").style.display = "none"

    if(username !== ("" || null) && password !== ("" || null)){
        if(password === password2){
            let body = {
                username: username,
                password: password
            }

            try {
                const response = await axios.post(BACKEND_URL + "/register", body, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    if(response.status === 200){
                        console.log("Response", response.data)
                        localStorage.setItem("loggedIn", "true");
                        localStorage.setItem("username", username);
                        localStorage.setItem("password", password);
                        localStorage.setItem("uid", response.data.id)
                        console.log("Erfolgreich registriert und eingeloggt");
                        window.location.href = "index.html";
                    } else {
                        document.getElementById("errormessage").style.display = "block"
                        document.getElementById("errormessage").innerText = "Registrierung fehlgeschlagen."
                    }
                })
            } catch (error) {
                document.getElementById("errormessage").style.display = "block"
                document.getElementById("errormessage").innerText = "Registrierung fehlgeschlagen."
                console.error("Login fehlgeschlagen:", error);
            }
        } else {
            document.getElementById("errormessage").style.display = "block"
            document.getElementById("errormessage").innerText = "Die Passwörter stimmen\nnicht überein."
        }
    } else {
        document.getElementById("errormessage").style.display = "block"
        document.getElementById("errormessage").innerText = "Bitte Passwort und\nBenutzernamen angeben."
    }
}

// Verifying if the user credentials in localStorage are valid and match the ones in the db - else redirect to login page
export async function verify(param) {

    let username = localStorage.getItem("username")
    let password = localStorage.getItem("password")

    let body = {
        username: username,
        password: password
    }

    const forwarding = (param === "standard")

    if(localStorage.getItem("username") !== null && localStorage.getItem("password") !== null){
        try {
            console.log("starting call to: " + BACKEND_URL + "/login")
            const response = await axios.post(BACKEND_URL + "/login", body, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            })
            if(response.status === 200){
                console.log("Logindaten erfolgreich verifiziert");
                localStorage.setItem("loggedIn", "true");
                localStorage.setItem("uid", response.data.id)
                return true
            } else {
                if(forwarding) window.location.href = "login.html";
                return false
            }
        } catch (error) {
            if(forwarding) window.location.href = "login.html";
            console.error("Login fehlgeschlagen:", error);
            return false
        }
    } else {
        if(forwarding) window.location.href = "login.html"
        return false
    }
}

// send login data to backend to check, if successful write credentials into localStorage
export async function login() {
    let username, password;
    document.getElementById("loginfailure").style.display = "none"

    if(document.getElementById("username").value && document.getElementById("password").value) {
        username = document.getElementById("username").value;
        password = document.getElementById("password").value;
    } else {
        username = localStorage.getItem("username");
        password = localStorage.getItem("password");

        if (!username || !password) {
            console.error("Keine Anmeldedaten verfügbar");
            return;
        }
    }

    const body = {
        username: username,
        password: password
    };

    try {
        const response = await axios.post(BACKEND_URL + "/login", body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if(response.status === 200){
            localStorage.setItem("username", username);
            localStorage.setItem("password", password);
            localStorage.setItem("uid", response.data.id)
            localStorage.setItem("token", response.data.token)
            console.log("Erfolgreich eingeloggt");
            window.location.href = "index.html";
        } else {
            document.getElementById("loginfailure").style.display = "block"
        }
    } catch (error) {
        document.getElementById("loginfailure").style.display = "block"
        console.error("Login fehlgeschlagen:", error);
    }
}

window.getUserdata = getUserdata;
window.saveUserdata = saveUserdata;
window.logout = logout;
window.register = register;
window.verify = verify;
window.login = login;
