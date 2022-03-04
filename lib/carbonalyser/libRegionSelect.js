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
 * Get the region from the storage and set it in the global variable userLocation.
 */
 getSelectedRegion = () => {
    const params = getParameters();
    const selectedRegion = params.selectedRegion;
    if ( selectedRegion == null ) {
        return null;
    }
  
    userLocation = selectedRegion;
  
    return selectedRegion;
}

/**
 * Set in storage the region selected by user.
 */
 setSelectedRegion = (selectedRegion) => {
    const p = getParameters();
    p.selectedRegion = selectedRegion;
    userLocation = selectedRegion;
    setParameters(p);
}