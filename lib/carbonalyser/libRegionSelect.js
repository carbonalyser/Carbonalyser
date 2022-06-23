const DEFAULT_REGION = 'regionDefault';

/**
 * Coordinates (longitude, latitude) -> ISO country code.
 * @return null if not found
 */
coord_to_ISO_A3 = (point) => {
    for(const countryObject of countriesObject.features) {
        if ( d3.geoContains(countryObject, point) ) {
            if ( countryObject === undefined || countryObject.properties === undefined || countryObject.properties.ISO_A3 === undefined ) {
                throw "Error in definition";
            }
            return countryObject.properties.ISO_A3;
        }
    }
    return null;
}

/**
 * @param ISO_A3 requested country to find.
 * @return associated geo object.
 */
ISO_A3_to_geo_object = (ISO_A3) => {
    for(const countryObject of countriesObject.features) {
        if ( countryObject.properties.ISO_A3 === ISO_A3 ) {
            return countryObject;
        }
    }
    return null;
}

/**
 * Set the selected region.
 */
getSelectedRegion = async () => {
    const selectedRegion = await getPref("analysis.selectedRegion");
    if ( selectedRegion === undefined ) {
        return DEFAULT_REGION;
    }
    return selectedRegion;
}

/**
 * Set in storage the region selected by user.
 * Position in input is longitude, latitude or object: {longitude: 0, latitude: 0}.
 */
setSelectedRegion = async (r) => {
    if (typeof(r) === "string") {
        await setPref("analysis.selectedRegion", r);
    } else {
        throw "type error";
    }
}