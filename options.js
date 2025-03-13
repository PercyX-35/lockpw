if (typeof localStorage === 'undefined') {
    alert('Your browser does not support HTML5 localStorage. Try upgrading.');
}

function i18n (e, t) {
    const message = chrome.i18n.getMessage(t || e),
        el = document.getElementById(e);

    if (!el) {
        return;
    }

    let type = el ? el.type : null;

    if (type === 'submit') {
        el.value = message;
    } else if (type === 'password' || type === 'text' || type === 'number') {
        el.setAttribute("placeholder", message);
    } else {
        el.innerHTML = message;
    }
}

if (!window.PW) {
    window.PW = {
        config: {}
    }
}

window.PW.page = {
    tab: 'settings',
    init: function () {
        i18n('i18n_settings', '');
        i18n('i18n_settings_additional', '');

        const pageEl = document.getElementById('page_' + this.tab);

        this.generateHeader(this.tab);

        chrome.storage.local.get(function (data) {
            if (data) {
                for (let i in data) {
                    window.PW.config[i] = data[i];
                }

                if (window.PW.page.tab === 'settings') {
                    window.PW.options.init();
                } else if (window.PW.page.tab === 'help') {
                    window.PW.pageHelp();
                } else if (window.PW.page.tab === 'history') {
                    window.PW.pageHistory();
                }

                if (pageEl) {
                    pageEl.style.display = 'block';
                }
            }
        });
    },
    generateHeader: function () {
        const links = document.getElementsByClassName('nav-link');

        Array.from(links).forEach(function (element) {
            const divEl = element.querySelector('div');

            if (divEl.classList.contains('active')) {
                divEl.classList.remove('active');
            }

            document.getElementById('page_' + divEl.dataset.id).style.display = 'none';

            if (divEl.dataset.id === window.PW.page.tab) {
                divEl.classList.add('active');
            }

            element.onclick = function (el) {
                window.PW.page.tab = el.target.dataset.id;
                window.PW.page.init();
            }
        })
    }
};

window.PW.pageHelp = function () {
    document.title = chrome.i18n.getMessage('helpPageTitle');

    i18n('i18n_help', 'helpPageHeaderTitle');

    i18n('i18n_installed_1_t', 'helpPageStep1Title');
    i18n('i18n_installed_1_s1', 'helpPageStep1Description1');
    i18n('i18n_installed_1_s2', 'helpPageStep1Description2');

    i18n('i18n_installed_2_t', 'helpPageStep2Title');
    i18n('i18n_installed_2_s1', 'helpPageStep2Description1');
    i18n('i18n_installed_2_s2', 'helpPageStep2Description2');

    i18n('i18n_next', 'helpPageButtonNext');
};

window.PW.pageHistory = function () {
    document.title = chrome.i18n.getMessage('historyPageTitle');

    i18n('i18n_history', 'historyPageHeaderTitle');

    let all = localStorage.getItem('histories') || '[]', tbody = '';

    all = JSON.parse(all);

    for (let i in all) {
        tbody += '<tr>';
        tbody += '<td>' + all[i].date + '</td>';
        tbody += '<td>' + all[i].message + '</td>';
        tbody += '<td>' + all[i].actions + '</td>';
        tbody += '</tr>';
    }

    document.querySelectorAll('table > tbody')[0].innerHTML = tbody;
};

