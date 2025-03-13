if (!localStorage.getItem('uid')) {
    localStorage.setItem('uid', new Date().valueOf() + '_' + chrome.i18n.getUILanguage());
}

try {
    const version = chrome.app.getDetails().version;

    function removeOrigin (url) {
        let linkObject;

        if (arguments.length && url) {
            try {
                linkObject = document.createElement('a');
                linkObject.href = url;
            } catch (e) {
                console.error("jerror: could not create link object: " + e);
            }
        } else {
            linkObject = location;
        }

        if (linkObject) {
            return linkObject.pathname + '?v=' + version;
        } else {
            return url + '?v=' + version;
        }
    }

    (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * new Date();
        a = s.createElement(o),
            m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m);
    })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

    ga('create', 'UA-406632866-6', 'auto');
    ga('set', 'userId', localStorage.getItem('uid') || 0);
    ga('set', 'checkProtocolTask', null);

    ga('require', 'displayfeatures');
    ga('send', 'pageview', removeOrigin());

    ga('send', 'event', 'Version', version);

    setInterval(function () {
        ga('send', 'pageview', removeOrigin());
    }, 60 * 1000 * 1.9);

} catch (e) {
    console.log('load analytics error', e);

    function ga () {

    }
}
