console.time('START');

// Używamy globalnego obiektu dla service workera
const PW = {
    id: 0, //ID okna z wwodem hasła
    login: false, //Wprowadzono hasło
    focus: false, //Aktywne wprowadzanie hasła
    hash: null, //Aktualne hasło w zaszyfrowanej formie
    config: {
        minimize: true, //czy ukrywać okna do wprowadzenia hasła
        securityMode: true, //zamknięcie przeglądarki przy utracie focusu hasła
        fullScreen: true, // otwieranie okna wprowadzania hasła na pełny ekran
        quickClick: true, // skróty klawiszowe
        autoLock: false, // automatyczna blokada po {min}
        autoLockTime: 15, // automatyczna blokada po {min}
        attempts: 3, //Liczba prób wprowadzenia hasła,
        attemptsActionClear: false, // Czyszczenie historii przeglądarki po {count} nieudanych próbach
        attemptsActionNew: true, // Otwieranie nowej strony w trybie incognito po {count} nieudanych próbach
        attemptsActionClose: true, // Zamykanie okien przeglądarki przy błędnym haśle
        historyRecord: true //Rejestrowanie historii działań
    },
    windowsHidden: {} //Stan okien przed wprowadzeniem hasła
};

// Funkcja ustawiania historii
PW.setHistory = function (typeID, message, actions) {
    if (!PW.config.historyRecord) {
        return false;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get(['histories'], (result) => {
            const allHistories = result.histories || [];
            const date = new Date();

            if (allHistories.length >= 20) {
                allHistories.pop();
            }

            allHistories.unshift({
                date: date.toDateString() + ', ' + date.toLocaleTimeString(),
                typeID: typeID,
                message: message,
                actions: actions
            });

            chrome.storage.local.set({ histories: allHistories }, () => {
                resolve(true);
            });
        });
    });
};

/**
 * Ukrywanie aktywnych okien
 * @returns {boolean}
 */
function minimizationPage() {
    if (!PW.config.minimize) {
        return false;
    }

    console.log(PW, 'minimizationPage');

    chrome.windows.getAll({populate: false}, function (w) {
        for (let t in w) {
            if (!w[t].incognito && w[t].id !== PW.id) {
                if (!PW.windowsHidden[w[t].id]) {
                    PW.windowsHidden[w[t].id] = w[t].state;
                }

                chrome.windows.update(w[t].id, {state: 'minimized'});
            }
        }
    });
}

function closedPage(all = false) {
    console.log(PW, all, 'closedPage');

    chrome.windows.getAll({populate: false}, function (w) {
        for (let t in w) {
            if (all || !w[t].incognito) {
                chrome.windows.remove(w[t].id);
            }
        }
    });
}

// W service workerze używamy importScripts() zamiast loadScript()
function importMd5Script() {
    return new Promise((resolve) => {
        try {
            // W Manifest V3 używamy importScripts dla ładowania zewnętrznych skryptów
            importScripts(chrome.runtime.getURL('scripts/md5.js'));
            resolve(true);
        } catch (error) {
            console.error('Error importing md5.js:', error);
            resolve(false);
        }
    });
}

const initialize = function () {
    console.time('initialize');

    if (PW.login) {
        return;
    }

    PW.id = 0;
    PW.login = false;
    PW.focus = false;

    PW.windowsHidden = {};

    chrome.windows.getLastFocused(null, function (win) {
        const createData = {
            url: 'lockpw.html',
            type: 'popup',
            focused: true
        };

        if (!win) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            }

            win = {
                width: 1024, // Domyślne wartości, nie możemy użyć screen.width
                height: 768
            };
        }

        if (PW.config.fullScreen) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            }

            createData.state = 'fullscreen';
        } else {
            createData.width = 344;
            createData.height = 100;

            createData.left = Math.round((win.width / 2) - (createData.width / 2));
            createData.top = Math.round((win.height / 2) - (createData.height / 2));
        }

        chrome.windows.create(createData, function (w) {
            PW.id = w.id;
            PW.focus = w.focused;

            console.timeEnd('initialize');
        });
    });

    minimizationPage();
};

// Sprawdzanie hasła - musimy przepisać tę funkcję w kontekście service workera
PW.check = async function(password) {
    // Importujemy skrypt md5 jeśli potrzebny
    if (typeof md5 !== 'function') {
        await importMd5Script();
    }

    // Implementacja sprawdzania hasła
    const hash = md5(password);
    if (hash === PW.hash) {
        PW.login = true;
        PW.id = 0;

        // Przywracanie zminimalizowanych okien
        for (let id in PW.windowsHidden) {
            chrome.windows.update(parseInt(id), {state: PW.windowsHidden[id] || 'normal'});
        }

        // Zapisanie zdarzenia logowania
        PW.setHistory(1, chrome.i18n.getMessage('historyETAuth'), chrome.i18n.getMessage('historyEASuccess'));

        return true;
    } else {
        // Obsługa nieprawidłowego hasła
        // Tu implementacja odpowiednich akcji
        return false;
    }
};

