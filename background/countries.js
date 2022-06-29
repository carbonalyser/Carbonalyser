/**
 * Maintain in memory list of countries.
 */

// https://datahub.io/core/geo-countries#python
const xhr = new XMLHttpRequest();
xhr.open("GET","data/countries.geojson", false);
xhr.overrideMimeType("text/plain");
xhr.send();
if ( xhr.status !== 200 ) {
    throw "xhr failed " + xhr.status + " - " + xhr.statusText;
}
const countriesObject = JSON.parse(xhr.responseText);
/**
 * Take ISO_A3 country code and return geomtry if found in the current definition.
 */
getGeometryForCountry = (country) => {
    if (typeof(country) === "string") {
        for(const feature of countriesObject.features) {
            if ( feature.properties.ISO_A3 === country ) {
                return feature.geometry;
            }
        }
        throw "Country " + country + " not found";
    } else {
        throw "Type " + typeof(country) + " not reconized for country";
    } 
}

// https://european-union.europa.eu/principles-countries-history/country-profiles_fr
// last checked 24/06/2022
const countriesEU_ISO_A3 = ["DEU","AUT","BEL","BGR","CYP","HRV","DNK","ESP","EST","FIN","FRA","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD","POL","PRT","ROU","SVK","SVN","SWE","CZE"];
const countriesEUObject = {
    type: "FeatureCollection",
    features: []
};
const countriesEUFlattenMultiPolygon = [];
for(const ISO_A3 of countriesEU_ISO_A3) {
    for(const feature of countriesObject.features) {
        if ( feature.properties.ISO_A3 === ISO_A3) {
            countriesEUObject.features.push(feature);
            if ( feature.geometry.type === "Polygon" ) {
                countriesEUFlattenMultiPolygon.push(feature.geometry.coordinates);
            } else if ( feature.geometry.type === "MultiPolygon" ) {
                for(const polygon of feature.geometry.coordinates ) {
                    countriesEUFlattenMultiPolygon.push(polygon);
                }
            } else {
                throw "cannot merge a geometry of type " + feature.geometry.type;
            }
            break;
        }
    }
}
/**
 * Holds all addressable space in EU.
 */
const EUObjectUnified = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
            },
            geometry: {
              type: "MultiPolygon",
              coordinates: countriesEUFlattenMultiPolygon
            }
        }
    ]
};