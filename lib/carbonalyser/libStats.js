
let DISABLED_URLS = [/^about:.*$/,/^chrome:.*$/,/^chrome-extension:.*$/,/^moz-extension:.*$/,/^https?:\/\/localhost(:[0-9]+)?\/.*$/,/^[^\/:]+:\/\/127\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?\//];

isRestricted = (url) => {
    for(const turl of DISABLED_URLS) {
        if ( turl.test(url) ) {
            return true;
        }
    }
    return false;
}

/**
 * Initialize the library.
 */
LS_init = async () => {
    
}

createEmptyRawData = () => {
    return {attentionTime: 0, datacenter: {total: 0, dots: {}}, network: {total: 0, dots: {}}, ecoindex: {}};
}

/**
 * Get the raw data.
 */
getOrCreateRawData = async (origin) => {
    let rv = await obrowser.storage.local.get('rawdata');
    rv = rv.rawdata === undefined ? {} : JSON.parse(rv.rawdata);
    const rdorigin = getOrCreateOriginFromRawData(rv, origin);
    if ( rdorigin === undefined ) {
        return rv;
    } else {
        return rdorigin;
    }
}

getOrCreateOriginFromRawData = (rawdata,origin) => {
    if ( origin !== undefined ) {
        if ( rawdata[origin] === undefined ) {
            return createEmptyRawData();
        } else {
            return rawdata[origin];
        }
    }
}
/**
 * Get a duration object.
 */
getDuration = async () => {
    let duration = (await obrowser.storage.local.get('duration')).duration;
    if ( duration === undefined ) {
        duration = {
        total: 0,
        set: {}
        }
        await obrowser.storage.local.set({duration: JSON.stringify(duration)});
    } else {
        duration = JSON.parse(duration);
    }
    return duration;
}

/**
 * Get some stats.
 */
getOrCreateStats = async () => {
    let rv = await obrowser.storage.local.get('stats');
    if ( rv.stats === undefined ) {
        return getEmptyStatsObject();
    } else {
        return JSON.parse(rv.stats);
    }
}

getEmptyStatsObject = () => {
    return {equivalence: getEmptyEquivalenceObject(), stats: 
        {
            total: 0,
            totaltotalDataCenter: 0,
            totalNetwork: 0,
            highestStats: []
        },
        bytesDataCenterObjectForm: [],
        bytesNetworkObjectForm: [],
        electricityDataCenterObjectForm: [],
        electricityNetworkObjectForm: [],
        attention: {
            time: {
                labels: [],
                data: []
            },
            efficiency: {
                labels: [],
                data: []
            }
        },
        forecast: {
            dayRateKWh: 0,  // daily kWh rate
        }
    };
}

/**
 * increment some stat in the stats storage.
 */
incBytesPerOrigin = async (classType, origin, bytes) => {
    const rawdata = await getOrCreateRawData();
    const ts = Date.now();
    const originStorage = await getOrCreateRawData(origin);
    const originClassTypeStorage = originStorage[classType];
    originClassTypeStorage.total += bytes;
    if ( originClassTypeStorage.dots[ts] === undefined ) {
        originClassTypeStorage.dots[ts] = 0;
    }
    originClassTypeStorage.dots[ts] += bytes;
    rawdata[origin] = originStorage;
    await obrowser.storage.local.set({rawdata: JSON.stringify(rawdata)});
}

/**
 * Increment the amount of bytes classified as stored in datacenter in the stats storage.
 */
incBytesDataCenter = async (origin, bytes) => {
    await incBytesPerOrigin('datacenter', origin, bytes);
}

/**
 * Increment the amount of bytes classified as coming over network in the stats storage.
 */
incBytesNetwork = async (origin, bytes) => {
    await incBytesPerOrigin('network', origin, bytes);
}

/**
 * Set carbon intensity for a given region with name.
 */
 setCarbonIntensityRegion = async (name, carbonIntensity) => {
    if ( carbonIntensity < 0 ) {
        throw "carbonIntensity(" + carbonIntensity + ") cannot be negative";
    }
    const region = {carbonIntensity: carbonIntensity};
    await setRegion(name, region);
}

/**
 * Add information on a given region.
 */
setRegion = async (name, region) => {
    const parameters = await getParameters();
    const regions = parameters.regions;
    regions[name] = region;
    await setParameters(parameters);
}

/**
 * Get carbon intensity for region with given name.
 */
getCarbonIntensityRegion = async (name) => {
    const parameters = await getParameters();
    return parameters.regions[name].carbonIntensity;
}

/**
 * Get or set parameters in the storage.
 * Returned object is never null.
 */
getParameters = async () => {
    let v = await obrowser.storage.local.get('parameters');
    if ( v.parameters === undefined ) {
        v = {regions: {}, lastRefresh: null};
        await obrowser.storage.local.set({parameters: JSON.stringify(v)});
    } else {
        v = JSON.parse(v.parameters);
    }
    return v;
}

capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

lowerFirstLetter = (string) => {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * Retrieve regions from the storage.
 */
getRegions = async () => {
    return (await getParameters()).regions;
}

/**
 * Set parameters object in the storage.
 */
setParameters = async (parameters) => {
    await obrowser.storage.local.set({parameters: JSON.stringify(parameters)});
}

/**
 * Create stats from the raw data.
 */
getStats = async (rawdata) => {
    if ( rawdata === undefined ) {
        rawdata = await getOrCreateRawData();
    }
    let total = 0;
    let totalDataCenter = 0, totalNetwork = 0;
    const highestStats = [];

    for (let origin in rawdata) {
        const rdo = getOrCreateOriginFromRawData(rawdata, origin);
        totalDataCenter += rdo.datacenter.total;
        totalNetwork    += rdo.network.total;
        highestStats.push({ 'origin': origin, 'byte': (rdo.datacenter.total + rdo.network.total) });
    }

    total = totalDataCenter + totalNetwork;

    highestStats.sort(function(a, b) {
        return a.byte < b.byte ? 1 : a.byte > b.byte ? -1 : 0
    });

    let subtotal = 0;
    for (let index in highestStats) {
        subtotal += highestStats[index].byte;
    }

    if (total > 0) {
        const remaining = total - subtotal;
        if (remaining > 0) {
            highestStats.push({'origin': translate('statsOthers'), 'byte': remaining});
        }

        highestStats.forEach(function (item) {
            item.percent = Math.round(100 * item.byte / total)
        });
    }

    return {
        'total': total,
        'totalDataCenter': totalDataCenter,
        'totalNetwork': totalNetwork,
        'highestStats': highestStats
    }
}

// Create a sum of data for all websites
// tsInterval in s
createSumOfData = (rawdata, type, tsInterval=60, byOrigins=undefined) => {
    tsInterval *= 1000;
    const rv = {};
    for(const origin in rawdata) {
        let takeit = false;
        if ( byOrigins === undefined ) {
            takeit = true;
        }
        if ( typeof(byOrigins) === typeof([]) ) {
            for(const bo of byOrigins) {
                if ( origin.match(bo) ) {
                    takeit = true;
                    break;
                }
            }
        }
        if ( typeof(byOrigins) === typeof("") ) {
            if ( origin.match(byOrigins) ) {
                takeit = true;
                break;
            }
        }
        if ( takeit ) {
            if ( rawdata[origin][type] === undefined ) {
                printDebug("Found undefined at rawdata[" + origin + "][" + type + "]")
                continue;
            }
            const keys = Object.keys(rawdata[origin][type].dots);
            for(const tso in rawdata[origin][type].dots ) {
                const originalTS = parseInt(tso);
                let ts = originalTS;
                const newTs = keys.find((a) => (ts-tsInterval) <= a && a <= (ts+tsInterval));
                if ( newTs !== undefined ) {
                    ts = newTs;
                }
                if ( rv[ts] === undefined ) {
                    rv[ts] = 0;
                }
                rv[ts] += rawdata[origin][type].dots[originalTS];
            }
        }
    }
    return rv;
}

// create 0 data point when time ellapsed is too high
// assuming sod sorted
// ts in seconds
fillSODGaps = (sod, tsInterval=60*10) => {
    tsInterval *= 1000;
    let previous = undefined;
    const keys = Object.keys(sod).sort((a,b) => a > b);
    for(let ts of keys) {
        if (previous !== undefined) {
        const pratInterv = (ts - previous);
        if ( pratInterv > tsInterval ) {
            const newTs = parseInt(previous) + parseInt(Math.round(pratInterv/2));
            sod[newTs] = 0;
        }
        }
        previous = ts;
    }
}

// used to merge two sod (respecting interval constraint)
// ts in seconds
mergeTwoSOD = (sod1,sod2, tsInterval=60*10) => {
    tsInterval *= 1000;
    const keys = Object.keys(sod1);
    const result = Object.assign({}, sod1);
    for(let ts in sod2) {
        const tsOrigin = ts;
        const newTs = keys.find((a) => (ts-tsInterval) <= a && a <= (ts+tsInterval));
        if ( newTs !== undefined ) {
        ts = newTs;
        }
        if ( result[ts] === undefined ) {
        result[ts] = 0;
        } 
        result[ts] += sod2[tsOrigin];
    }
    return result;
}

// create an object containing sum of data
createObjectFromSumOfData = (sod) => {
    const rv = [];
    for(const ts in sod) {
        rv.push({x: parseInt(ts), y: parseInt(sod[ts])});
    }
    return rv;
}

// create moving average from the sum of datas (ordered)
// tsInterval number of seconds of interval
createMovingAverage = (sod, tsInterval=10) => {
    let avgSum = 0;         // sum for average
    const dots = [];        // dots for the graph
    const stackedSums = []; // stack of sums
  
    for(let obj of sod) {
      let ts = obj.x;
      const cmp = ts - tsInterval;
      avgSum += obj.y;
      stackedSums.push(obj);
  
      while(stackedSums[0].x < cmp) {
        avgSum -= stackedSums.shift().y;
      }
  
      dots.push({x: ts, y: (avgSum/(stackedSums[stackedSums.length-1].x-stackedSums[0].x))});
    }
    return dots;
}

/**
 * Compile bytes into csv report.
 */
 compileBytes = (rawdata, separator, byOrigins=undefined, newline) => {
    const o = createStatsFromData(rawdata, byOrigins);
    const o1 = o.bytesDataCenterObjectForm;
    const o2 = o.bytesNetworkObjectForm;
    return compileXYdata(["timestampMs","bytesDatacenter","bytesNetwork"], o1, o2, separator, newline);
}

/**
 * Compile electricity into csv report.
 */
 compileElectricity = async (rawdata, separator, byOrigins=undefined, newline) => {
    const o = createStatsFromData(rawdata, byOrigins);
    const duration = await getDuration();
    const oo = await generateElectricityConsumptionFromBytes(o.bytesDataCenterObjectForm, o.bytesNetworkObjectForm, duration);
    const o1 = oo.electricityDataCenterObjectForm;
    const o2 = oo.electricityNetworkObjectForm;
    return compileXYdata(["timestampMs","mWhDatacenter","mWhNetwork"], o1, o2, separator, newline);
}

/**
 * Compile co² equivalent into csv report.
 */
compileCO2equivalent = async (rawdata, separator, byOrigins=undefined, newline) => {
    const regions = await getRegions();
    const o = createStatsFromData(rawdata, byOrigins);
    const duration = await getDuration();
    const oo = await generateElectricityConsumptionFromBytes(o.bytesDataCenterObjectForm, o.bytesNetworkObjectForm, duration);
    const o1 = oo.electricityDataCenterObjectForm; // mWh
    const o2 = oo.electricityNetworkObjectForm; // mWh
    const ges = {
        network:  [],
        datacenter: []
    };
    for(const oooo of [
        {
            attr: "datacenter",
            obj: o1
        },
        {
            attr: "network",
            obj: o2
        },
    ]) {
        for(const ooo of oooo.obj) {
            ges[oooo.attr].push({x: ooo.x, y: regions['default'].carbonIntensity * (ooo.y / 1000000)});
        }
    }
    return compileXYdata(["timestampMs","gCO2Datacenter","gCO2Network"], ges.datacenter, ges.network, separator, newline);
}

/**
 * Compile [{x:,y:}, ...] shape into csv report.
 */
compileXYdata = (columns, o1, o2, separator, newline) => {
    if ( separator === undefined ) {
        separator = ",";
    }
    if (newline === undefined) {
        newline = "\n";
    }
    let header = "";
    for(let i = 0; i < columns.length; i = i + 1) {
        const v = columns[i];
        header += v;
        if ( (i+1) < columns.length ) {
            header += separator;
        }
    }
    header += newline;
    let data = header;
    let i1 = 0, i2 = 0;
    let x1 = undefined, x2 = undefined;
    while(x1 !== null && x2 !== null) {
        if ( i1 < o1.length ) {
            x1 = o1[i1].x;
        } else {
            x1 = null;
        }
        if ( i2 < o2.length ) {
            x2 = o2[i2].x;
        } else {
            x2 = null;
        }

        if ( x1 !== null || x2 !== null ) {
            if ( x1 < x2 || x2 === null ) {
                data += x1 + separator + o1[i1].y + separator + newline;
                i1 += 1;
            } else if ( x1 === x2 ) {
                data += x1 + separator + o1[i1].y + separator + o2[i2].y + newline;
                i1 += 1;
                i2 += 1;
            } else if ( x2 < x1 || x1 === null ) {
                data += x2 + separator + separator + o2[i2].y + newline;
                i2 += 1;
            }
        }
    }
    return data;
}

/**
 * Create electricity consumption from input bytes.
 */
generateElectricityConsumptionFromBytes = async (bytesDataCenterObjectForm, bytesNetworkObjectForm, duration) => {
    const stats = {
        electricityDataCenterObjectForm: [],
        electricityNetworkObjectForm: []
    };
    for(const object of Object.values(duration.set)) {
      object.kWh = 0;
    }
    for(const object of [
      {
        bytes: bytesDataCenterObjectForm, 
        electricity: stats.electricityDataCenterObjectForm,
        pref: "general.kWhPerByteDataCenter"
      },
      {
        bytes: bytesNetworkObjectForm, 
        electricity: stats.electricityNetworkObjectForm,
        pref: "general.kWhPerByteNetwork"
      }
    ]) {
      for(const o of object.bytes) {
        const kWh = o.y * (await getPref(object.pref));
        const mWh = kWh * 1000000;
        const minute = Math.trunc(((o.x)/1000)/60);
        let key;
        let passed = false;
        for(key = minute-5; key < minute + 5; key += 1) {
          const durationObj = duration.set[key];
          if ( durationObj !== undefined ) {
            durationObj.kWh += kWh;
            passed = true;
            break;
          }
        }
        if ( ! passed ) {
          key = minute;
        }
        if ( duration.set[key] === undefined ) {
          passed = true;
          duration.set[key] = {duration: 0, kWh: kWh};
        }
        if ( passed == false ) {
          console.error("leaks", key, kWh, mWh);
        }
        object.electricity.push({x: o.x, y: mWh});
      }
    }
    return stats;
}

createStatsFromData = (rawdata, byOrigins=undefined) => {
    const bytesDataCenterUnordered = createSumOfData(rawdata, 'datacenter', 60, byOrigins);
    let bytesNetworkUnordered = createSumOfData(rawdata, 'network', 60, byOrigins);
    bytesNetworkUnordered = mergeTwoSOD(bytesDataCenterUnordered, bytesNetworkUnordered);
    fillSODGaps(bytesNetworkUnordered);
    fillSODGaps(bytesDataCenterUnordered);
    return {
        bytesDataCenterObjectForm: createObjectFromSumOfData(bytesDataCenterUnordered).sort((a,b) => a.x > b.x),
        bytesNetworkObjectForm: createObjectFromSumOfData(bytesNetworkUnordered).sort((a,b) => a.x > b.x)
    }  
}

/**
 * Compute electricity consummed by the device during a given amount of time.
 */
updateDurationElectricity = async (duration) => {
    for(const object of Object.values(duration.set)) {
        const kWhDevice = object.duration * (await getKWhMinute());
        object.kWh += kWhDevice;
    }
}

/**
 * Compile and download data in the browser.
 * @param {*} rawdata data
 * @param {*} fname name of the file to export (no terminal part)
 * @param typeofData type of data to download : {data,co2,electricity}
 */
compileAndDownload = async (rawdata,typeofData,fname,fileformat,originFilterStr=undefined) => {

    let originFilter = undefined;
    let data = "";
    if ( originFilterStr !== undefined && originFilterStr !== null ) {
        originFilterStr = originFilterStr.replace(/^[ \t]+/,"");
        originFilterStr = originFilterStr.replace(/[ \t]+$/,"");
        if ( originFilterStr !== "" ) {
            originFilter = originFilterStr.split(",");
        }
    }

    if ( typeofData === "co2" ) {
        if (fileformat === "csv") {
            data = await compileCO2equivalent(rawdata, ",", originFilter);
        } else if(fileformat === "tsv") {
            data = await compileCO2equivalent(rawdata, "\t", originFilter);
        } else {
            console.error("unsupported format " + fileformat);
        }
    } else if ( typeofData === "data" ) {
        if (fileformat === "csv") {
            data = compileBytes(rawdata, ",", originFilter);
        } else if(fileformat === "tsv") {
            data = compileBytes(rawdata, "\t", originFilter);
        } else {
            console.error("unsupported format " + fileformat);
        }
    } else if ( typeofData === "electricity" ) {
        if (fileformat === "csv") {
            data = await compileElectricity(rawdata, ",", originFilter);
        } else if(fileformat === "tsv") {
            data = await compileElectricity(rawdata, "\t", originFilter);
        } else {
            console.error("unsupported format " + fileformat);
        }
    } else {
        console.error("unsupported option");
    }
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    return (await obrowser.downloads.download({
        url: url,
        filename: fname + "." + fileformat,
        conflictAction: "overwrite",
        saveAs: false
    }));
}

getKWhMinute = async () => {
    const kwhm = ((await getPref("general.DeviceConsumptionW")) / 60000);
    return kwhm;
}

toMegaByteNoRound = (value) => ((value * 0.000001).toFixed(2))
toMegaByte = (value) => (Math.round(value/1000/1000));
toMebiByte = (value) => (Math.round(value/1024/1024));


LS_init();