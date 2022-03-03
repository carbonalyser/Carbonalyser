/**
 * Part responsible from carbon intensities updates.
 */

 const updateList = {
    unitedKingdom: {
        url: "https://api.carbonintensity.org.uk/intensity",
        extractor: function (text) {
            return JSON.parse(text).data[0].intensity.actual;
        }
    }
};

let intervalID = null;

/**
 * Insert the default carbon intensities.
 */
 insertDefaultCarbonIntensity = () => {
    setCarbonIntensityRegion('france', 34.8);    
    setCarbonIntensityRegion('europeanUnion', 276);
    setCarbonIntensityRegion('unitedStates', 493);
    setCarbonIntensityRegion('china', 681);
    setCarbonIntensityRegion('default', 519);
}

/**
 * This class fetch carbon intensity from the remote.
 */
 insertUpdatedCarbonIntensity = () => {
     console.warn("insertUpdatedCarbonIntensity=");
    for(const name in updateList) {
        const region = updateList[name];
        const xhr = new XMLHttpRequest();
        xhr.open("GET", region.url, false);
        xhr.send();
        const v = region.extractor(xhr.responseText);
        setCarbonIntensityRegion(name, v);
    }
    const parameters = getParameters();
    parameters.lastRefresh = Date.now();
    setParameters(parameters);
}

/**
 * Set carbon intensity for a given region with name.
 */
 setCarbonIntensityRegion = (name, carbonIntensity) => {
    if ( carbonIntensity < 0 ) {
        throw "carbonIntensity(" + carbonIntensity + ") cannot be negative";
    }
    const region = {carbonIntensity: carbonIntensity};
    setRegion(name, region);
}


/**
 * Init the script.
 */
 init = () => {
    insertDefaultCarbonIntensity();
    intervalID = setInterval(insertUpdatedCarbonIntensity, getRefreshInterval());
}

init();

chrome.runtime.onMessage.addListener(function(request){
    if (request.action == "restartCIUpdater") {
        clearInterval(intervalID);
        intervalID = setInterval(insertUpdatedCarbonIntensity, getRefreshInterval());
    }
});