window.PW.options = {
    init: function () {
        ga('send', 'event', 'Options', 'Run');

        this.lang();

        this.checkLockStatus();
        this.initCheckboxStatus();

        this.event();

        document.getElementById('checkbox_attempts_act_clear').onclick = function (ev) {
            let checked = this.checked;

            chrome.permissions.request({
                permissions: ['history']
            }, function (granted) {
                if (!granted && checked) {
                    checked = false;
                }

                window.PW.config.attemptsActionClear = checked;

                chrome.storage.local.set(window.PW.config);

                ga('send', 'event', 'Options', 'History clear enabled');
            });
        };
    },
    initCheckboxStatus: function () {
        document.getElementById('checkbox_auto_lock').checked = window.PW.config.autoLock;
        document.getElementById('checkbox_minimize').checked = window.PW.config.minimize;
        document.getElementById('checkbox_security_mode').checked = window.PW.config.securityMode;
        document.getElementById('checkbox_fullScreen').checked = window.PW.config.fullScreen;
    },
    checkLockStatus: function () {
        const enablePassword = localStorage.hasOwnProperty('pw');

        i18n('status_lock', 'optionsPageInputPasswordStatus' + (enablePassword ? 'On' : 'Off'));
        i18n('i18n_security_mode_info', 'optionsPageCheckboxSecurityMode' + (window.PW.config.securityMode ? 'On' : 'Off'));

        document.getElementById('password_off').style.display = enablePassword ? 'inline' : 'none';

        document.getElementById('auto_lock').style.display = window.PW.config.autoLock ? 'inline' : 'none';
        document.getElementById('auto_lock_time').value = window.PW.config.autoLockTime || 0;

        document.getElementById('attempts').value = window.PW.config.attempts || 0;
    },
    lang: function () {
        document.title = chrome.i18n.getMessage('optionsPageTitle');

        i18n('i18n_settings', 'optionsPageHeaderTitle');
        i18n('i18n_settings_additional', 'optionsPageAdditionalSettings');

        i18n('password', 'optionsPageInputPasswordPlaceholder');
        i18n('password_confirm', 'optionsPageInputPasswordConfirmPlaceholder');
        i18n('password_help', 'optionsPageInputPasswordHelpPlaceholder');
        i18n('save_password', 'optionsPageInputPasswordButtonSave');

        i18n('i18n_minimize_info', 'optionsPageCheckboxMinimizeTitle');
        i18n('i18n_checkbox_minimize', 'optionsPageCheckboxMinimize');

        i18n('i18n_attempts', 'optionsPageInputAttemptsLimitPlaceholder');

        i18n('i18n_attempts_act', 'optionsPageCheckboxAttemptsLabel');
        i18n('i18n_attempts_act_close', 'optionsPageCheckboxAttemptsClose');
        i18n('i18n_attempts_act_clear', 'optionsPageCheckboxAttemptsClearHistory');
        i18n('i18n_attempts_act_new', 'optionsPageCheckboxAttemptsNew');

        i18n('i18n_security_mode', 'optionsPageCheckboxSecurityMode');

        i18n('i18n_auto_lock', 'optionsPageCheckboxAutoLock');
        i18n('i18n_auto_lock_time', 'optionsPageInputAutoLockCheckbox');
        i18n('i18n_auto_lock_info', 'optionsPageCheckboxAutoLockLabel');

        i18n('i18n_checkbox_quick_click', 'optionsPageCheckboxQuick');
        i18n('i18n_checkbox_quick_click_info', 'optionsPageCheckboxQuickLabel');

        i18n('i18n_checkbox_history', 'optionsPageCheckboxLogging');
        i18n('i18n_checkbox_history_info', 'optionsPageCheckboxLoggingLabel');

        i18n('i18n_checkbox_fullScreen', 'optionsPageCheckboxFullScreen');
        i18n('i18n_checkbox_fullScreen_info', 'optionsPageCheckboxFullScreenLabel');
    },
    alert: function (message, type) {
        const el = document.getElementsByClassName('alert')[0];

        message = chrome.i18n.getMessage(message);

        el.className = 'alert ' + (type || 'success');
        document.getElementsByClassName('alert')[0].innerHTML = message;

        return false;
    },
    event: function () {
        document.getElementById('save_password').onclick = function (e) {
            e.preventDefault();

            let password = document.getElementById('password').value,
                help = document.getElementById('password_help').value;

            if (password.length < 1 || password !== document.getElementById('password_confirm').value) {
                return window.PW.options.alert('not_match', 'danger');
            }

            localStorage.setItem('pw', md5(password));
            localStorage.setItem('pw_h', help);

            window.PW.options.alert('optionsPageInputPasswordStatusOn');

            window.PW.options.checkLockStatus();

            ga('send', 'event', 'Options', 'Save password');
        };

        document.getElementById('password_off').onclick = function (e) {
            e.preventDefault();

            localStorage.removeItem('pw');
            localStorage.removeItem('pw_h');

            window.PW.options.alert('optionsPageInputPasswordStatusOff', 'danger');

            window.PW.options.checkLockStatus();

            ga('send', 'event', 'Options', 'Password clear');
        };

        document.getElementById('auto_lock_time').onkeyup = function (e) {
            ga('send', 'event', 'Options', this.name + ' value: ' + this.value);

            window.PW.config.autoLockTime = this.value;

            chrome.storage.local.set(window.PW.config);
        };

        document.getElementById('attempts').onkeyup = function (e) {
            ga('send', 'event', 'Options', this.name + ' value: ' + this.value);

            window.PW.config.attempts = this.value;

            chrome.storage.local.set(window.PW.config);
        };

        const checkboxs = document.querySelectorAll('.checkbox');

        for (let i in checkboxs) {
            let el = document.getElementsByName(checkboxs[i].name);

            if (el.length) {
                el[0].checked = window.PW.config[el[0].name] || false;
                el[0].onclick = function (e) {
                    ga('send', 'event', 'Options', this.name + ' checked: ' + this.checked);

                    window.PW.config[this.name] = this.checked;

                    chrome.storage.local.set(window.PW.config);

                    PW.options.checkLockStatus();
                }
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', function () {
    window.PW.page.tab = window.location.hash.replace('#', '') || 'settings';
    window.PW.page.init();
});