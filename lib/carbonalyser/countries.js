/**
 * Some definitions commons to pages of carbonalyser.
 */

/**
 * Holds all addressable space on earth.
 */
const earthObject = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Polygon",
                coordinates: [
                
                    [ [-180.0, -180.0], [-180.0, 180.0], [180.0, 180.0],[180.0, -180.0], [-180.0, -180.0] ]
                
                ]
            }
        }
    ]
};

/**
 * Holds all addressable space in the "default" region.<br />
 * Which is more an "average" region, if we got no data (user location) we use this value, <br />
 * to make it works in as many as possible cases (should not be used if a precise result is expected).
 */
const defaultObject = earthObject;