// Nasłuchiwanie zmiany focusu okna
chrome.windows.onFocusChanged.addListener(function (windowId) {
    if (!PW.id || PW.login || !PW.hash) {
        return;
    }

    if (windowId !== PW.id) {
        console.log(PW, windowId, 'windows.onFocusChanged');

        if (PW.id > 0) {
            chrome.windows.update(PW.id, {focused: true}, function (w) {
                if (!w && chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                }
            });
        }

        if (PW.config.securityMode) {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                PW.id = 0;
                PW.login = false;

                closedPage(true);

                PW.setHistory(2, chrome.i18n.getMessage('historyETAuth'), chrome.i18n.getMessage('historyEAFocus'));
            } else {
                chrome.windows.get(PW.id, function (w) {
                    if (!w || !w.focused) {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError.message);
                        }

                        PW.id = 0;
                        PW.login = false;

                        closedPage(true);

                        PW.setHistory(2, chrome.i18n.getMessage('historyETAuth'), chrome.i18n.getMessage('historyEAFocus'));
                    }
                });
            }
        }
    }

    minimizationPage();
});

chrome.windows.onRemoved.addListener(function (windowId) {
    console.log('onRemoved', windowId, PW);

    if (windowId !== chrome.windows.WINDOW_ID_NONE && windowId !== PW.id) {
        PW.id = 0;

        chrome.windows.getAll(function (windows) {
            if (!windows.length) {
                PW.login = false;
            }
        });
    }
});

chrome.tabs.onActivated.addListener(function (tabInfo) {
    if (PW.hash && !PW.id && !PW.login) {
        console.log(PW, tabInfo, 'tabs.onActivated');

        chrome.windows.get(tabInfo.windowId, function (w) {
            if (!w) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                }
                return;
            }

            if (!w.incognito && w.id !== PW.id) {
                initialize();
            }
        });
    }
});

// Nasłuchiwanie wiadomości
chrome.runtime.onMessage.addListener(function (e, sender, sendResponse) {
    if (e.event === 'password') {
        PW.check(e.value)
            .then(result => {
                sendResponse({success: result});
            });

        // Zwrócenie true oznacza, że będziemy używać sendResponse asynchronicznie
        return true;
    }
});

// Tworzenie menu kontekstowego
function setupContextMenu() {
    chrome.contextMenus.removeAll(function () {
        chrome.contextMenus.create({
            title: chrome.i18n.getMessage('contextMenuLock'),
            contexts: ['page'],
            id: 'lock-browser'
        });
    });
}

// Obsługa kliknięcia w menu kontekstowe
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'lock-browser') {
        // Sprawdzenie, czy hasło jest ustawione
        chrome.storage.local.get(['pw'], function(result) {
            if (result.pw) {
                PW.setHistory(1, chrome.i18n.getMessage('historyETBlock'), chrome.i18n.getMessage('history_a_contextMenu'));

                // Resetujemy stan
                PW.login = false;
                initialize();
            } else {
                chrome.tabs.create({url: 'index.html#settings'});
            }
        });
    }
});

// Obsługa skrótów klawiszowych
chrome.commands.onCommand.addListener(function (command) {
    if (!PW.config.quickClick) {
        return;
    }

    if (command === 'lockON') {
        PW.setHistory(1, chrome.i18n.getMessage('historyETBlock'), chrome.i18n.getMessage('historyEAHotkeys'));

        // Resetujemy stan zamiast przeładowywania rozszerzenia
        PW.login = false;
        initialize();
    }
});

// Nasłuchiwanie zmian w storage
chrome.storage.onChanged.addListener(function (data) {
    for (let i in data) {
        PW.config[i] = data[i].newValue;
    }
});

// Inicjalizacja
async function init() {
    console.time('get config');

    // Pobieramy dane z storage
    const data = await new Promise(resolve => {
        chrome.storage.local.get(null, result => resolve(result));
    });

    // Pobieranie hasła
    PW.hash = data.pw || null;

    if (data) {
        console.log(data, 'config');

        // Sprawdzanie wersji
        const manifestData = chrome.runtime.getManifest();
        const currentVersion = manifestData.version;
        const savedVersion = data.version;

        if (currentVersion !== savedVersion) {
            // Aktualizacja wersji
            chrome.storage.local.set({version: currentVersion});

            // Aktualizacja konfiguracji
            for (let i in data) {
                if (i === 'security_mode') {
                    PW.config.securityMode = data[i] === true || data[i] === "true";
                } else if (i === 'minimize') {
                    PW.config.minimize = data[i] === true || data[i] === "true";
                } else if (i === 'history_active') {
                    PW.config.historyRecord = data[i] === true || data[i] === "true";
                } else if (i === 'quick_click') {
                    PW.config.quickClick = data[i] === true || data[i] === "true";
                } else if (i === 'attempts_act_close') {
                    PW.config.attemptsActionClose = data[i] === true || data[i] === "true";
                } else if (i === 'attempts_act_clear') {
                    PW.config.attemptsActionClear = data[i] === true || data[i] === "true";
                } else if (i === 'attempts_act_new') {
                    PW.config.attemptsActionNew = data[i] === true || data[i] === "true";
                }
            }

            PW.config.autoLock = false;
            PW.config.autoLockTime = 0;

            chrome.storage.local.set(PW.config);
        } else {
            // Zastosowanie istniejącej konfiguracji
            for (let i in data) {
                PW.config[i] = data[i];
            }
        }
    }

    console.timeEnd('get config');

    // Ustawienie menu kontekstowego
    setupContextMenu();

    // Sprawdzenie, czy hasło jest ustawione
    if (PW.hash && PW.hash.length > 10) {
        initialize();
    } else if (!data.installed) {
        PW.config.installed = true;
        chrome.storage.local.set({installed: true});
        chrome.tabs.create({url: 'app.html'});
    }
}

// Wywołanie inicjalizacji
init();

// Obsługa instalacji rozszerzenia
chrome.runtime.onInstalled.addListener(function (details) {
    setupContextMenu();
    console.log('Extension installed:', details.reason);
});

console.timeEnd('START');
