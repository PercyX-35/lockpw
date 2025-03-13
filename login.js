const w = window.chrome.extension.getBackgroundPage();

chrome.runtime.onMessage.addListener(function (e) {
    if (e.event === 'emptyPassword' || e.event === 'invalidPassword') {
        document.getElementById('password').value = '';
        document.getElementById('password').className = 'wrong';

        setTimeout(function () {
            document.getElementById('password').className = ''
        }, 1e3);
    }

    if (e.event === 'invalidPassword') {
        document.getElementById('att').innerText = e.count + '/' + w.PW.config.attempts;
    }
});

window.addEventListener('blur', function () {
    if (w.PW.login) {
        return;
    }

    w.minimizationPage();

    if (w.PW.config.securityMode) {
        window.close();
    } else {
        chrome.windows.update(w.PW.id, {focused: true});
    }
});

window.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

window.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded');

    document.title = chrome.i18n.getMessage('loginPageTitle');
    document.getElementById('login').innerText = chrome.i18n.getMessage('loginPageButtonOk');

    if (localStorage.getItem('pw_h')) {
        document.getElementById('help').onclick = function (e) {
            e.preventDefault();

            document.getElementById('hint').innerHTML = '<b>' + chrome.i18n.getMessage('loginPageHintTitle') + '</b>: <br>' + localStorage.getItem('pw_h');
            document.getElementById('help_view').style.display = 'inline';

            document.getElementById('close').onclick = function (e) {
                e.preventDefault();

                document.getElementById('help_view').style.display = 'none';
            };
        };
    } else {
        document.getElementById('help').style.display = 'none';
        document.getElementById('password').style.width = '190px';
    }

    document.getElementsByClassName('login')[0].onsubmit = function (e) {
        e.preventDefault();

        chrome.runtime.sendMessage({event: 'password', value: document.getElementById('password').value});
    };
});