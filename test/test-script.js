import chai from 'chai';
import spies from 'chai-spies';
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import chrome from 'sinon-chrome';
import Mocha from 'mocha';

const expect = chai.expect,
    assert = chai.assert,
    should = chai.should();
const mocha = new Mocha();
const runner = mocha.run(function(failures){
    process.on('exit', function () {
      process.exit(failures);
    });
  });
  
// This is how we get results.
runner.on('fail', function(test, err){
    console.log(err);
});

chai.use(spies);
// fix value not kept by chrome storage
const chromeStorage = {};
chrome.storage.local.get = async function (keys) {  
    if ( typeof(keys) === 'object' ) {
        if ( Array.isArray(keys) ) {
            throw 'not impl. see https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get'
        } else {
            throw 'not impl.';
        }
    } else {
        return new Promise((resolve, reject) => {resolve(chromeStorage[keys]);})
    }
}
chrome.storage.local.set.set = function (obj) {
    console.info(called);
    if ( typeof(obj) !== 'object' || Array.isArray(obj) ) {
        throw "cannot set with that obj";
    } else {
        for(const k of Object.keys(obj)) {
            console.info("setup");
            chromeStorage[k] = obj[k];
        }
    }
}
const __dirname = dirname(fileURLToPath(import.meta.url));

const simplerRequire = (filename) => {
    if ( ! path.isAbsolute(filename) ) {
        filename = path.join(__dirname, filename);
    }
    const data = fs.readFileSync(filename, 'utf8');
    eval(data);
}

// define variable in scope that need to be
var printDebug, isInDebug, getBrowser, isFirefox, obrowser, isChrome, translate, translateText, translateHref, loadTranslations, extractHostname, attachParent, attachParentRecurse, createMVC, hide, show;
simplerRequire('../lib/carbonalyser/lib.js');
obrowser = getBrowser();
var injectEquivalentIntoHTML, computeEquivalenceFromStatsItem, updateEquivalence;
simplerRequire('../lib/carbonalyser/libEquivalence.js');
var injectRegionIntoHTML, attachHandlerToSelectRegion, selectRegionHandler, getSelectedRegion, setSelectedRegion;
simplerRequire('../lib/carbonalyser/libRegionSelect.js');
var init, getOrCreateRawData, incBytesPerOrigin, incBytesDataCenter, incBytesNetwork, setRegion, getCarbonIntensityRegion, getParameters, setRefreshInterval, getRefreshInterval, capitalizeFirstLetter, lowerFirstLetter, getRegions, setParameters, getStats, toMegaByteNoRound, toMegaByte, toMebiByte;
simplerRequire('../lib/carbonalyser/libStats.js');
var getOrCreatePreferences, getPref, setPref, injectPreferencesIntoHTML, createEntry, IPIrecurse, IPIPrecurse;
simplerRequire('../lib/carbonalyser/libPreferences.js');
var getMsRefreshGui, getMsCheckRefresh, downloadCompletedCheckLoop, getOriginFromRequestDetail, getBytesFromHeaders, headersReceivedListener, sendHeadersListener, setBrowserIcon, addOneMinute, handleMessage, synchronizeGui;
simplerRequire('../background/trafficAnalyzer.js');

describe('extractHostname', function () {
    it('should return the hostname when url contains //', function (done) {
        const complexUrl = 'https://www.example.org/audio/25cdff43133ca';

        expect(extractHostname(complexUrl)).to.equal('www.example.org');
        done();
    });

    it('should return the hostname when url does not contains //', function (done) {
        const simpleUrl = 'www.example.org';

        expect(extractHostname(simpleUrl)).to.equal('www.example.org');
        done();
    });

});

describe('IPIrecurse', function () {
    it('ensure all leaf found', function (done) {
        let leafs = 0;
        createEntry = function (table, name, value) {
            leafs += 1;
        }
        let prefs = {
            daemon: {
                changes: {
                    auto_refresh: true,      // auto refresh
                    msBetweenChanges: 500,   // refresh ms
                    loopMs: 200              // daemon refresh speed
                },
                downloads: {
                    loopMs: 1000             // daemon download refresh speed
                }
            },
            analysis: {
                selectedRegion: 'default',   // selected region
                carbonIntensity: {
                    refreshMs: 3600 * 1000   // refresh carbon interval
                }
            },
            tab: {
                update: {
                    minMs:  1000             // min ms between two data update
                },
                animate: true                // remove animation
            },
            debug: false                      // enable debug log
        }
        IPIrecurse(undefined, prefs, undefined);
        leafs.should.equals(9);
        done();
    });
});

