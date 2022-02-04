const chai = require('chai'),
    spies = require('chai-spies');
expect = chai.expect,
    assert = chai.assert,
    should = chai.should();

const Mocha = require('mocha');
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

//MOCK GLOBAL STORAGE
function storageMock() {
    var storage = {};

    return {
        setItem: function (key, value) {
            storage[key] = value || '';
        },
        getItem: function (key) {
            return key in storage ? storage[key] : null;
        },
        removeItem: function (key) {
            delete storage[key];
        },
        get length() {
            return Object.keys(storage).length;
        },
        key: function (i) {
            var keys = Object.keys(storage);
            return keys[i] || null;
        }
    };
}

// MOCK CHROME before calling the tested code
const chrome = require('chrome-mock');
global.chrome = chrome;
global.handleMessage = {};
localStorage = storageMock();

// calling the tested code
require('../script.js');
require('../lib/lib.js');

describe('extractHostName', function () {
    it('should return the hostname when url contains //', function (done) {
        const complexUrl = 'https://audio-ak-spotify-com.akamaized.net/audio/25cdff43133ca';

        expect(extractHostname(complexUrl)).to.equal('audio-ak-spotify-com.akamaized.net');
        done();
    });

    it('should return the hostname when url does not contains //', function (done) {
        const simpleUrl = 'www.youtube.fr';

        expect(extractHostname(simpleUrl)).to.equal('www.youtube.fr');
        done();
    });

});
describe('incBytesDataCenter', function () {

    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        localStorage = storageMock();
        done();
    });

    it('should put url in local storage with entered byte length', function (done) {
        const origin = "www.youtube.fr", value = 50;
        incBytesDataCenter(origin, value);
        var result = JSON.parse(localStorage.getItem("stats"))["bytesDataCenter"];

        result.should.have.property(origin).with.equal(value);
        done();
    })

    it('should increase in the local storage existing byte length for the same url', function (done) {
        const origin = "www.youtube.fr";
        incBytesDataCenter(origin, 128);
        incBytesDataCenter(origin, 64);

        var result = JSON.parse(localStorage.getItem("stats"))["bytesDataCenter"];

        result.should.have.property(origin).with.equal(192);
        done();
    });

    it('should increase in the local storage existing byte length for different url', function (done) {
        const origin = "www.youtube.fr", origin2 = "www.spotify.com";
        incBytesDataCenter(origin, 128);
        incBytesDataCenter(origin2, 64);

        var result = JSON.parse(localStorage.getItem("stats"))["bytesDataCenter"];
        result.should.have.property(origin).with.equal(128);
        result.should.have.property(origin2).with.equal(64);
        done();
    });
});

describe('getOrCreateStats', function() {
    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        localStorage = storageMock();
        done();
    });

    it('should retrieve or create a stats object', function(done) {
        var expected = {bytesDataCenter: {}, bytesNetwork: {}};
        var storage = getOrCreateStats();
        var storage2 = getOrCreateStats();
        expect(expected).to.deep.equal(storage);
        expect(expected).to.deep.equal(storage2);
        done();
    });
});

describe('addOneMinute', function () {

    this.beforeEach(function (done) {
        //reset local storage before each test to make independant tests
        localStorage = storageMock();
        done();
    });

    it('should add one minute to the item duration in local storage', function (done) {
        addOneMinute();

        var result = JSON.parse(localStorage.getItem("duration"));
        result.should.equals(1);
        done();
    });

    it('should add several minutes to the item duration in local storage', function (done) {
        const nbMinutesAdded = 5;
        for (var i = 0; i < nbMinutesAdded; i++) {
            addOneMinute();
        }

        var result = JSON.parse(localStorage.getItem("duration"));
        result.should.equals(nbMinutesAdded);
        done();
    });
});

describe('isChrome', function () {
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

describe('isFirefox', function () {
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
    let requestDetails = {};
    // backup for spied methods
    const DOMAIN_NAME = 'http://www.spotify.com';
    const extractHostNameBackup = extractHostname;
    const incBytesDataCenterBackup = incBytesDataCenter;

    this.beforeEach(function (done) {
        requestDetails = {
            url: 'https://audio-ak-spotify-com.akamaized.net/audio/25cdff43133cae53f93fc8ad58af83c080792f03?__token__=exp=1574937651~hmac=2b46cc453c414848d67825d49db7943d7b35ac760d11aebd702659b250b1c9cf',
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
        browser = undefined;
        InstallTrigger = undefined;
        done();
    });

    it('should call extractHostName with provided originUrl when it is provided from parameter (Mozilla Firefox Browser behavior)', function (done) {
        browser = {
            webRequest: {}
        };
        InstallTrigger = {};
        extractHostname = chai.spy();

        requestDetails.originUrl = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.originUrl);
        done();
    });

    it('should call extractHostname with Initiator when it is provided from parameter (Chrome Browser behavior)', function (done) {
        extractHostname = chai.spy();

        requestDetails.initiator = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.initiator);
        done();
    });

    it('should call extractHostname with url when neither Initiator nor originUrl is not provided from from parameter', function (done) {
        extractHostname = chai.spy();

        requestDetails.initiator = undefined;

        headersReceivedListener(requestDetails);

        expect(extractHostname).to.have.been.called.with(requestDetails.url);
        done();
    });

    it('should call incBytesDataCenter with request size passed in parameter', function (done) {
        incBytesDataCenter = chai.spy();

        requestDetails.initiator = DOMAIN_NAME;

        headersReceivedListener(requestDetails);

        expect(incBytesDataCenter).to.have.been.called.with('www.spotify.com', 165377);
        done();
    });

    it('should call incBytesDataCenter with zero request size when request size is UNDEFINED', function (done) {
        incBytesDataCenter = chai.spy();

        requestDetails.initiator = DOMAIN_NAME;
        requestDetails.responseHeaders = [];
        headersReceivedListener(requestDetails);

        expect(incBytesDataCenter).to.have.been.called.with('www.spotify.com', 0);
        done();
    });
});