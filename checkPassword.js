let made = 0;

window.PW.check = function (password) {
    if (!password || !password.length) {
        chrome.runtime.sendMessage({event: 'emptyPassword'});

        return false;
    }

    if (this.login || !this.hash) {
        return true;
    }

    if (this.hash === md5(password)) {
        this.login = true;

        //Удаляем страницу ввода пароля
        chrome.windows.remove(this.id);

        //Возвращаем вкладкам обратно их статус отображения
        for (let windowId in this.windowsHidden) {
            windowId = Math.round(windowId || 0);

            chrome.windows.update(windowId, {state: this.windowsHidden[windowId]})
        }

        this.windowsHidden = {};

        if (this.config.autoLock) {
            let timer = parseFloat(this.config.autoLockTime),
                lastState = 'active';

            if (timer) {
                if (timer < 15) {
                    timer = 15;
                }

                try {
                    chrome.idle.setDetectionInterval(timer);

                    chrome.idle.onStateChanged.addListener(function (e) {
                        if (e === 'idle' && lastState === 'active') {
                            chrome.windows.getAll({populate: false}, function (w) {
                                if (w.length !== 0) {
                                    PW.setHistory(1, chrome.i18n.getMessage('historyETBlock'), chrome.i18n.getMessage('historyEAAutoBlock'));

                                    chrome.runtime.reload();
                                }
                            })
                        }

                        lastState = e;
                    });
                } catch (e) {

                }
            }
        }

        this.setHistory(1, chrome.i18n.getMessage('historyETUnlock'), chrome.i18n.getMessage('historyEAAuth'));
    } else if (this.config.attempts) {
        made++;

        chrome.runtime.sendMessage({event: 'invalidPassword', count: this.config.attempts - made});

        /* if (typeof ga === 'function') {
            ga('send', 'event', 'Login', 'Fail', 'Attempts ' + (this.config.attempts - made) + '/' + this.config.attempts);
        } */

        if (made >= this.config.attempts) {
            const actions = [];

            if (this.config.attemptsActionClear) {
                chrome.history.deleteAll(function () {
                    actions.push(chrome.i18n.getMessage('historyEABrowserClear'))
                });
            }

            if (this.config.attemptsActionNew) {
                chrome.windows.create({
                    url: 'https://www.google.com',
                    focused: true,
                    incognito: true,
                    state: 'maximized'
                }, function () {
                    actions.push(chrome.i18n.getMessage('historyEANewPage'));
                });
            }

            if (this.config.attemptsActionClose) {
                actions.push(chrome.i18n.getMessage('historyEAClosed'));

                window.closedPage();
            }

            this.setHistory(2, chrome.i18n.getMessage('historyEAAttemptsLimit'), actions.join(', '));
        } else {
            this.setHistory(2, chrome.i18n.getMessage('historyETPassword') + ' (' + password + ')', chrome.i18n.getMessage('historyEAAuth'));

            if (typeof ga === 'function') {
                ga('send', 'event', 'Login', 'Fail', 'Invalid password');
            }
        }
    } else {
        chrome.runtime.sendMessage({event: 'emptyPassword'});

        this.setHistory(2, chrome.i18n.getMessage('historyETPassword') + ' (' + password + ')', chrome.i18n.getMessage('historyEAAuth'));

        if (typeof ga === 'function') {
            ga('send', 'event', 'Login', 'Fail', 'Not attempts');
        }
    }
};