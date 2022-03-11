const regionSelectID = 'selectRegion';

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
}

selectRegionHandler = (event) => {
    const selectedRegion = lowerFirstLetter(event.target.value);
  
    if ('' === selectedRegion) {
      return;
    }
  
    setSelectedRegion(selectedRegion);
}

/**
 * Set the selected region.
 */
 getSelectedRegion = () => {
    const selectedRegion = getPref("analysis.selectedRegion");
    if ( selectedRegion == null ) {
        return 'default';
    }
  
    return selectedRegion;
}

/**
 * Set in storage the region selected by user.
 */
 setSelectedRegion = (selectedRegion) => {
     console.warn("set region");
    setPref("analysis.selectedRegion", selectedRegion);
}