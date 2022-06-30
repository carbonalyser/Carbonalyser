getDatatableTranslation = () => {
    return "/lib/datatables/translations/" + (obrowser.i18n.getMessage("general_datatables_locale")) + ".json";
}

/**
 * This lib must be the first to be loaded by the analyzer...
 */
isChrome = () => {
    return (typeof(browser) === 'undefined' && typeof(chrome) !== 'undefined');
}

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
    return (typeof(browser) !== 'undefined');
}

/**
 * get the browser object in a compatible way.
 */
getBrowser = () => {
    if ( isChrome() ) {
        return chrome;
    } else if ( isFirefox() ) {
        return browser;
    } else {
        throw "browser not supported";
    }
}

/**
 * Emulate firefox behaviour under chrome.
 */
emulateFirefox = () => {
    if ( isChrome() ) {
        obrowser.storage.local.____get = obrowser.storage.local.get;
        obrowser.storage.local.get = async function(key) {
            return new Promise((resolve, reject) => {
                try {
                    obrowser.storage.local.____get(key, function(value) {
                        resolve(value);
                    });
                } catch (ex) {
                    reject(ex);
                }
            });
        };
        obrowser.storage.local.____set = obrowser.storage.local.set;
        obrowser.storage.local.set = async function(obj) {
            return new Promise((resolve, reject) => {
                try {
                    obrowser.storage.local.____set(obj, function() {
                        resolve();
                    });
                } catch (ex) {
                    reject(ex);
                }
            });
        };
    }
}

const obrowser = getBrowser();
emulateFirefox();
isInDebug = async () => {
    return await getPref("debug");
}

let blackList = [];
let whitelist = [/.*trafficAnalyzer.*/];
printDebugOrigin = async (msg) => {
    if ( !(await isInDebug()) ) {
        return;
    }
    let accepted = true;
    let value = false;
    for(const filter of [blackList, whitelist]) {
        for(const w of filter) {
            if ( w instanceof RegExp ) {
                if ( w.test(msg) ) {
                    accepted = value;
                    break;
                }
            } else if ( w instanceof String ) {
                if ( msg.indexOf(w) !== -1 ) {
                    accepted = value;
                    break;
                }
            } else {
                throw "Invalid filter : " + w;
            }
        }
        value = !(value);
    }
    if ( accepted ) {
        console.debug(msg);
    }
}
printDebug = printDebugOrigin;

translate = (translationKey) => {
    const res = obrowser.i18n.getMessage(translationKey);
    if ( res === null || res === undefined ) {
        console.error(translationKey);
    } else {
        return res;
    }
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = obrowser.i18n.getMessage(translationKey);
}

loadTranslations = () => {
    for (const entry of document.querySelectorAll('[translate]').entries()) {
        const element = entry[1];
        translateText(element, element.getAttribute('translate'));
    }
    for (const entry of document.querySelectorAll('[translate-href]').entries()) {
        const element = entry[1];
        translateHref(element, element.getAttribute('translate-href'));
    }
}

extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

/**
 * Add possibility to access a parent object from anty object.
 * @param {*} o 
 */
attachParent = (o) => {
	attachParentRecurse(null, o);
}

const attachPoint = "parent";

attachParentRecurse = (parent, o) => {
  if ( "object" != typeof(o) || o == null ) {
      return ;
  }
	if ( parent != null && parent != undefined && o[attachPoint] === undefined ) {
		o[attachPoint] = parent;
	}
  for(const k of Object.keys(o)) {
    if ( k != attachPoint ) {
      attachParentRecurse(o, o[k]);
    }
  }
}

/**
 * Generate MVC from object.
 */
createMVC = (o) => {

    const parts = ["model", "view"];
    const fToAttach = ["init", "update"];
    const NOT_FOUND = -1;
    
	for(const k of Object.keys(o)) {
		if ( k != attachPoint && parts.indexOf(k) == NOT_FOUND ) {
			if (typeof(o[k]) == "object" && o[k] != null ) {
				createMVC(o[k]);
			}
		}
    } 
    for(const part of parts) {
        if ( o[part] === undefined ) {
            o[part] = {};
        }
        for(const fname of fToAttach) {
            if ( o[part][fname] === undefined ) {
                o[part][fname] = async function () {
                    for(const k of Object.keys(this.parent)) {
                        if ( k != attachPoint && parts.indexOf(k) == NOT_FOUND ) {
                            if (typeof(this.parent[k]) == "object" 
                            && this.parent[k] != null 
                            && this.parent[k][part] != undefined ) {
                                await this.parent[k][part][fname]();
                            }
                        }
                    }
                }
            }
        }
    }
}

storageSetAnalysisState = async (state) => {
    if ( typeof(state) != typeof(0) ) {
        throw "type error";
    } else {
        if (state === 0 || state === 1) {
            await obrowser.storage.local.set({analysisRunning: state});
        } else {
            throw "error";
        }
    }
}
storageGetAnalysisState = async () => {
    return (await obrowser.storage.local.get('analysisRunning')).analysisRunning;
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

L_init = () => {

}

L_end = () => {

}

window.addEventListener("load", L_init);
window.addEventListener("unload", L_end);
