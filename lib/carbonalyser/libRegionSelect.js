const regionSelectID = 'selectRegion';
const DEFAULT_REGION = 'default';
/**
 * Inject regions in the select region chooser.
 */
injectRegionIntoHTML = (regions, selectedRegion) => {
    const choice = document.getElementById(regionSelectID);
    for(const name in regions) {
      const opt = document.createElement("option");
      opt.value = name;
      const translated = translate("region" + capitalizeFirstLetter(name));
      opt.text = (translated === '') ? name : translated;
      choice.add(opt);
    }
    if( selectedRegion !== '' && selectedRegion !== null ) {
        choice.value = selectedRegion;
    }
}

attachHandlerToSelectRegion = () => {
    const selectRegion = document.getElementById(regionSelectID);
    selectRegion.addEventListener('change', selectRegionHandler);
    window.addEventListener('unload', () => {
        selectRegion.removeEventListener('change', selectRegionHandler);
    });
}

selectRegionHandler = async (event) => {
    const selectedRegion = lowerFirstLetter(event.target.value);
  
    if ('' === selectedRegion) {
      return;
    }
  
    await setSelectedRegion(selectedRegion);
}

/**
 * Set the selected region.
 */
getSelectedRegion = async () => {
    const selectedRegion = await getPref("analysis.selectedRegion");
    if ( selectedRegion == undefined ) {
        return DEFAULT_REGION;
    }
  
    return selectedRegion;
}

/**
 * Set in storage the region selected by user.
 */
setSelectedRegion = async (selectedRegion) => {
    await setPref("analysis.selectedRegion", selectedRegion);
}