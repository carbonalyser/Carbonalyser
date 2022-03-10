translate = (translationKey) => {
    return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
    target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
    target.href = chrome.i18n.getMessage(translationKey);
}

loadTranslations = () => {
    document.querySelectorAll('[translate]').forEach(function(element) {
        translateText(element, element.getAttribute('translate'));
    });
      
    document.querySelectorAll('[translate-href]').forEach(function(element) {
        translateHref(element, element.getAttribute('translate-href'));
    });
}

isChrome = () => {
    return (typeof(browser) === 'undefined');
};

// Firefox 1.0+ - detect Gecko engine
isFirefox = () => {
    return (typeof InstallTrigger !== 'undefined');
};

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

    let generateAttrs = {};
    for(const part of parts) {
        generateAttrs[part] = (o[part] === undefined);
        if ( generateAttrs[part] ) {
            o[part] = {};
        }
    }
    
	for(const k of Object.keys(o)) {
		if ( k != attachPoint && parts.indexOf(k) == NOT_FOUND ) {
			if (typeof(o[k]) == "object" && o[k] != null ) {
				createMVC(o[k]);
			}
		}
    } 
    for(const part of parts) {
        if ( generateAttrs[part] ) {
            for(const fname of fToAttach) {
                o[part][fname] = function () {
                    for(const k of Object.keys(this.parent)) {
                        if ( k != attachPoint && parts.indexOf(k) == NOT_FOUND ) {
                            if (typeof(this.parent[k]) == "object" 
                            && this.parent[k] != null 
                            && this.parent[k][part] != undefined ) {
                                this.parent[k][part][fname]();
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