describe('IPIPrecurse', function() {
    it('ensure leaf correctly setup', function (done) {
        let prefs = {
            daemon: {
                changes: {
                    auto_refresh: true,      // auto refresh
                    msBetweenChanges: 500,   // refresh ms
                    loopMs: 200              // daemon refresh speed
                },
                downloads: {
                    loopMs: 1000             // daemon download refresh speed
                }
            }
        };
        expect(prefs.daemon.changes.auto_refresh).with.equal(true);
        IPIPrecurse(prefs, "daemon.changes.auto_refresh", false);
        expect(prefs.daemon.changes.auto_refresh).with.equal(false);
        done();
    });
});

describe('incBytesDataCenter', function () {
    return; // TODO
    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        chrome.storage.local.clear();
        done();
    });

    it('should put url in local storage with entered byte length', async function (done) {
        const origin = "www.example.org", value = 50;
        await incBytesDataCenter(origin, value);
        var result = JSON.parse(await chrome.storage.local.get('rawdata'))[origin];
        result.should.have.property('datacenter');
        result.datacenter.should.have.property('total').with.equal(value);
        done();
    })

    it('should increase in the local storage existing byte length for the same url', async function (done) {
        const origin = "www.example.org";
        incBytesDataCenter(origin, 128);
        incBytesDataCenter(origin, 64);

        var result = JSON.parse(await chrome.storage.local.get('rawdata'))[origin];

        result.should.have.property('datacenter');
        result.datacenter.should.have.property('total').with.equal(192);
        done();
    });

    it('should increase in the local storage existing byte length for different url', async function (done) {
        const origin = "www.example.org", origin2 = "www1.example.org";
        incBytesDataCenter(origin, 128);
        incBytesDataCenter(origin2, 64);

        var result = JSON.parse(await chrome.storage.local.get('rawdata'))[origin];
        var result2 = JSON.parse(await chrome.storage.local.get('rawdata'))[origin2];
        result.should.have.property('datacenter');
        result2.should.have.property('datacenter');

        result.datacenter.should.have.property('total').with.equal(128);
        result2.datacenter.should.have.property('total').with.equal(64);
        done();
    });
});

describe('getOrCreateRawData', function() {
    return; // TODO
    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        chrome.storage.local.clear();
        done();
    });

    it('should retrieve or create a stats object', async function(done) {
        var expected = {};
        var storage = await getOrCreateRawData();
        var storage2 = await getOrCreateRawData();
        expect(expected).to.deep.equal(storage);
        expect(expected).to.deep.equal(storage2);
        done();
    });
});

describe('getStats', function() {
    return; // TODO
    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        chrome.storage.local.clear();
        done();
    });

    it('should retrieve or create a stats object', async function(done) {
        const d = "example.org", d1 = "1.example.org", d2 = "2.example.org";
        await incBytesDataCenter(d, 1);
        await incBytesDataCenter(d1, 2);
        await incBytesDataCenter(d2, 3);
        const storage = await getOrCreateRawData();
        const stats = await getStats(1);
        stats.totalDataCenter.should.equals(6);
        stats.total.should.equals(stats.totalDataCenter);
        stats.highestStats.length.should.equals(2);
        done();
    });
});

describe('addOneMinute', function () {
    return; // TODO
    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        chrome.storage.local.clear();
        done();
    });

    it('should add one minute to the item duration in local storage', async function (done) {
        addOneMinute();

        var result = JSON.parse(await chrome.storage.local.get("duration"));
        result.should.equals(1);
        done();
    });

    it('should add several minutes to the item duration in local storage', async function (done) {
        const nbMinutesAdded = 5;
        for (var i = 0; i < nbMinutesAdded; i++) {
            addOneMinute();
        }

        var result = JSON.parse(await chrome.storage.local.get("duration"));
        result.should.equals(nbMinutesAdded);
        done();
    });
});

