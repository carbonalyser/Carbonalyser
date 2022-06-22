const DEFAULT_REGION = 'default';

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