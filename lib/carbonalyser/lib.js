
/**
 * This lib must be the first to be loaded by the analyzer...
 */
isChrome = () => {
    return (typeof(browser) === 'undefined' && typeof(chrome) !== 'undefined');
}

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
    return (typeof InstallTrigger !== 'undefined' && typeof(browser) !== 'undefined');
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

isInDebug = async () => {
    const res = await getPref("debug");
    if ( res === undefined ) {
        return false;
    } else {
        return res;
    }
}

printDebug = async (...args) => {
    const d = await isInDebug();
    if ( d ) {
        console.warn(args);
    }
}

translate = (translationKey) => {
    return obrowser.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = obrowser.i18n.getMessage(translationKey);
}

loadTranslations = () => {
    document.querySelectorAll('[translate]').forEach(function(element) {
        translateText(element, element.getAttribute('translate'));
    });
      
    document.querySelectorAll('[translate-href]').forEach(function(element) {
        translateHref(element, element.getAttribute('translate-href'));
    });
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
	if ( parent != null && parent != undefined ) {
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

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const obrowser = getBrowser();