describe('isChrome', function () {
    return; // TODO
    this.afterEach(function (done) {
        //MOCK browser object for Chrome Extension Context
        browser = undefined;
        InstallTrigger = undefined;
        done();
    });

    it('should return true when Chrome Extension', function (done) {
        var result = isChrome();
        result.should.equals(true);
        done();
    });

    it('should return false when not Chrome Extension', function (done) {
        //MOCK browser for Mozilla Extension Context
        browser = {};
        InstallTrigger = {};

        var result = isChrome();
        result.should.equals(false);

        //MOCK deletion
        browser = undefined;
        InstallTrigger = undefined;
        done();
    });
});

var browser = {};
describe('isFirefox', function () {
    return; // TODO
    this.afterEach(function (done) {
        browser = undefined;
        InstallTrigger = undefined;
        done();
    });

    it('should return false when Firefox Extension', function (done) {
        var result = isFirefox();
        result.should.equals(false);
        done();
    });

    it('should return true when not Chrome Extension', function (done) {
        //MOCK browser for Mozilla Extension Context
        browser = {};
        InstallTrigger = {};

        var result = isFirefox();
        result.should.equals(true);

        //MOCK deletion
        browser = undefined;
        InstallTrigger = undefined;
        done();
    });
});

describe('headersReceivedListener', function () {
    return; // TODO
    let requestDetails = {};
    // backup for spied methods
    const DOMAIN_NAME = 'http://www.example.org';
    const extractHostNameBackup = extractHostname;
    const incBytesDataCenterBackup = incBytesDataCenter;

    this.beforeEach(function (done) {
        requestDetails = {
            url: 'https://www.example.org/audio/25cdff43133cae53f93fc8ad58af83c080792f03?__token__=exp=1574937651~hmac=2b46cc453c414848d67825d49db7943d7b35ac760d11aebd702659b250b1c9cf',
            responseHeaders: [
                {name: 'Last-Modified', value: 'Thu, 18 Apr 2019 18:16:43 GMT'},
                {name: 'Accept-Ranges', 'value': 'bytes'},
                {name: 'Cache-Control', 'value': 'no-transform, max-age=31493578'},
                {name: 'Cache-Control', 'value': 'max-age=315360000, no-transform'},
                {name: 'Date', 'value': 'Tue, 03 Dec 2019 09:29:01 GMT'}, {
                    name: 'Access-Control-Max-Age',
                    'value': '86400'
                },
                {name: 'Access-Control-Allow-Headers', 'value': 'range, pragma, cache-control'},
                {name: 'Access-Control-Allow-Methods', 'value': 'GET'},
                {name: 'Access-Control-Allow-Origin', 'value': '*'},
                {name: 'Expires', 'value': 'Fri, 30 Nov 2029 09:29:01 GMT'},
                {name: 'ETag', 'value': '\'1ac1d934b4a02a8a5ec89afba3161982\''},
                {name: 'Content-Type', 'value': 'application/octet-stream'},
                {name: 'Content-Range', 'value': 'bytes 1487435-1652811/3614291'},
                {name: 'Content-Length', 'value': '165377'}]
        };
        done();
    });

    this.afterEach(function (done) {
        //reset chai spies
        extractHostname = extractHostNameBackup;
        incBytesDataCenter = incBytesDataCenterBackup;

        //reset mock browser
        done();
    });

    it('should call extractHostName with provided originUrl when it is provided from parameter (Mozilla Firefox Browser behavior)', function (done) {
        extractHostname = chai.spy(extractHostname);

        requestDetails.originUrl = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.originUrl);
        done();
    });

    it('should call extractHostname with Initiator when it is provided from parameter (Chrome Browser behavior)', function (done) {
        extractHostname = chai.spy(extractHostname);

        requestDetails.initiator = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.initiator);
        done();
    });

    it('should call extractHostname with url when neither Initiator nor originUrl is not provided from from parameter', function (done) {
        extractHostname = chai.spy(extractHostname);

        requestDetails.initiator = undefined;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.url);
        done();
    });

    it('should call incBytesDataCenter with request size passed in parameter', function (done) {
        incBytesDataCenter = chai.spy();

        requestDetails.initiator = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(incBytesDataCenter).to.have.been.called.with('www.example.org', 165377);
        done();
    });

    it('should call incBytesDataCenter with zero request size when request size is UNDEFINED', function (done) {
        incBytesDataCenter = chai.spy();

        requestDetails.initiator = DOMAIN_NAME;
        requestDetails.responseHeaders = [];
        headersReceivedListener(requestDetails);

        expect(incBytesDataCenter).to.have.been.called.with('www.example.org', 0);
        done();
    });
});