class SendingData {
    constructor(site_id)    {
        this.site_id = site_id;
    }
    
    _getLocalStorageItems() {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cro_')) {
                items[key] = localStorage.getItem(key);
            }
        }
        return items;
    }

    init() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') {
                const items = this._getLocalStorageItems();
                //dataLayer.push(items);
                items['cro_site_id'] = this.site_id;
                console.log(items);
            }
        });
    }
}

class ActivityCounter {
    constructor() {
        this.counts = {
            cro_scroll: 0,
            cro_click: 0,
            cro_auxclick: 0,
            cro_keydown: 0,
            cro_mousemove: 0
        };
    }

    incrementCount(type) {
        this.counts[type]++;
        localStorage.setItem(type, this.counts[type]);
        //console.log(`${type} count: ${this.counts[type]}`);
    }

    init() {
        window.addEventListener('scroll', () => this.incrementCount('cro_scroll'));
        window.addEventListener('click', () => this.incrementCount('cro_click'));
        window.addEventListener('auxclick', () => this.incrementCount('cro_auxclick'));
        window.addEventListener('keydown', () => this.incrementCount('cro_keydown'));
        window.addEventListener('mousemove', () => this.incrementCount('cro_mousemove'));
    }
}

class MaxScroll {
    constructor() {
        // Подписываемся на событие прокрутки
        document.addEventListener('scroll', () => this._saveMaxScroll());
    }

    _saveMaxScroll() {
        var maxScroll = localStorage.getItem('cro_max_scroll');
        if (!maxScroll) {
            localStorage.setItem('cro_max_scroll', window.screen.height);
        } else {
            var currentScroll = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
            if (currentScroll > maxScroll) {
                localStorage.setItem('cro_max_scroll', currentScroll);
            }
        }
    }

}

class PathToClick {   

    handleClick(event) {
        var target = event.target;
        if (target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button') {
            var xpath = this.getElementXPath(target);
            var xpathList = JSON.parse(localStorage.getItem('cro_click_xpath')) || [];
            xpathList.push(xpath);
            localStorage.setItem('cro_click_xpath', JSON.stringify(xpathList));
            console.log(xpathList);
        }
    }

    getElementXPath(element) {
        if (element && element.id !== '') {
            return 'id("' + element.id + '")';
        }
        return this.getElementTreeXPath(element);
    }

    getElementTreeXPath(element) {
        var paths = [];
        for (; element && element.nodeType == 1; element = element.parentNode) {
            var index = 0;
            for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType == 1 && sibling.tagName == element.tagName) {
                    index++;
                }
            }
            var tagName = element.tagName.toLowerCase();
            var pathIndex = (index ? "[" + (index+1) + "]" : "");
            paths.splice(0, 0, tagName + pathIndex);
        }
        return paths.length ? "/" + paths.join("/") : null;
    }

    init() {
        document.addEventListener('click', (event) => this.handleClick(event));
        document.addEventListener('auxclick', (event) => {
            if (event.button === 1) { // 1 corresponds to the wheel button
                this.handleClick(event);
            }
        });
    }
}


class CROSetActiveData {
    constructor() {
        const path_counter = new PathToClick();
        const maxScroll = new MaxScroll();
        const activ_counter = new ActivityCounter();
        path_counter.init();
        activ_counter.init();
    }
}

class CROSetDefaultValues {

    /**
     * 
     * @returns number - возвращает ID счетчика CRO
     */
    _setCroSessionId() {
    let sessionId = localStorage.getItem('cro_session_id');
    if (!sessionId) {
      sessionId = Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('cro_session_id', sessionId);
    }
  }

    /**
     * 
     * @returns {Object} - объект с данными об ID GA-4
     */
    _setGA4SessionId() {
    // Use your own ID here ↓
    let sessionId = localStorage.getItem('cro_session_id');
    if (!sessionId) {
        var pattern = /_ga_S04BPTJ888=GS\d\.\d\.(.+?)(?:;|$)/;
        var match = document.cookie.match(pattern);
        var parts = match[1].split(".");  
        localStorage.setItem('cro_ga_session_id', parts.shift() );   
    } 
  }

  /**
   * Определяем источник трафика по URL-параметрам и HTTP-заголовку referrer
   * @returns {Object} - объект с данными о текущем URL-адресе
   */
    _setTrafficSource() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    const paidParams = ['utm_source','utm_medium','utm_campaign', 'yclid', 'gclid'];
    const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com']; // добавьте другие домены соцсетей по мере необходимости
    let source = 'other';
    let params = {};

    for (let param of paidParams) {
        if (urlParams.has(param)) {
            source = 'paid';
            params[param] = urlParams.get(param);
        }
    }

    if (source === 'other' && referrer) {
        try {
            const referrerUrl = new URL(referrer);
            const referrerHostname = referrerUrl.hostname;
            const currentHostname = window.location.hostname;

            if (referrerHostname.includes('google') || referrerHostname.includes('yandex') || referrerHostname.includes('bing')) {
                source = 'organic';
            } else if (referrerHostname === currentHostname) {
                source = 'internal';
            } else if (socialDomains.some(domain => referrerHostname.includes(domain))) {
                source = 'social';
            }
        } catch (e) {
            console.error('Invalid referrer URL');
        }
    }

    // Сохраняем источник и параметры в localStorage
    localStorage.setItem('cro_source', source);
    localStorage.setItem('cro_url_params', JSON.stringify(params));

    return { source, params };
}

    /**
     * Определяем UserAgent
     * @returns {Object} - объект с данными о UserAgent
     */

    _setUserAgent(){   
    localStorage.setItem('cro_user_agent', window.navigator.userAgent);  
  }

    _setDefoultMaxScroll() {
        localStorage.setItem('cro_max_scroll', 0);
    }

    _setDefoultActivCounters() {
        localStorage.setItem('cro_scroll', 0);
        localStorage.setItem('cro_click', 0);
        localStorage.setItem('cro_auxclick', 0);
        localStorage.setItem('cro_keydown', 0);
        localStorage.setItem('cro_mousemove', 0);
    }
  
    /**
     * Сохраняем максимальную длинну скролла в localStorage
     */

    /** Получаем максимальную длинну скролла
     *  @returns {Object} - объект с максимальной длинной скролла
     */
    _getMaxScroll() {
        var maxScroll = localStorage.getItem('cro_max_scroll');
        if (!maxScroll) {
            maxScroll = 0;
            localStorage.setItem('cro_max_scroll', maxScroll);
        }
        return {max_scroll: maxScroll}
    }   
    
    /**
     * Сохраняем текущий URL в localStorage
     */
    _savePrevUrl() {
        localStorage.setItem('cro_prev_url', window.location.href);
    }

    /**
     * 
     * @returns {Object} - объект с данными о текущем экране
     */
    _getScreenSize() {
        return {
            height: window.screen.height,
            width: window.screen.width
        };
    } 

    init() {
        // 1.1. Установка session id
        this._setCroSessionId();
        // 1.2. Чтение GA4 Session Id
        this._setGA4SessionId();
        // 1.3. Определение источника трафика
        this._setTrafficSource();
        // 1.4. Определение UserAgent        
        this._setUserAgent();
        // 1.5. Сохранение текушего URL-адреса в cro_prev_url
        this._savePrevUrl();
        // 1.6. Установка cro_vax_croll в 0
        this._setDefoultMaxScroll();
        // 1.7. Установка cro_scroll, cro_click, cro_auxclick, cro_keydown, cro_mousemove в 0
        this._setDefoultActivCounters();        
    }

}
