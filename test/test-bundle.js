(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', { value: true });

/*!
 * isobject <https://github.com/jonschlinkert/isobject>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

function isObject(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

/* eslint-disable no-undef */

//
//  Copyright 2018 mParticle, Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
    

    var name = 'Criteo',
        moduleId = 1010,
        MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        },
        // below are custom types for logging page views and setting site types for Criteo
        CRITEO_SITETYPE = 'CRITEO_SITETYPE',
        CRITEO_VIEW_HOMEPAGE = 'CRITEO_VIEW_HOMEPAGE';

    var constructor = function () {
        var self = this,
            reportingService,
            mpCustomFlags;

        setDefaultCriteoEvents();

        self.name = name;

        function initForwarder(forwarderSettings, service, testMode, trackerId, userAttributes, userIdentities, appVersion, appName, customFlags) {
            mpCustomFlags = customFlags;
            if (!testMode) {
                reportingService = service;
                settings = forwarderSettings;
                try {
                    var criteoScript = document.createElement('script');
                    window.criteo_q = window.criteo_q || [];
                    criteoScript.type = 'text/javascript';
                    criteoScript.async = true;
                    criteoScript.src = 'https://static.criteo.net/js/ld/ld.js';
                    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(criteoScript);
                }
                catch (e) {
                    return 'Failed to initialize: ' + e;
                }
            } else {
                // each event needs to be defaulted for tests
                setDefaultCriteoEvents();
            }

            setAccountEvent.account = forwarderSettings.apiKey;
            return 'Criteo successfully loaded';
        }

        // each of the following Criteo Event Types are set and then an
        // array of them are processed in processQueuedCriteoEvent
        function setDefaultCriteoEvents() {
            setAccountEvent = { event: 'setAccount' },
            setSiteTypeEvent = { event: 'setSiteType' },
            setEmailEvent = { event: 'setEmail' },
            setCustomerIdEvent = { event: 'setCustomerId' },
            setDataEvent = { event: 'setData' };
        }

        function processEvent(event) {
            var reportEvent = false;
            var criteoEvent;

            try {
                if (event.EventDataType === MessageType.Commerce) {
                    if (event.EventCategory === mParticle.CommerceEventType.ProductAddToCart) {
                        criteoEvent = createViewBasket(event);
                    }
                    else if (event.EventCategory === mParticle.CommerceEventType.ProductViewDetail) {
                        criteoEvent = createViewProduct(event);
                    }
                    else if (event.EventCategory === mParticle.CommerceEventType.ProductImpression) {
                        criteoEvent = createViewList(event);
                    }
                    else if (event.EventCategory === mParticle.CommerceEventType.ProductPurchase) {
                        criteoEvent = createTrackTransactionEvent(event);
                    }
                }
                else if (event.EventDataType === MessageType.PageView) {
                    if (event.CustomFlags && event.CustomFlags[CRITEO_VIEW_HOMEPAGE]) {
                        criteoEvent = { event: 'viewHome' };
                    } else {
                        return 'Error - Criteo home page views are logged via mParticle.logPageView(\'homepage\), no other logPageViews are sent to Criteo';
                    }
                } else {
                    return 'Error - Criteo does not support the event type - ' + event.EventDataType;
                }

                modifySetSiteTypeEvent(event);
                modifySetDataEvent(event);
                queueCriteoEvent(criteoEvent);

                reportEvent = true;

                if (reportEvent === true && reportingService) {
                    reportingService(self, event);
                    return 'Successfully sent to ' + name;
                }
                else {
                    return 'Error logging event or event type not supported - ' + reportEvent.error;
                }
            }
            catch (e) {
                return 'Failed to send to: ' + name + ' ' + e;
            }
        }

        function modifySetSiteTypeEvent() {
            if (mpCustomFlags && mpCustomFlags[CRITEO_SITETYPE]) {
                setSiteTypeEvent.type = mpCustomFlags[CRITEO_SITETYPE];
            } else {
                setSiteTypeEvent.type = 'd';
            }
        }

        function modifySetDataEvent(event) {
            var eventAttributes = event.EventAttributes || {};

            if (Object.keys(eventAttributes).length) {
                for (var key in eventAttributes) {
                    if (key !=='siteType') {
                        if (eventAttributes.hasOwnProperty(key)) {
                            setDataEvent[key] = eventAttributes[key];
                        }
                    }
                }
            }
        }

        function resetSetDataEventAfterQueuingEvent() {
            setDataEvent = {
                event: 'setData'
            };
        }

        function queueCriteoEvent(criteoEvent) {
            var eventQueue = [setAccountEvent, setSiteTypeEvent];
            if (setEmailEvent.email) {
                eventQueue.push(setEmailEvent);
            }
            if (setCustomerIdEvent.id) {
                eventQueue.push(setCustomerIdEvent);
            }

            eventQueue.push(criteoEvent);

            if (Object.keys(setDataEvent).length > 1) {
                eventQueue.push(setDataEvent);
            }

            window.criteo_q.push.apply(window.criteo_q, JSON.parse(JSON.stringify(eventQueue)));

            resetSetDataEventAfterQueuingEvent();
        }

        function createViewBasket(event) {
            var criteoEvent = { event: 'viewBasket' },
                items = [];

            event.ProductAction.ProductList.forEach(function(product) {
                items.push({
                    id: product.Sku,
                    price: product.Price,
                    quantity: product.Quantity
                });
            });

            criteoEvent.item = items;

            return criteoEvent;
        }

        function createViewProduct(event) {
            var criteoEvent = { event: 'viewItem' },
                items = [];

            event.ProductAction.ProductList.forEach(function(product) {
                if (product.Sku) {
                    items.push(product.Sku);
                }
            });

            criteoEvent.item = items;

            return criteoEvent;
        }

        function createViewList(event) {
            var criteoEvent = { event: 'viewList' },
                items = [];

            event.ProductImpressions.forEach(function(impression) {
                impression.ProductList.forEach(function(product) {
                    if (product.Sku) {
                        items.push(product.Sku);
                    }
                });
            });

            criteoEvent.item = items;

            return criteoEvent;
        }

        function createTrackTransactionEvent(event) {
            var criteoEvent = { event: 'trackTransaction' };

            if (event.ProductAction.TransactionId) {
                criteoEvent.id = event.ProductAction.TransactionId;
            }

            var criteoProductList = [];

            event.ProductAction.ProductList.forEach(function(product) {
                criteoProductList.push({
                    id: product.Sku,
                    price: parseFloat(product.Price),
                    quantity: product.Quantity
                });
            });

            criteoEvent.item = criteoProductList;

            return criteoEvent;
        }

        function setUserIdentity(id, type) {
            try {
                if (type === window.mParticle.IdentityType.CustomerId) {
                    setCustomerIdEvent.id = id;
                }
                else if (type === window.mParticle.IdentityType.Email) {
                    setEmailEvent.email = id.trim().toLowerCase();
                }
                else {
                    return 'Only CustomerID and Email types are available on Criteo';
                }
            }
            catch (e) {
                return 'Failed to call setUserIdentity on ' + name + ' ' + e;
            }
        }

        this.init = initForwarder;
        this.process = processEvent;
        this.setUserIdentity = setUserIdentity;
    };

    function getId() {
        return moduleId;
    }

    function register(config) {
        if (!config) {
            window.console.log('You must pass a config object to register the kit ' + name);
            return;
        }

        if (!isObject(config)) {
            window.console.log('\'config\' must be an object. You passed in a ' + typeof config);
            return;
        }

        if (isObject(config.kits)) {
            config.kits[name] = {
                constructor: constructor
            };
        } else {
            config.kits = {};
            config.kits[name] = {
                constructor: constructor
            };
        }
        window.console.log('Successfully registered ' + name + ' to your mParticle configuration');
    }

    if (window && window.mParticle && window.mParticle.addForwarder) {
        window.mParticle.addForwarder({
            name: name,
            constructor: constructor,
            getId: getId
        });
    }

    var CriteoEventForwarder = {
        register: register
    };
var CriteoEventForwarder_1 = CriteoEventForwarder.register;

exports.default = CriteoEventForwarder;
exports.register = CriteoEventForwarder_1;

},{}],2:[function(require,module,exports){
(function (global){
// Base64 encoder/decoder - http://www.webtoolkit.info/javascript_base64.html
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",// Input must be a string
encode:function(a){try{if(window.btoa&&window.atob)return window.btoa(unescape(encodeURIComponent(a)))}catch(a){window.console.log("Error encoding cookie values into Base64:"+a);}return this._encode(a)},_encode:function(a){var b,c,d,e,f,g,h,j="",k=0;for(a=UTF8.encode(a);k<a.length;)b=a.charCodeAt(k++),c=a.charCodeAt(k++),d=a.charCodeAt(k++),e=b>>2,f=(3&b)<<4|c>>4,g=(15&c)<<2|d>>6,h=63&d,isNaN(c)?g=h=64:isNaN(d)&&(h=64),j=j+Base64._keyStr.charAt(e)+Base64._keyStr.charAt(f)+Base64._keyStr.charAt(g)+Base64._keyStr.charAt(h);return j},decode:function(a){try{if(window.btoa&&window.atob)return decodeURIComponent(escape(window.atob(a)))}catch(a){//log(e);
}return Base64._decode(a)},_decode:function(a){var b,c,d,e,f,g,h,j="",k=0;for(a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");k<a.length;)e=Base64._keyStr.indexOf(a.charAt(k++)),f=Base64._keyStr.indexOf(a.charAt(k++)),g=Base64._keyStr.indexOf(a.charAt(k++)),h=Base64._keyStr.indexOf(a.charAt(k++)),b=e<<2|f>>4,c=(15&f)<<4|g>>2,d=(3&g)<<6|h,j+=String.fromCharCode(b),64!==g&&(j+=String.fromCharCode(c)),64!==h&&(j+=String.fromCharCode(d));return j=UTF8.decode(j),j}},UTF8={encode:function(a){for(var b,d="",e=0;e<a.length;e++)b=a.charCodeAt(e),128>b?d+=String.fromCharCode(b):127<b&&2048>b?(d+=String.fromCharCode(192|b>>6),d+=String.fromCharCode(128|63&b)):(d+=String.fromCharCode(224|b>>12),d+=String.fromCharCode(128|63&b>>6),d+=String.fromCharCode(128|63&b));return d},decode:function(a){for(var b="",d=0,e=0,f=0,g=0;d<a.length;)e=a.charCodeAt(d),128>e?(b+=String.fromCharCode(e),d++):191<e&&224>e?(f=a.charCodeAt(d+1),b+=String.fromCharCode((31&e)<<6|63&f),d+=2):(f=a.charCodeAt(d+1),g=a.charCodeAt(d+2),b+=String.fromCharCode((15&e)<<12|(63&f)<<6|63&g),d+=3);return b}};var Polyfill = {// forEach polyfill
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
forEach:function forEach(a,b){var c,d;if(null==this)throw new TypeError(" this is null or not defined");var e=Object(this),f=e.length>>>0;if("function"!=typeof a)throw new TypeError(a+" is not a function");for(1<arguments.length&&(c=b),d=0;d<f;){var g;d in e&&(g=e[d],a.call(c,g,d,e)),d++;}},// map polyfill
// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.io/#x15.4.4.19
map:function map(a,b){var c,d,e;if(null===this)throw new TypeError(" this is null or not defined");var f=Object(this),g=f.length>>>0;if("function"!=typeof a)throw new TypeError(a+" is not a function");for(1<arguments.length&&(c=b),d=Array(g),e=0;e<g;){var h,i;e in f&&(h=f[e],i=a.call(c,h,e,f),d[e]=i),e++;}return d},// filter polyfill
// Prodcution steps of ECMA-262, Edition 5
// Reference: http://es5.github.io/#x15.4.4.20
filter:function filter(a/*, thisArg*/){if(void 0===this||null===this)throw new TypeError;var b=Object(this),c=b.length>>>0;if("function"!=typeof a)throw new TypeError;for(var d=[],e=2<=arguments.length?arguments[1]:void 0,f=0;f<c;f++)if(f in b){var g=b[f];a.call(e,g,f,b)&&d.push(g);}return d},// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
isArray:function isArray(a){return "[object Array]"===Object.prototype.toString.call(a)},Base64:Base64};

var MessageType={SessionStart:1,SessionEnd:2,PageView:3,PageEvent:4,CrashReport:5,OptOut:6,AppStateTransition:10,Profile:14,Commerce:16,Media:20,UserAttributeChange:17,UserIdentityChange:18},EventType={Unknown:0,Navigation:1,Location:2,Search:3,Transaction:4,UserContent:5,UserPreference:6,Social:7,Other:8,Media:9,getName:function getName(a){return a===EventType.Navigation?"Navigation":a===EventType.Location?"Location":a===EventType.Search?"Search":a===EventType.Transaction?"Transaction":a===EventType.UserContent?"User Content":a===EventType.UserPreference?"User Preference":a===EventType.Social?"Social":a===CommerceEventType.ProductAddToCart?"Product Added to Cart":a===CommerceEventType.ProductAddToWishlist?"Product Added to Wishlist":a===CommerceEventType.ProductCheckout?"Product Checkout":a===CommerceEventType.ProductCheckoutOption?"Product Checkout Options":a===CommerceEventType.ProductClick?"Product Click":a===CommerceEventType.ProductImpression?"Product Impression":a===CommerceEventType.ProductPurchase?"Product Purchased":a===CommerceEventType.ProductRefund?"Product Refunded":a===CommerceEventType.ProductRemoveFromCart?"Product Removed From Cart":a===CommerceEventType.ProductRemoveFromWishlist?"Product Removed from Wishlist":a===CommerceEventType.ProductViewDetail?"Product View Details":a===CommerceEventType.PromotionClick?"Promotion Click":a===CommerceEventType.PromotionView?"Promotion View":"Other"}},CommerceEventType={ProductAddToCart:10,ProductRemoveFromCart:11,ProductCheckout:12,ProductCheckoutOption:13,ProductClick:14,ProductViewDetail:15,ProductPurchase:16,ProductRefund:17,PromotionView:18,PromotionClick:19,ProductAddToWishlist:20,ProductRemoveFromWishlist:21,ProductImpression:22},IdentityType={Other:0,CustomerId:1,Facebook:2,Twitter:3,Google:4,Microsoft:5,Yahoo:6,Email:7,FacebookCustomAudienceId:9,Other2:10,Other3:11,Other4:12};IdentityType.isValid=function(a){if("number"==typeof a)for(var b in IdentityType)if(IdentityType.hasOwnProperty(b)&&IdentityType[b]===a)return !0;return !1},IdentityType.getName=function(a){return a===window.mParticle.IdentityType.CustomerId?"Customer ID":a===window.mParticle.IdentityType.Facebook?"Facebook ID":a===window.mParticle.IdentityType.Twitter?"Twitter ID":a===window.mParticle.IdentityType.Google?"Google ID":a===window.mParticle.IdentityType.Microsoft?"Microsoft ID":a===window.mParticle.IdentityType.Yahoo?"Yahoo ID":a===window.mParticle.IdentityType.Email?"Email":a===window.mParticle.IdentityType.FacebookCustomAudienceId?"Facebook App User ID":"Other ID"},IdentityType.getIdentityType=function(a){return "other"===a?IdentityType.Other:"customerid"===a?IdentityType.CustomerId:"facebook"===a?IdentityType.Facebook:"twitter"===a?IdentityType.Twitter:"google"===a?IdentityType.Google:"microsoft"===a?IdentityType.Microsoft:"yahoo"===a?IdentityType.Yahoo:"email"===a?IdentityType.Email:"facebookcustomaudienceid"===a?IdentityType.FacebookCustomAudienceId:"other2"===a?IdentityType.Other2:"other3"===a?IdentityType.Other3:!("other4"!=a)&&IdentityType.Other4},IdentityType.getIdentityName=function(a){return a===IdentityType.Other?"other":a===IdentityType.CustomerId?"customerid":a===IdentityType.Facebook?"facebook":a===IdentityType.Twitter?"twitter":a===IdentityType.Google?"google":a===IdentityType.Microsoft?"microsoft":a===IdentityType.Yahoo?"yahoo":a===IdentityType.Email?"email":a===IdentityType.FacebookCustomAudienceId?"facebookcustomaudienceid":a===IdentityType.Other2?"other2":a===IdentityType.Other3?"other3":a===IdentityType.Other4?"other4":void 0};var ProductActionType={Unknown:0,AddToCart:1,RemoveFromCart:2,Checkout:3,CheckoutOption:4,Click:5,ViewDetail:6,Purchase:7,Refund:8,AddToWishlist:9,RemoveFromWishlist:10};ProductActionType.getName=function(a){return a===ProductActionType.AddToCart?"Add to Cart":a===ProductActionType.RemoveFromCart?"Remove from Cart":a===ProductActionType.Checkout?"Checkout":a===ProductActionType.CheckoutOption?"Checkout Option":a===ProductActionType.Click?"Click":a===ProductActionType.ViewDetail?"View Detail":a===ProductActionType.Purchase?"Purchase":a===ProductActionType.Refund?"Refund":a===ProductActionType.AddToWishlist?"Add to Wishlist":a===ProductActionType.RemoveFromWishlist?"Remove from Wishlist":"Unknown"},ProductActionType.getExpansionName=function(a){return a===ProductActionType.AddToCart?"add_to_cart":a===ProductActionType.RemoveFromCart?"remove_from_cart":a===ProductActionType.Checkout?"checkout":a===ProductActionType.CheckoutOption?"checkout_option":a===ProductActionType.Click?"click":a===ProductActionType.ViewDetail?"view_detail":a===ProductActionType.Purchase?"purchase":a===ProductActionType.Refund?"refund":a===ProductActionType.AddToWishlist?"add_to_wishlist":a===ProductActionType.RemoveFromWishlist?"remove_from_wishlist":"unknown"};var PromotionActionType={Unknown:0,PromotionView:1,PromotionClick:2};PromotionActionType.getName=function(a){return a===PromotionActionType.PromotionView?"view":a===PromotionActionType.PromotionClick?"click":"unknown"},PromotionActionType.getExpansionName=function(a){return a===PromotionActionType.PromotionView?"view":a===PromotionActionType.PromotionClick?"click":"unknown"};var ProfileMessageType={Logout:3},ApplicationTransitionType={AppInit:1};var Types = {MessageType:MessageType,EventType:EventType,CommerceEventType:CommerceEventType,IdentityType:IdentityType,ProfileMessageType:ProfileMessageType,ApplicationTransitionType:ApplicationTransitionType,ProductActionType:ProductActionType,PromotionActionType:PromotionActionType};

var Constants={sdkVersion:"2.11.5",sdkVendor:"mparticle",platform:"web",Messages:{ErrorMessages:{NoToken:"A token must be specified.",EventNameInvalidType:"Event name must be a valid string value.",EventDataInvalidType:"Event data must be a valid object hash.",LoggingDisabled:"Event logging is currently disabled.",CookieParseError:"Could not parse cookie",EventEmpty:"Event object is null or undefined, cancelling send",APIRequestEmpty:"APIRequest is null or undefined, cancelling send",NoEventType:"Event type must be specified.",TransactionIdRequired:"Transaction ID is required",TransactionRequired:"A transaction attributes object is required",PromotionIdRequired:"Promotion ID is required",BadAttribute:"Attribute value cannot be object or array",BadKey:"Key value cannot be object or array",BadLogPurchase:"Transaction attributes and a product are both required to log a purchase, https://docs.mparticle.com/?javascript#measuring-transactions"},InformationMessages:{CookieSearch:"Searching for cookie",CookieFound:"Cookie found, parsing values",CookieNotFound:"Cookies not found",CookieSet:"Setting cookie",CookieSync:"Performing cookie sync",SendBegin:"Starting to send event",SendIdentityBegin:"Starting to send event to identity server",SendWindowsPhone:"Sending event to Windows Phone container",SendIOS:"Calling iOS path: ",SendAndroid:"Calling Android JS interface method: ",SendHttp:"Sending event to mParticle HTTP service",SendAliasHttp:"Sending alias request to mParticle HTTP service",SendIdentityHttp:"Sending event to mParticle HTTP service",StartingNewSession:"Starting new Session",StartingLogEvent:"Starting to log event",StartingLogOptOut:"Starting to log user opt in/out",StartingEndSession:"Starting to end session",StartingInitialization:"Starting to initialize",StartingLogCommerceEvent:"Starting to log commerce event",StartingAliasRequest:"Starting to Alias MPIDs",LoadingConfig:"Loading configuration options",AbandonLogEvent:"Cannot log event, logging disabled or developer token not set",AbandonAliasUsers:"Cannot Alias Users, logging disabled or developer token not set",AbandonStartSession:"Cannot start session, logging disabled or developer token not set",AbandonEndSession:"Cannot end session, logging disabled or developer token not set",NoSessionToEnd:"Cannot end session, no active session found"},ValidationMessages:{ModifyIdentityRequestUserIdentitiesPresent:"identityRequests to modify require userIdentities to be present. Request not sent to server. Please fix and try again",IdentityRequesetInvalidKey:"There is an invalid key on your identityRequest object. It can only contain a `userIdentities` object and a `onUserAlias` function. Request not sent to server. Please fix and try again.",OnUserAliasType:"The onUserAlias value must be a function. The onUserAlias provided is of type",UserIdentities:"The userIdentities key must be an object with keys of identityTypes and values of strings. Request not sent to server. Please fix and try again.",UserIdentitiesInvalidKey:"There is an invalid identity key on your `userIdentities` object within the identityRequest. Request not sent to server. Please fix and try again.",UserIdentitiesInvalidValues:"All user identity values must be strings or null. Request not sent to server. Please fix and try again.",AliasMissingMpid:"Alias Request must contain both a destinationMpid and a sourceMpid",AliasNonUniqueMpid:"Alias Request's destinationMpid and sourceMpid must be unique",AliasMissingTime:"Alias Request must have both a startTime and an endTime",AliasStartBeforeEndTime:"Alias Request's endTime must be later than its startTime"}},NativeSdkPaths:{LogEvent:"logEvent",SetUserTag:"setUserTag",RemoveUserTag:"removeUserTag",SetUserAttribute:"setUserAttribute",RemoveUserAttribute:"removeUserAttribute",SetSessionAttribute:"setSessionAttribute",AddToCart:"addToCart",RemoveFromCart:"removeFromCart",ClearCart:"clearCart",LogOut:"logOut",SetUserAttributeList:"setUserAttributeList",RemoveAllUserAttributes:"removeAllUserAttributes",GetUserAttributesLists:"getUserAttributesLists",GetAllUserAttributes:"getAllUserAttributes",Identify:"identify",Logout:"logout",Login:"login",Modify:"modify",Alias:"aliasUsers"},StorageNames:{localStorageName:"mprtcl-api",// Name of the mP localstorage, had cp and pb even if cookies were used, skipped v2
localStorageNameV3:"mprtcl-v3",// v3 Name of the mP localstorage, final version on SDKv1
cookieName:"mprtcl-api",// v1 Name of the cookie stored on the user's machine
cookieNameV2:"mprtcl-v2",// v2 Name of the cookie stored on the user's machine. Removed keys with no values, moved cartProducts and productBags to localStorage.
cookieNameV3:"mprtcl-v3",// v3 Name of the cookie stored on the user's machine. Base64 encoded keys in Base64CookieKeys object, final version on SDKv1
localStorageNameV4:"mprtcl-v4",// v4 Name of the mP localstorage, Current Version
localStorageProductsV4:"mprtcl-prodv4",// The name for mP localstorage that contains products for cartProducs and productBags
cookieNameV4:"mprtcl-v4",// v4 Name of the cookie stored on the user's machine. Base64 encoded keys in Base64CookieKeys object, current version on SDK v2
currentStorageName:"mprtcl-v4",currentStorageProductsName:"mprtcl-prodv4"},DefaultConfig:{cookieDomain:null,// If null, defaults to current location.host
cookieExpiration:365,// Cookie expiration time in days
logLevel:null,// What logging will be provided in the console
timeout:300,// timeout in milliseconds for logging functions
sessionTimeout:30,// Session timeout in minutes
maxProducts:20,// Number of products persisted in cartProducts and productBags
forwarderStatsTimeout:5e3,// Milliseconds for forwarderStats timeout
integrationDelayTimeout:5e3,// Milliseconds for forcing the integration delay to un-suspend event queueing due to integration partner errors
maxCookieSize:3e3,// Number of bytes for cookie size to not exceed
aliasMaxWindow:90,// Max age of Alias request startTime, in days
uploadInterval:0// Maximum milliseconds in between batch uploads, below 500 will mean immediate upload
},DefaultUrls:{v1SecureServiceUrl:"jssdks.mparticle.com/v1/JS/",v2SecureServiceUrl:"jssdks.mparticle.com/v2/JS/",v3SecureServiceUrl:"jssdks.mparticle.com/v3/JS/",configUrl:"jssdkcdns.mparticle.com/JS/v2/",identityUrl:"identity.mparticle.com/v1/",aliasUrl:"jssdks.mparticle.com/v1/identity/"},Base64CookieKeys:{csm:1,sa:1,ss:1,ua:1,ui:1,csd:1,ia:1,con:1},SDKv2NonMPIDCookieKeys:{gs:1,cu:1,l:1,globalSettings:1,currentUserMPID:1},HTTPCodes:{noHttpCoverage:-1,activeIdentityRequest:-2,activeSession:-3,validationIssue:-4,nativeIdentityRequest:-5,loggingDisabledOrMissingAPIKey:-6,tooManyRequests:429},FeatureFlags:{ReportBatching:"reportBatching",EventsV3:"eventsV3",EventBatchingIntervalMillis:"eventBatchingIntervalMillis"},DefaultInstance:"default_instance"};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var _typeof_1 = createCommonjsModule(function (module) {
function _typeof2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof2 = function _typeof2(obj) { return typeof obj; }; } else { _typeof2 = function _typeof2(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof2(obj); }

function _typeof(obj) {
  if (typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return _typeof2(obj);
    };
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : _typeof2(obj);
    };
  }

  return _typeof(obj);
}

module.exports = _typeof;
});

var runtime_1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined$1; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined$1) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined$1;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined$1;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined$1;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined$1, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined$1;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined$1;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined$1;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined$1;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined$1;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   module.exports 
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}
});

var regenerator = runtime_1;

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }
}

var arrayWithoutHoles = _arrayWithoutHoles;

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

var iterableToArray = _iterableToArray;

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

var nonIterableSpread = _nonIterableSpread;

function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || nonIterableSpread();
}

var toConsumableArray = _toConsumableArray;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var asyncToGenerator = _asyncToGenerator;

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var classCallCheck = _classCallCheck;

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var createClass = _createClass;

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var defineProperty = _defineProperty;

var SDKProductActionType;
(function (a) { a[a.Unknown = 0] = "Unknown", a[a.AddToCart = 1] = "AddToCart", a[a.RemoveFromCart = 2] = "RemoveFromCart", a[a.Checkout = 3] = "Checkout", a[a.CheckoutOption = 4] = "CheckoutOption", a[a.Click = 5] = "Click", a[a.ViewDetail = 6] = "ViewDetail", a[a.Purchase = 7] = "Purchase", a[a.Refund = 8] = "Refund", a[a.AddToWishlist = 9] = "AddToWishlist", a[a.RemoveFromWishlist = 10] = "RemoveFromWishlist"; })(SDKProductActionType || (SDKProductActionType = {}));

function ownKeys(a, b) { var c = Object.keys(a); if (Object.getOwnPropertySymbols) {
    var d = Object.getOwnPropertySymbols(a);
    b && (d = d.filter(function (b) { return Object.getOwnPropertyDescriptor(a, b).enumerable; })), c.push.apply(c, d);
} return c; }
function _objectSpread(a) { for (var b, c = 1; c < arguments.length; c++)
    b = null == arguments[c] ? {} : arguments[c], c % 2 ? ownKeys(b, !0).forEach(function (c) { defineProperty(a, c, b[c]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(a, Object.getOwnPropertyDescriptors(b)) : ownKeys(b).forEach(function (c) { Object.defineProperty(a, c, Object.getOwnPropertyDescriptor(b, c)); }); return a; }
function convertEvents(a, b, c) { if (!a)
    return null; if (!b || 1 > b.length)
    return null; var d = [], e = null, f = !0, g = !1, h = void 0; try {
    for (var i, j, k = b[Symbol.iterator](); !(f = (i = k.next()).done); f = !0)
        if (j = i.value, j) {
            e = j;
            var m = convertEvent(j);
            m && d.push(m);
        }
}
catch (a) {
    g = !0, h = a;
}
finally {
    try {
        f || null == k["return"] || k["return"]();
    }
    finally {
        if (g)
            throw h;
    }
} if (!e)
    return null; var l = { source_request_id: c._Helpers.generateUniqueId(), mpid: a, timestamp_unixtime_ms: new Date().getTime(), environment: e.Debug ? "development" : "production", events: d, mp_deviceid: e.DeviceId, sdk_version: e.SDKVersion, application_info: { application_version: e.AppVersion, application_name: e.AppName }, device_info: { platform: "web", screen_width: window.screen.width, screen_height: window.screen.height }, user_attributes: e.UserAttributes, user_identities: convertUserIdentities(e.UserIdentities), consent_state: convertConsentState(e.ConsentState), integration_attributes: e.IntegrationAttributes }; return e.DataPlan && e.DataPlan.PlanId && (l.context = { data_plan: { plan_id: e.DataPlan.PlanId, plan_version: e.DataPlan.PlanVersion || void 0 } }), l; }
function convertConsentState(a) { if (!a)
    return null; var b = { gdpr: convertGdprConsentState(a.getGDPRConsentState()), ccpa: convertCcpaConsentState(a.getCCPAConsentState()) }; return b; }
function convertGdprConsentState(a) { if (!a)
    return null; var b = {}; for (var c in a)
    a.hasOwnProperty(c) && (b[c] = { consented: a[c].Consented, hardware_id: a[c].HardwareId, document: a[c].ConsentDocument, timestamp_unixtime_ms: a[c].Timestamp, location: a[c].Location }); return b; }
function convertCcpaConsentState(a) { if (!a)
    return null; var b = { data_sale_opt_out: null }; return a.hasOwnProperty("data_sale_opt_out") && (b.data_sale_opt_out = { consented: a.data_sale_opt_out.Consented, hardware_id: a.data_sale_opt_out.HardwareId, document: a.data_sale_opt_out.ConsentDocument, timestamp_unixtime_ms: a.data_sale_opt_out.Timestamp, location: a.data_sale_opt_out.Location }), b; }
function convertUserIdentities(a) { if (!a || !a.length)
    return null; var b = {}, c = !0, d = !1, e = void 0; try {
    for (var f, g, h = a[Symbol.iterator](); !(c = (f = h.next()).done); c = !0)
        switch (g = f.value, g.Type) {
            case Types.IdentityType.CustomerId:
                b.customer_id = g.Identity;
                break;
            case Types.IdentityType.Email:
                b.email = g.Identity;
                break;
            case Types.IdentityType.Facebook:
                b.facebook = g.Identity;
                break;
            case Types.IdentityType.FacebookCustomAudienceId:
                b.facebook_custom_audience_id = g.Identity;
                break;
            case Types.IdentityType.Google:
                b.google = g.Identity;
                break;
            case Types.IdentityType.Microsoft:
                b.microsoft = g.Identity;
                break;
            case Types.IdentityType.Other:
                b.other = g.Identity;
                break;
            case Types.IdentityType.Other2:
                b.other_id_2 = g.Identity;
                break;
            case Types.IdentityType.Other3:
                b.other_id_3 = g.Identity;
                break;
            case Types.IdentityType.Other4:
                b.other_id_4 = g.Identity;
                break;
            default:
        }
}
catch (a) {
    d = !0, e = a;
}
finally {
    try {
        c || null == h["return"] || h["return"]();
    }
    finally {
        if (d)
            throw e;
    }
} return b; }
function convertEvent(a) {
    if (!a)
        return null;
    switch (a.EventDataType) {
        case Types.MessageType.AppStateTransition: return convertAST(a);
        case Types.MessageType.Commerce: return convertCommerceEvent(a);
        case Types.MessageType.CrashReport: return convertCrashReportEvent(a);
        case Types.MessageType.OptOut: return convertOptOutEvent(a);
        case Types.MessageType.PageEvent: return convertCustomEvent(a);
        case Types.MessageType.PageView: return convertPageViewEvent(a);
        case Types.MessageType.Profile: //deprecated and not supported by the web SDK
            return null;
        case Types.MessageType.SessionEnd: return convertSessionEndEvent(a);
        case Types.MessageType.SessionStart: return convertSessionStartEvent(a);
        case Types.MessageType.UserAttributeChange: return convertUserAttributeChangeEvent(a);
        case Types.MessageType.UserIdentityChange: return convertUserIdentityChangeEvent(a);
        default:
    }
    return null;
}
function convertProductActionType(a) { if (!a)
    return "unknown"; return a === SDKProductActionType.AddToCart ? "add_to_cart" : a === SDKProductActionType.AddToWishlist ? "add_to_wishlist" : a === SDKProductActionType.Checkout ? "checkout" : a === SDKProductActionType.CheckoutOption ? "checkout_option" : a === SDKProductActionType.Click ? "click" : a === SDKProductActionType.Purchase ? "purchase" : a === SDKProductActionType.Refund ? "refund" : a === SDKProductActionType.RemoveFromCart ? "remove_from_cart" : a === SDKProductActionType.RemoveFromWishlist ? "remove_from_wish_list" : a === SDKProductActionType.ViewDetail ? "view_detail" : "unknown"; }
function convertProductAction(a) { if (!a.ProductAction)
    return null; var b = { action: convertProductActionType(a.ProductAction.ProductActionType), checkout_step: a.ProductAction.CheckoutStep, checkout_options: a.ProductAction.CheckoutOptions, transaction_id: a.ProductAction.TransactionId, affiliation: a.ProductAction.Affiliation, total_amount: a.ProductAction.TotalAmount, tax_amount: a.ProductAction.TaxAmount, shipping_amount: a.ProductAction.ShippingAmount, coupon_code: a.ProductAction.CouponCode, products: convertProducts(a.ProductAction.ProductList) }; return b; }
function convertProducts(a) { if (!a || !a.length)
    return null; var b = [], c = !0, d = !1, e = void 0; try {
    for (var f, g = a[Symbol.iterator](); !(c = (f = g.next()).done); c = !0) {
        var h = f.value, i = { id: h.Sku, name: h.Name, brand: h.Brand, category: h.Category, variant: h.Variant, total_product_amount: h.TotalAmount, position: h.Position, price: h.Price, quantity: h.Quantity, coupon_code: h.CouponCode, custom_attributes: h.Attributes };
        b.push(i);
    }
}
catch (a) {
    d = !0, e = a;
}
finally {
    try {
        c || null == g["return"] || g["return"]();
    }
    finally {
        if (d)
            throw e;
    }
} return b; }
function convertPromotionAction(a) { if (!a.PromotionAction)
    return null; var b = { action: a.PromotionAction.PromotionActionType, promotions: convertPromotions(a.PromotionAction.PromotionList) }; return b; }
function convertPromotions(a) { if (!a || !a.length)
    return null; var b = [], c = !0, d = !1, e = void 0; try {
    for (var f, g = a[Symbol.iterator](); !(c = (f = g.next()).done); c = !0) {
        var h = f.value, i = { id: h.Id, name: h.Name, creative: h.Creative, position: h.Position };
        b.push(i);
    }
}
catch (a) {
    d = !0, e = a;
}
finally {
    try {
        c || null == g["return"] || g["return"]();
    }
    finally {
        if (d)
            throw e;
    }
} return b; }
function convertImpressions(a) { if (!a.ProductImpressions)
    return null; var b = [], c = !0, d = !1, e = void 0; try {
    for (var f, g = a.ProductImpressions[Symbol.iterator](); !(c = (f = g.next()).done); c = !0) {
        var h = f.value, i = { product_impression_list: h.ProductImpressionList, products: convertProducts(h.ProductList) };
        b.push(i);
    }
}
catch (a) {
    d = !0, e = a;
}
finally {
    try {
        c || null == g["return"] || g["return"]();
    }
    finally {
        if (d)
            throw e;
    }
} return b; }
function convertShoppingCart(a) { if (!a.ShoppingCart || !a.ShoppingCart.ProductList || !a.ShoppingCart.ProductList.length)
    return null; var b = { products: convertProducts(a.ShoppingCart.ProductList) }; return b; }
function convertCommerceEvent(a) { var b = convertBaseEventData(a), c = { custom_flags: a.CustomFlags, product_action: convertProductAction(a), promotion_action: convertPromotionAction(a), product_impressions: convertImpressions(a), shopping_cart: convertShoppingCart(a), currency_code: a.CurrencyCode }; return c = Object.assign(c, b), { event_type: "commerce_event", data: c }; }
function convertCrashReportEvent(a) { var b = convertBaseEventData(a), c = { message: a.EventName }; return c = Object.assign(c, b), { event_type: "crash_report", data: c }; }
function convertAST(a) { var b = convertBaseEventData(a), c = { application_transition_type: "application_initialized", is_first_run: a.IsFirstRun, is_upgrade: !1 }; return c = Object.assign(c, b), { event_type: "application_state_transition", data: c }; }
function convertSessionEndEvent(a) {
    var b = convertBaseEventData(a), c = { session_duration_ms: a.SessionLength //note: External Events DTO does not support the session mpids array as of this time.
        //spanning_mpids: sdkEvent.SessionMpids
    };
    return c = Object.assign(c, b), { event_type: "session_end", data: c };
}
function convertSessionStartEvent(a) { var b = convertBaseEventData(a), c = {}; return c = Object.assign(c, b), { event_type: "session_start", data: c }; }
function convertPageViewEvent(a) { var b = convertBaseEventData(a), c = { custom_flags: a.CustomFlags, screen_name: a.EventName }; return c = Object.assign(c, b), { event_type: "screen_view", data: c }; }
function convertOptOutEvent(a) { var b = convertBaseEventData(a), c = { is_opted_out: a.OptOut }; return c = Object.assign(c, b), { event_type: "opt_out", data: c }; }
function convertCustomEvent(a) { var b = convertBaseEventData(a), c = { custom_event_type: convertSdkEventType(a.EventCategory), custom_flags: a.CustomFlags, event_name: a.EventName }; return c = Object.assign(c, b), { event_type: "custom_event", data: c }; }
function convertSdkEventType(a) { return a === Types.EventType.Other ? "other" : a === Types.EventType.Location ? "location" : a === Types.EventType.Navigation ? "navigation" : a === Types.EventType.Search ? "search" : a === Types.EventType.Social ? "social" : a === Types.EventType.Transaction ? "transaction" : a === Types.EventType.UserContent ? "user_content" : a === Types.EventType.UserPreference ? "user_preference" : a === Types.CommerceEventType.ProductAddToCart ? "add_to_cart" : a === Types.CommerceEventType.ProductAddToWishlist ? "add_to_wishlist" : a === Types.CommerceEventType.ProductCheckout ? "checkout" : a === Types.CommerceEventType.ProductCheckoutOption ? "checkout_option" : a === Types.CommerceEventType.ProductClick ? "click" : a === Types.CommerceEventType.ProductImpression ? "impression" : a === Types.CommerceEventType.ProductPurchase ? "purchase" : a === Types.CommerceEventType.ProductRefund ? "refund" : a === Types.CommerceEventType.ProductRemoveFromCart ? "remove_from_cart" : a === Types.CommerceEventType.ProductRemoveFromWishlist ? "remove_from_wishlist" : a === Types.CommerceEventType.ProductViewDetail ? "view_detail" : a === Types.CommerceEventType.PromotionClick ? "promotion_click" : a === Types.CommerceEventType.PromotionView ? "promotion_view" : "unknown"; }
function convertBaseEventData(a) { var b = { timestamp_unixtime_ms: a.Timestamp, session_uuid: a.SessionId, session_start_unixtime_ms: a.SessionStartDate, custom_attributes: a.EventAttributes, location: a.Location }; return b; }
function convertUserAttributeChangeEvent(a) { var b = convertBaseEventData(a), c = { user_attribute_name: a.UserAttributeChanges.UserAttributeName, new: a.UserAttributeChanges.New, old: a.UserAttributeChanges.Old, deleted: a.UserAttributeChanges.Deleted, is_new_attribute: a.UserAttributeChanges.IsNewAttribute }; return c = _objectSpread({}, c, {}, b), { event_type: "user_attribute_change", data: c }; }
function convertUserIdentityChangeEvent(a) { var b = convertBaseEventData(a), c = { new: { identity_type: a.UserIdentityChanges.New.IdentityType, identity: a.UserIdentityChanges.New.Identity || null, timestamp_unixtime_ms: a.Timestamp, created_this_batch: a.UserIdentityChanges.New.CreatedThisBatch }, old: { identity_type: a.UserIdentityChanges.Old.IdentityType, identity: a.UserIdentityChanges.Old.Identity || null, timestamp_unixtime_ms: a.Timestamp, created_this_batch: a.UserIdentityChanges.Old.CreatedThisBatch } }; return c = Object.assign(c, b), { event_type: "user_identity_change", data: c }; }

var BatchUploader = /*#__PURE__*/ function () {
    function a(b, c) { var d = this; classCallCheck(this, a), defineProperty(this, "uploadIntervalMillis", void 0), defineProperty(this, "pendingEvents", void 0), defineProperty(this, "pendingUploads", void 0), defineProperty(this, "mpInstance", void 0), defineProperty(this, "uploadUrl", void 0), defineProperty(this, "batchingEnabled", void 0), this.mpInstance = b, this.uploadIntervalMillis = c, this.batchingEnabled = c >= a.MINIMUM_INTERVAL_MILLIS, this.uploadIntervalMillis < a.MINIMUM_INTERVAL_MILLIS && (this.uploadIntervalMillis = a.MINIMUM_INTERVAL_MILLIS), this.pendingEvents = [], this.pendingUploads = []; var e = this.mpInstance._Store, f = e.SDKConfig, g = e.devToken, h = this.mpInstance._Helpers.createServiceUrl(f.v3SecureServiceUrl, g); this.uploadUrl = "".concat(h, "/events"), setTimeout(function () { d.prepareAndUpload(!0, !1); }, this.uploadIntervalMillis), this.addEventListeners(); }
    return createClass(a, [{ key: "addEventListeners", value: function addEventListeners() { var a = this; window.addEventListener("beforeunload", function () { a.prepareAndUpload(!1, a.isBeaconAvailable()); }), window.addEventListener("pagehide", function () { a.prepareAndUpload(!1, a.isBeaconAvailable()); }); } }, { key: "isBeaconAvailable", value: function isBeaconAvailable() { return !!navigator.sendBeacon; } }, { key: "queueEvent", value: function queueEvent(a) { a && (a.IsFirstRun = this.mpInstance._Store.isFirstRun, this.pendingEvents.push(a), this.mpInstance.Logger.verbose("Queuing event: ".concat(JSON.stringify(a))), this.mpInstance.Logger.verbose("Queued event count: ".concat(this.pendingEvents.length)), !this.batchingEnabled && this.prepareAndUpload(!1, !1)); } /**
                 * This implements crucial logic to:
                 * - bucket pending events by MPID, and then by Session, and upload individual batches for each bucket.
                 *
                 * In the future this should enforce other requirements such as maximum batch size.
                 *
                 * @param sdkEvents current pending events
                 * @param defaultUser the user to reference for events that are missing data
                 */
        }, { key: "prepareAndUpload",
            value: function () { var b = asyncToGenerator(/*#__PURE__*/ regenerator.mark(function b(c, d) { var e, f, g, h, i, j, k, l = this; return regenerator.wrap(function (b) { for (;;)
                switch (b.prev = b.next) {
                    case 0: return e = this.mpInstance.Identity.getCurrentUser(), f = this.pendingEvents, this.pendingEvents = [], g = a.createNewUploads(f, e, this.mpInstance), g && g.length && (h = this.pendingUploads).push.apply(h, toConsumableArray(g)), i = this.pendingUploads, this.pendingUploads = [], b.next = 9, this.upload(this.mpInstance.Logger, i, d);
                    case 9: j = b.sent, j && j.length && (k = this.pendingUploads).unshift.apply(k, toConsumableArray(j)), c && setTimeout(function () { l.prepareAndUpload(!0, !1); }, this.uploadIntervalMillis);
                    case 12:
                    case "end": return b.stop();
                } }, b, this); })); return function prepareAndUpload() { return b.apply(this, arguments); }; }() }, { key: "upload", value: function () { var b = asyncToGenerator(/*#__PURE__*/ regenerator.mark(function b(c, d, e) { var f, g, h, j; return regenerator.wrap(function (b) { for (;;)
                switch (b.prev = b.next) {
                    case 0:
                        if (d && !(1 > d.length)) {
                            b.next = 2;
                            break;
                        }
                        return b.abrupt("return", null);
                    case 2: c.verbose("Uploading batches: ".concat(JSON.stringify(d))), c.verbose("Batch count: ".concat(d.length)), f = 0;
                    case 5:
                        if (!(f < d.length)) {
                            b.next = 37;
                            break;
                        }
                        if (g = { method: "POST", headers: { Accept: a.CONTENT_TYPE, "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(d[f]) }, b.prev = 7, !e) {
                            b.next = 13;
                            break;
                        }
                        h = new Blob([g.body], { type: "text/plain;charset=UTF-8" }), navigator.sendBeacon(this.uploadUrl, h), b.next = 28;
                        break;
                    case 13: return c.verbose("Uploading request ID: ".concat(d[f].source_request_id)), b.next = 16, fetch(this.uploadUrl, g);
                    case 16:
                        if (j = b.sent, !j.ok) {
                            b.next = 21;
                            break;
                        }
                        c.verbose("Upload success for request ID: ".concat(d[f].source_request_id)), b.next = 28;
                        break;
                    case 21:
                        if (!(500 <= j.status || 429 === j.status)) {
                            b.next = 25;
                            break;
                        }
                        return b.abrupt("return", d.slice(f, d.length));
                    case 25:
                        if (!(401 <= j.status)) {
                            b.next = 28;
                            break;
                        }
                        return c.error("HTTP error status ".concat(j.status, " while uploading - please verify your API key.")), b.abrupt("return", null);
                    case 28:
                        b.next = 34;
                        break;
                    case 30: return b.prev = 30, b.t0 = b["catch"](7), c.error("Exception while uploading: ".concat(b.t0)), b.abrupt("return", d.slice(f, d.length));
                    case 34:
                        f++, b.next = 5;
                        break;
                    case 37: return b.abrupt("return", null);
                    case 38:
                    case "end": return b.stop();
                } }, b, this, [[7, 30]]); })); return function upload() { return b.apply(this, arguments); }; }() }], [{ key: "createNewUploads", value: function createNewUploads(a, b, c) {
                if (!b || !a || !a.length)
                    return null; //bucket by MPID, and then by session, ordered by timestamp
                var d = [], e = new Map, f = !0, g = !1, h = void 0;
                try {
                    for (var i, j, k = a[Symbol.iterator](); !(f = (i = k.next()).done); f = !0) { //on initial startup, there may be events logged without an mpid.
                        if (j = i.value, !j.MPID) {
                            var C = b.getMPID();
                            j.MPID = C;
                        }
                        var D = e.get(j.MPID);
                        D || (D = []), D.push(j), e.set(j.MPID, D);
                    }
                }
                catch (a) {
                    g = !0, h = a;
                }
                finally {
                    try {
                        f || null == k["return"] || k["return"]();
                    }
                    finally {
                        if (g)
                            throw h;
                    }
                }
                for (var l = 0, m = Array.from(e.entries()); l < m.length; l++) {
                    var n = m[l], o = n[0], p = n[1], q = new Map, r = !0, s = !1, t = void 0;
                    try {
                        for (var u, v = p[Symbol.iterator](); !(r = (u = v.next()).done); r = !0) {
                            var w = u.value, x = q.get(w.SessionId);
                            x || (x = []), x.push(w), q.set(w.SessionId, x);
                        }
                    }
                    catch (a) {
                        s = !0, t = a;
                    }
                    finally {
                        try {
                            r || null == v["return"] || v["return"]();
                        }
                        finally {
                            if (s)
                                throw t;
                        }
                    }
                    for (var y = 0, z = Array.from(q.entries()); y < z.length; y++) {
                        var A = z[y], B = convertEvents(o, A[1], c);
                        B && d.push(B);
                    }
                }
                return d;
            } }]), a;
}();
defineProperty(BatchUploader, "CONTENT_TYPE", "text/plain;charset=UTF-8"), defineProperty(BatchUploader, "MINIMUM_INTERVAL_MILLIS", 500);

var HTTPCodes=Constants.HTTPCodes,Messages=Constants.Messages;function APIClient(a){this.uploader=null;var b=this;this.queueEventForBatchUpload=function(b){if(!this.uploader){var c=a._Helpers.getFeatureFlag(Constants.FeatureFlags.EventBatchingIntervalMillis);this.uploader=new BatchUploader(a,c);}this.uploader.queueEvent(b);},this.shouldEnableBatching=function(){if(!window.fetch)return !1;// Returns a string of a number that must be parsed
// Invalid strings will be parsed to NaN which is falsey
var b=parseInt(a._Helpers.getFeatureFlag(Constants.FeatureFlags.EventsV3),10);if(!b)return !1;var c=a._Helpers.getRampNumber(a._Store.deviceId);return b>=c},this.processQueuedEvents=function(){var c,d=a.Identity.getCurrentUser();if(d&&(c=d.getMPID()),a._Store.eventQueue.length&&c){var e=a._Store.eventQueue;a._Store.eventQueue=[],this.appendUserInfoToEvents(d,e),e.forEach(function(a){b.sendEventToServer(a);});}},this.appendUserInfoToEvents=function(b,c){c.forEach(function(c){c.MPID||a._ServerModel.appendUserInfo(b,c);});},this.sendEventToServer=function(b){if(a._Store.webviewBridgeEnabled)return void a._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.LogEvent,JSON.stringify(b));var c,d=a.Identity.getCurrentUser();// We queue events if there is no MPID (MPID is null, or === 0), or there are integrations that that require this to stall because integration attributes
// need to be set, or if we are still fetching the config (self hosted only), and so require delaying events
return d&&(c=d.getMPID()),a._Store.requireDelay=a._Helpers.isDelayedByIntegration(a._preInit.integrationDelays,a._Store.integrationDelayTimeoutStart,Date.now()),c&&!a._Store.requireDelay&&a._Store.configurationLoaded?void(this.processQueuedEvents(),this.shouldEnableBatching()?this.queueEventForBatchUpload(b):this.sendSingleEventToServer(b),b&&b.EventName!==Types.MessageType.AppStateTransition&&a._Forwarders.sendEventToForwarders(b)):(a.Logger.verbose("Event was added to eventQueue. eventQueue will be processed once a valid MPID is returned or there is no more integration imposed delay."),void a._Store.eventQueue.push(b))},this.sendSingleEventToServer=function(c){if(c.EventDataType!==Types.MessageType.Media){var d,e=function(){4===d.readyState&&(a.Logger.verbose("Received "+d.statusText+" from server"),b.parseEventResponse(d.responseText));};if(!c)return void a.Logger.error(Messages.ErrorMessages.EventEmpty);if(a.Logger.verbose(Messages.InformationMessages.SendHttp),d=a._Helpers.createXHR(e),d)try{d.open("post",a._Helpers.createServiceUrl(a._Store.SDKConfig.v2SecureServiceUrl,a._Store.devToken)+"/Events"),d.send(JSON.stringify(a._ServerModel.convertEventToDTO(c,a._Store.isFirstRun)));}catch(b){a.Logger.error("Error sending event to mParticle servers. "+b);}}},this.parseEventResponse=function(b){var c,d,e,f=new Date;if(b)try{if(a.Logger.verbose("Parsing response from server"),c=JSON.parse(b),c&&c.Store)for(d in a.Logger.verbose("Parsed store from response, updating local settings"),a._Store.serverSettings||(a._Store.serverSettings={}),c.Store)c.Store.hasOwnProperty(d)&&(e=c.Store[d],!e.Value||new Date(e.Expires)<f?a._Store.serverSettings.hasOwnProperty(d)&&delete a._Store.serverSettings[d]:a._Store.serverSettings[d]=e);a._Persistence.update();}catch(b){a.Logger.error("Error parsing JSON response from server: "+b.name);}},this.sendAliasRequest=function(b,c){var d,e=function(){if(4===d.readyState){//only parse error messages from failing requests
if(a.Logger.verbose("Received "+d.statusText+" from server"),200!==d.status&&202!==d.status&&d.responseText){var b=JSON.parse(d.responseText);if(b.hasOwnProperty("message")){var e=b.message;return void a._Helpers.invokeAliasCallback(c,d.status,e)}}a._Helpers.invokeAliasCallback(c,d.status);}};if(a.Logger.verbose(Messages.InformationMessages.SendAliasHttp),d=a._Helpers.createXHR(e),d)try{d.open("post",a._Helpers.createServiceUrl(a._Store.SDKConfig.aliasUrl,a._Store.devToken)+"/Alias"),d.send(JSON.stringify(b));}catch(b){a._Helpers.invokeAliasCallback(c,HTTPCodes.noHttpCoverage,b),a.Logger.error("Error sending alias request to mParticle servers. "+b);}},this.sendIdentityRequest=function(b,c,d,e,f,g){var h,i,j=function(){4===h.readyState&&(a.Logger.verbose("Received "+h.statusText+" from server"),f(h,i,d,e,c));};if(a.Logger.verbose(Messages.InformationMessages.SendIdentityBegin),!b)return void a.Logger.error(Messages.ErrorMessages.APIRequestEmpty);if(a.Logger.verbose(Messages.InformationMessages.SendIdentityHttp),h=a._Helpers.createXHR(j),h)try{a._Store.identityCallInFlight?a._Helpers.invokeCallback(d,HTTPCodes.activeIdentityRequest,"There is currently an Identity request processing. Please wait for this to return before requesting again"):(i=g||null,"modify"===c?h.open("post",a._Helpers.createServiceUrl(a._Store.SDKConfig.identityUrl)+g+"/"+c):h.open("post",a._Helpers.createServiceUrl(a._Store.SDKConfig.identityUrl)+c),h.setRequestHeader("Content-Type","application/json"),h.setRequestHeader("x-mp-key",a._Store.devToken),a._Store.identityCallInFlight=!0,h.send(JSON.stringify(b)));}catch(b){a._Store.identityCallInFlight=!1,a._Helpers.invokeCallback(d,HTTPCodes.noHttpCoverage,b),a.Logger.error("Error sending identity request to servers with status code "+h.status+" - "+b);}},this.sendBatchForwardingStatsToServer=function(b,c){var d,e;try{d=a._Helpers.createServiceUrl(a._Store.SDKConfig.v2SecureServiceUrl,a._Store.devToken),e={uuid:a._Helpers.generateUniqueId(),data:b},c&&(c.open("post",d+"/Forwarding"),c.send(JSON.stringify(e)));}catch(b){a.Logger.error("Error sending forwarding stats to mParticle servers.");}},this.sendSingleForwardingStatsToServer=function(b){var c,d;try{var e=function(){4===f.readyState&&202===f.status&&a.Logger.verbose("Successfully sent  "+f.statusText+" from server");},f=a._Helpers.createXHR(e);c=a._Helpers.createServiceUrl(a._Store.SDKConfig.v1SecureServiceUrl,a._Store.devToken),d=b,f&&(f.open("post",c+"/Forwarding"),f.send(JSON.stringify(d)));}catch(b){a.Logger.error("Error sending forwarding stats to mParticle servers.");}},this.getSDKConfiguration=function(a,b,c,d){var e;try{var f=function(){4===g.readyState&&(200===g.status?(b=d._Helpers.extend({},b,JSON.parse(g.responseText)),c(a,b,d),d.Logger.verbose("Successfully received configuration from server")):(c(a,b,d),d.Logger.verbose("Issue with receiving configuration from server, received HTTP Code of "+g.status)));},g=d._Helpers.createXHR(f);e="https://"+d._Store.SDKConfig.configUrl+a+"/config?env=",e+=b.isDevelopmentMode?"1":"0",g&&(g.open("get",e),g.send(null));}catch(f){c(a,b,d),d.Logger.error("Error getting forwarder configuration from mParticle servers.");}},this.prepareForwardingStats=function(c,d){var e,f=a._Forwarders.getForwarderStatsQueue();c&&c.isVisible&&(e={mid:c.id,esid:c.eventSubscriptionId,n:d.EventName,attrs:d.EventAttributes,sdk:d.SDKVersion,dt:d.EventDataType,et:d.EventCategory,dbg:d.Debug,ct:d.Timestamp,eec:d.ExpandedEventCount,dp:d.DataPlan},a._Helpers.getFeatureFlag(Constants.FeatureFlags.ReportBatching)?(f.push(e),a._Forwarders.setForwarderStatsQueue(f)):b.sendSingleForwardingStatsToServer(e));};}

var slugify = createCommonjsModule(function (module, exports) {
(function (name, root, factory) {
  {
    module.exports = factory();
    module.exports['default'] = factory();
  }
}('slugify', commonjsGlobal, function () {
  var charMap = JSON.parse('{"$":"dollar","%":"percent","&":"and","<":"less",">":"greater","|":"or","¢":"cent","£":"pound","¤":"currency","¥":"yen","©":"(c)","ª":"a","®":"(r)","º":"o","À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Æ":"AE","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ð":"D","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","Þ":"TH","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","æ":"ae","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ð":"d","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","þ":"th","ÿ":"y","Ā":"A","ā":"a","Ă":"A","ă":"a","Ą":"A","ą":"a","Ć":"C","ć":"c","Č":"C","č":"c","Ď":"D","ď":"d","Đ":"DJ","đ":"dj","Ē":"E","ē":"e","Ė":"E","ė":"e","Ę":"e","ę":"e","Ě":"E","ě":"e","Ğ":"G","ğ":"g","Ģ":"G","ģ":"g","Ĩ":"I","ĩ":"i","Ī":"i","ī":"i","Į":"I","į":"i","İ":"I","ı":"i","Ķ":"k","ķ":"k","Ļ":"L","ļ":"l","Ľ":"L","ľ":"l","Ł":"L","ł":"l","Ń":"N","ń":"n","Ņ":"N","ņ":"n","Ň":"N","ň":"n","Ő":"O","ő":"o","Œ":"OE","œ":"oe","Ŕ":"R","ŕ":"r","Ř":"R","ř":"r","Ś":"S","ś":"s","Ş":"S","ş":"s","Š":"S","š":"s","Ţ":"T","ţ":"t","Ť":"T","ť":"t","Ũ":"U","ũ":"u","Ū":"u","ū":"u","Ů":"U","ů":"u","Ű":"U","ű":"u","Ų":"U","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","ź":"z","Ż":"Z","ż":"z","Ž":"Z","ž":"z","ƒ":"f","Ơ":"O","ơ":"o","Ư":"U","ư":"u","ǈ":"LJ","ǉ":"lj","ǋ":"NJ","ǌ":"nj","Ș":"S","ș":"s","Ț":"T","ț":"t","˚":"o","Ά":"A","Έ":"E","Ή":"H","Ί":"I","Ό":"O","Ύ":"Y","Ώ":"W","ΐ":"i","Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"H","Θ":"8","Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"3","Ο":"O","Π":"P","Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"F","Χ":"X","Ψ":"PS","Ω":"W","Ϊ":"I","Ϋ":"Y","ά":"a","έ":"e","ή":"h","ί":"i","ΰ":"y","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"h","θ":"8","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"3","ο":"o","π":"p","ρ":"r","ς":"s","σ":"s","τ":"t","υ":"y","φ":"f","χ":"x","ψ":"ps","ω":"w","ϊ":"i","ϋ":"y","ό":"o","ύ":"y","ώ":"w","Ё":"Yo","Ђ":"DJ","Є":"Ye","І":"I","Ї":"Yi","Ј":"J","Љ":"LJ","Њ":"NJ","Ћ":"C","Џ":"DZ","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"Zh","З":"Z","И":"I","Й":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Ch","Ш":"Sh","Щ":"Sh","Ъ":"U","Ы":"Y","Ь":"","Э":"E","Ю":"Yu","Я":"Ya","а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sh","ъ":"u","ы":"y","ь":"","э":"e","ю":"yu","я":"ya","ё":"yo","ђ":"dj","є":"ye","і":"i","ї":"yi","ј":"j","љ":"lj","њ":"nj","ћ":"c","ѝ":"u","џ":"dz","Ґ":"G","ґ":"g","Ғ":"GH","ғ":"gh","Қ":"KH","қ":"kh","Ң":"NG","ң":"ng","Ү":"UE","ү":"ue","Ұ":"U","ұ":"u","Һ":"H","һ":"h","Ә":"AE","ә":"ae","Ө":"OE","ө":"oe","฿":"baht","ა":"a","ბ":"b","გ":"g","დ":"d","ე":"e","ვ":"v","ზ":"z","თ":"t","ი":"i","კ":"k","ლ":"l","მ":"m","ნ":"n","ო":"o","პ":"p","ჟ":"zh","რ":"r","ს":"s","ტ":"t","უ":"u","ფ":"f","ქ":"k","ღ":"gh","ყ":"q","შ":"sh","ჩ":"ch","ც":"ts","ძ":"dz","წ":"ts","ჭ":"ch","ხ":"kh","ჯ":"j","ჰ":"h","Ẁ":"W","ẁ":"w","Ẃ":"W","ẃ":"w","Ẅ":"W","ẅ":"w","ẞ":"SS","Ạ":"A","ạ":"a","Ả":"A","ả":"a","Ấ":"A","ấ":"a","Ầ":"A","ầ":"a","Ẩ":"A","ẩ":"a","Ẫ":"A","ẫ":"a","Ậ":"A","ậ":"a","Ắ":"A","ắ":"a","Ằ":"A","ằ":"a","Ẳ":"A","ẳ":"a","Ẵ":"A","ẵ":"a","Ặ":"A","ặ":"a","Ẹ":"E","ẹ":"e","Ẻ":"E","ẻ":"e","Ẽ":"E","ẽ":"e","Ế":"E","ế":"e","Ề":"E","ề":"e","Ể":"E","ể":"e","Ễ":"E","ễ":"e","Ệ":"E","ệ":"e","Ỉ":"I","ỉ":"i","Ị":"I","ị":"i","Ọ":"O","ọ":"o","Ỏ":"O","ỏ":"o","Ố":"O","ố":"o","Ồ":"O","ồ":"o","Ổ":"O","ổ":"o","Ỗ":"O","ỗ":"o","Ộ":"O","ộ":"o","Ớ":"O","ớ":"o","Ờ":"O","ờ":"o","Ở":"O","ở":"o","Ỡ":"O","ỡ":"o","Ợ":"O","ợ":"o","Ụ":"U","ụ":"u","Ủ":"U","ủ":"u","Ứ":"U","ứ":"u","Ừ":"U","ừ":"u","Ử":"U","ử":"u","Ữ":"U","ữ":"u","Ự":"U","ự":"u","Ỳ":"Y","ỳ":"y","Ỵ":"Y","ỵ":"y","Ỷ":"Y","ỷ":"y","Ỹ":"Y","ỹ":"y","‘":"\'","’":"\'","“":"\\\"","”":"\\\"","†":"+","•":"*","…":"...","₠":"ecu","₢":"cruzeiro","₣":"french franc","₤":"lira","₥":"mill","₦":"naira","₧":"peseta","₨":"rupee","₩":"won","₪":"new shequel","₫":"dong","€":"euro","₭":"kip","₮":"tugrik","₯":"drachma","₰":"penny","₱":"peso","₲":"guarani","₳":"austral","₴":"hryvnia","₵":"cedi","₸":"kazakhstani tenge","₹":"indian rupee","₽":"russian ruble","₿":"bitcoin","℠":"sm","™":"tm","∂":"d","∆":"delta","∑":"sum","∞":"infinity","♥":"love","元":"yuan","円":"yen","﷼":"rial"}');
  var locales = JSON.parse('{"vi":{"Đ":"D","đ":"d"}}');

  function replace (string, options) {
    if (typeof string !== 'string') {
      throw new Error('slugify: string argument expected')
    }

    options = (typeof options === 'string')
      ? { replacement: options }
      : options || {};

    var locale = locales[options.locale] || {};

    var slug = string.split('')
      .reduce(function (result, ch) {
        return result + (locale[ch] || charMap[ch] || ch)
          // allowed
          .replace(options.remove || /[^\w\s$*_+~.()'"!\-:@]/g, '')
      }, '')
      // trim leading/trailing spaces
      .trim()
      // convert spaces
      .replace(/[-\s]+/g, options.replacement || '-');

    return options.lower ? slug.toLowerCase() : slug
  }

  replace.extend = function (customMap) {
    for (var key in customMap) {
      charMap[key] = customMap[key];
    }
  };

  return replace
}));
});

var StorageNames=Constants.StorageNames,pluses=/\+/g;function Helpers(a){function b(b){var a;return window.crypto&&window.crypto.getRandomValues&&(a=window.crypto.getRandomValues(new Uint8Array(1))),a?(b^a[0]%16>>b/4).toString(16):(b^16*Math.random()>>b/4).toString(16)}var c=this;/**
     * Returns a value between 1-100 inclusive.
     */ // Standalone version of jQuery.extend, from https://github.com/dansdom/extend
this.canLog=function(){return !!(a._Store.isEnabled&&(a._Store.devToken||a._Store.webviewBridgeEnabled))},this.returnConvertedBoolean=function(a){return "false"!==a&&"0"!==a&&!!a},this.getFeatureFlag=function(b){return a._Store.SDKConfig.flags.hasOwnProperty(b)?a._Store.SDKConfig.flags[b]:null},this.getRampNumber=function(a){if(!a)return 100;var b=c.generateHash(a);return Math.abs(b%100)+1},this.invokeCallback=function(b,d,e,f,g){b||a.Logger.warning("There is no callback provided");try{c.Validators.isFunction(b)&&b({httpCode:d,body:e,getUser:function getUser(){return f?f:a.Identity.getCurrentUser()},getPreviousUser:function getPreviousUser(){if(!g){var b=a.Identity.getUsers(),c=b.shift(),d=f||a.Identity.getCurrentUser();return c&&d&&c.getMPID()===d.getMPID()&&(c=b.shift()),c||null}return a.Identity.getUser(g)}});}catch(b){a.Logger.error("There was an error with your callback: "+b);}},this.invokeAliasCallback=function(b,d,e){b||a.Logger.warning("There is no callback provided");try{if(c.Validators.isFunction(b)){var f={httpCode:d};e&&(f.message=e),b(f);}}catch(b){a.Logger.error("There was an error with your callback: "+b);}},this.extend=function(){var a,b,d,e,f,g,h=arguments[0]||{},j=1,k=arguments.length,l=!1,// helper which replicates the jquery internal functions
m={hasOwn:Object.prototype.hasOwnProperty,class2type:{},type:function type(a){return null==a?a+"":m.class2type[Object.prototype.toString.call(a)]||"object"},isPlainObject:function isPlainObject(a){if(!a||"object"!==m.type(a)||a.nodeType||m.isWindow(a))return !1;try{if(a.constructor&&!m.hasOwn.call(a,"constructor")&&!m.hasOwn.call(a.constructor.prototype,"isPrototypeOf"))return !1}catch(a){return !1}for(var b in a);// eslint-disable-line no-empty
return b===void 0||m.hasOwn.call(a,b)},isArray:Array.isArray||function(a){return "array"===m.type(a)},isFunction:function isFunction(a){return "function"===m.type(a)},isWindow:function isWindow(a){return null!=a&&a==a.window}};// end of objectHelper
// Handle a deep copy situation
for("boolean"==typeof h&&(l=h,h=arguments[1]||{},j=2),"object"===_typeof_1(h)||m.isFunction(h)||(h={}),k===j&&(h=this,--j);j<k;j++)// Only deal with non-null/undefined values
if(null!=(a=arguments[j]))// Extend the base object
for(b in a)// Prevent never-ending loop
(d=h[b],e=a[b],h!==e)&&(l&&e&&(m.isPlainObject(e)||(f=m.isArray(e)))?(f?(f=!1,g=d&&m.isArray(d)?d:[]):g=d&&m.isPlainObject(d)?d:{},h[b]=c.extend(l,g,e)):void 0!==e&&(h[b]=e));// Recurse if we're merging plain objects or arrays
// Return the modified object
return h},this.isObject=function(a){var b=Object.prototype.toString.call(a);return "[object Object]"===b||"[object Error]"===b},this.inArray=function(a,b){var c=0;if(Array.prototype.indexOf)return 0<=a.indexOf(b,0);for(var d=a.length;c<d;c++)if(c in a&&a[c]===b)return !0},this.createServiceUrl=function(b,c){var d,e=window.mParticle&&a._Store.SDKConfig.forceHttps?"https://":window.location.protocol+"//";return d=a._Store.SDKConfig.forceHttps?"https://"+b:e+b,c&&(d+=c),d},this.createXHR=function(b){var c;try{c=new window.XMLHttpRequest;}catch(b){a.Logger.error("Error creating XMLHttpRequest object.");}if(c&&b&&"withCredentials"in c)c.onreadystatechange=b;else if("undefined"!=typeof window.XDomainRequest){a.Logger.verbose("Creating XDomainRequest object");try{c=new window.XDomainRequest,c.onload=b;}catch(b){a.Logger.error("Error creating XDomainRequest object");}}return c},this.generateUniqueId=function(d){// https://gist.github.com/jed/982883
// Added support for crypto for better random
return d// if the placeholder was passed, return
?b(d)// a random number
:// or otherwise a concatenated string:
"10000000-1000-4000-8000-100000000000".// -100000000000,
replace(// replacing
/[018]/g,// zeroes, ones, and eights with
c.generateUniqueId// random hex digits
)},this.filterUserIdentities=function(a,b){var d=[];if(a&&Object.keys(a).length)for(var e in a)if(a.hasOwnProperty(e)){var f=Types.IdentityType.getIdentityType(e);if(!c.inArray(b,f)){var g={Type:f,Identity:a[e]};f===Types.IdentityType.CustomerId?d.unshift(g):d.push(g);}}return d},this.filterUserIdentitiesForForwarders=function(a,b){var d={};if(a&&Object.keys(a).length)for(var e in a)if(a.hasOwnProperty(e)){var f=Types.IdentityType.getIdentityType(e);c.inArray(b,f)||(d[e]=a[e]);}return d},this.filterUserAttributes=function(a,b){var d={};if(a&&Object.keys(a).length)for(var e in a)if(a.hasOwnProperty(e)){var f=c.generateHash(e);c.inArray(b,f)||(d[e]=a[e]);}return d},this.findKeyInObject=function(a,b){if(b&&a)for(var c in a)if(a.hasOwnProperty(c)&&c.toLowerCase()===b.toLowerCase())return c;return null},this.decoded=function(a){return decodeURIComponent(a.replace(pluses," "))},this.converted=function(a){return 0===a.indexOf("\"")&&(a=a.slice(1,-1).replace(/\\"/g,"\"").replace(/\\\\/g,"\\")),a},this.isEventType=function(a){for(var b in Types.EventType)if(Types.EventType.hasOwnProperty(b)&&Types.EventType[b]===a)return !0;return !1},this.parseNumber=function(a){if(isNaN(a)||!isFinite(a))return 0;var b=parseFloat(a);return isNaN(b)?0:b},this.parseStringOrNumber=function(a){return c.Validators.isStringOrNumber(a)?a:null},this.generateHash=function(a){var b,c=0,d=0;if(void 0===a||null===a)return 0;if(a=a.toString().toLowerCase(),Array.prototype.reduce)return a.split("").reduce(function(c,d){return c=(c<<5)-c+d.charCodeAt(0),c&c},0);if(0===a.length)return c;for(d=0;d<a.length;d++)b=a.charCodeAt(d),c=(c<<5)-c+b,c&=c;return c},this.sanitizeAttributes=function(b){if(!b||!c.isObject(b))return null;var d={};for(var e in b)// Make sure that attribute values are not objects or arrays, which are not valid
b.hasOwnProperty(e)&&c.Validators.isValidAttributeValue(b[e])?d[e]=b[e]:a.Logger.warning("The corresponding attribute value of "+e+" must be a string, number, boolean, or null.");return d},this.Validators={isValidAttributeValue:function isValidAttributeValue(a){return a!==void 0&&!c.isObject(a)&&!Array.isArray(a)},// Neither null nor undefined can be a valid Key
isValidKeyValue:function isValidKeyValue(a){return !(!a||c.isObject(a)||Array.isArray(a))},isStringOrNumber:function isStringOrNumber(a){return "string"==typeof a||"number"==typeof a},isNumber:function isNumber(a){return "number"==typeof a},isFunction:function isFunction(a){return "function"==typeof a},validateIdentities:function validateIdentities(b,d){var e={userIdentities:1,onUserAlias:1,copyUserAttributes:1};if(b){if("modify"===d&&(c.isObject(b.userIdentities)&&!Object.keys(b.userIdentities).length||!c.isObject(b.userIdentities)))return {valid:!1,error:Constants.Messages.ValidationMessages.ModifyIdentityRequestUserIdentitiesPresent};for(var f in b)if(b.hasOwnProperty(f)){if(!e[f])return {valid:!1,error:Constants.Messages.ValidationMessages.IdentityRequesetInvalidKey};if("onUserAlias"===f&&!a._Helpers.Validators.isFunction(b[f]))return {valid:!1,error:Constants.Messages.ValidationMessages.OnUserAliasType+_typeof_1(b[f])}}if(0===Object.keys(b).length)return {valid:!0};// identityApiData.userIdentities can't be undefined
if(void 0===b.userIdentities)return {valid:!1,error:Constants.Messages.ValidationMessages.UserIdentities};// identityApiData.userIdentities can be null, but if it isn't null or undefined (above conditional), it must be an object
if(null!==b.userIdentities&&!c.isObject(b.userIdentities))return {valid:!1,error:Constants.Messages.ValidationMessages.UserIdentities};if(c.isObject(b.userIdentities)&&Object.keys(b.userIdentities).length)for(var g in b.userIdentities)if(b.userIdentities.hasOwnProperty(g)){if(!1===Types.IdentityType.getIdentityType(g))return {valid:!1,error:Constants.Messages.ValidationMessages.UserIdentitiesInvalidKey};if("string"!=typeof b.userIdentities[g]&&null!==b.userIdentities[g])return {valid:!1,error:Constants.Messages.ValidationMessages.UserIdentitiesInvalidValues}}}return {valid:!0}}},this.isDelayedByIntegration=function(b,c,d){if(d-c>a._Store.SDKConfig.integrationDelayTimeout)return !1;for(var e in b){if(!0===b[e])return !0;continue}return !1},this.createMainStorageName=function(a){return a?StorageNames.currentStorageName+"_"+a:StorageNames.currentStorageName},this.createProductStorageName=function(a){return a?StorageNames.currentStorageProductsName+"_"+a:StorageNames.currentStorageProductsName},this.isSlug=function(a){return a===slugify(a)};}

var Messages$1=Constants.Messages,androidBridgeNameBase="mParticleAndroid",iosBridgeNameBase="mParticle";function NativeSdkHelpers(a){var b=this;this.isBridgeV2Available=function(a){if(!a)return !1;var b=iosBridgeNameBase+"_"+a+"_v2";// iOS v2 bridge
return !!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.hasOwnProperty(b))||!!(window.mParticle&&window.mParticle.uiwebviewBridgeName&&window.mParticle.uiwebviewBridgeName===b)||!!window.hasOwnProperty(androidBridgeNameBase+"_"+a+"_v2");// other iOS v2 bridge
// TODO: what to do about people setting things on mParticle itself?
// android
},this.isWebviewEnabled=function(c,d){return a._Store.bridgeV2Available=b.isBridgeV2Available(c),a._Store.bridgeV1Available=b.isBridgeV1Available(),2===d?a._Store.bridgeV2Available:!(window.mParticle&&window.mParticle.uiwebviewBridgeName&&window.mParticle.uiwebviewBridgeName!==iosBridgeNameBase+"_"+c+"_v2")&&!!(2>d)&&(a._Store.bridgeV2Available||a._Store.bridgeV1Available);// iOS BridgeV1 can be available via mParticle.isIOS, but return false if uiwebviewBridgeName doesn't match requiredWebviewBridgeName
},this.isBridgeV1Available=function(){return !!(a._Store.SDKConfig.useNativeSdk||window.mParticleAndroid||a._Store.SDKConfig.isIOS)},this.sendToNative=function(c,d){return a._Store.bridgeV2Available&&2===a._Store.SDKConfig.minWebviewBridgeVersion?void b.sendViaBridgeV2(c,d,a._Store.SDKConfig.requiredWebviewBridgeName):a._Store.bridgeV2Available&&2>a._Store.SDKConfig.minWebviewBridgeVersion?void b.sendViaBridgeV2(c,d,a._Store.SDKConfig.requiredWebviewBridgeName):a._Store.bridgeV1Available&&2>a._Store.SDKConfig.minWebviewBridgeVersion?void b.sendViaBridgeV1(c,d):void 0},this.sendViaBridgeV1=function(c,d){window.mParticleAndroid&&window.mParticleAndroid.hasOwnProperty(c)?(a.Logger.verbose(Messages$1.InformationMessages.SendAndroid+c),window.mParticleAndroid[c](d)):a._Store.SDKConfig.isIOS&&(a.Logger.verbose(Messages$1.InformationMessages.SendIOS+c),b.sendViaIframeToIOS(c,d));},this.sendViaIframeToIOS=function(a,b){var c=document.createElement("IFRAME");c.setAttribute("src","mp-sdk://"+a+"/"+encodeURIComponent(b)),document.documentElement.appendChild(c),c.parentNode.removeChild(c);},this.sendViaBridgeV2=function(c,d,e){if(e){var f,g,h=window[androidBridgeNameBase+"_"+e+"_v2"],i=iosBridgeNameBase+"_"+e+"_v2";return window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers[i]&&(f=window.webkit.messageHandlers[i]),a.uiwebviewBridgeName===i&&(g=a[i]),h&&h.hasOwnProperty(c)?(a.Logger.verbose(Messages$1.InformationMessages.SendAndroid+c),void h[c](d)):void(f?(a.Logger.verbose(Messages$1.InformationMessages.SendIOS+c),f.postMessage(JSON.stringify({path:c,value:d?JSON.parse(d):null}))):g&&(a.Logger.verbose(Messages$1.InformationMessages.SendIOS+c),b.sendViaIframeToIOS(c,d)))}};}

var Messages$2=Constants.Messages;function cookieSyncManager(a){var b=this;this.attemptCookieSync=function(c,d){var e,f,g,h,i;d&&!a._Store.webviewBridgeEnabled&&a._Store.pixelConfigurations.forEach(function(j){e={moduleId:j.moduleId,frequencyCap:j.frequencyCap,pixelUrl:b.replaceAmp(j.pixelUrl),redirectUrl:j.redirectUrl?b.replaceAmp(j.redirectUrl):null},g=b.replaceMPID(e.pixelUrl,d),h=e.redirectUrl?b.replaceMPID(e.redirectUrl,d):"",i=g+encodeURIComponent(h);var k=a._Persistence.getPersistence();return c&&c!==d?void(k&&k[d]&&(!k[d].csd&&(k[d].csd={}),b.performCookieSync(i,e.moduleId,d,k[d].csd))):void(k[d]&&(!k[d].csd&&(k[d].csd={}),f=k[d].csd[e.moduleId.toString()]?k[d].csd[e.moduleId.toString()]:null,f?new Date().getTime()>new Date(f).getTime()+24*(60*(1e3*(60*e.frequencyCap)))&&b.performCookieSync(i,e.moduleId,d,k[d].csd):b.performCookieSync(i,e.moduleId,d,k[d].csd)))});},this.replaceMPID=function(a,b){return a.replace("%%mpid%%",b)},this.replaceAmp=function(a){return a.replace(/&amp;/g,"&")},this.performCookieSync=function(b,c,d,e){var f=document.createElement("img");a.Logger.verbose(Messages$2.InformationMessages.CookieSync),f.src=b,e[c.toString()]=new Date().getTime(),a._Persistence.saveUserCookieSyncDatesToPersistence(d,e);};}

var Messages$3=Constants.Messages;function SessionManager(a){var b=this;this.initialize=function(){if(a._Store.sessionId){var c=6e4*a._Store.SDKConfig.sessionTimeout;if(new Date>new Date(a._Store.dateLastEventSent.getTime()+c))b.endSession(),b.startNewSession();else{var d=a._Persistence.getPersistence();d&&!d.cu&&(a.Identity.identify(a._Store.SDKConfig.identifyRequest,a._Store.SDKConfig.identityCallback),a._Store.identifyCalled=!0,a._Store.SDKConfig.identityCallback=null);}}else b.startNewSession();},this.getSession=function(){return a._Store.sessionId},this.startNewSession=function(){if(a.Logger.verbose(Messages$3.InformationMessages.StartingNewSession),a._Helpers.canLog()){a._Store.sessionId=a._Helpers.generateUniqueId().toUpperCase();var c=a.Identity.getCurrentUser(),d=c?c.getMPID():null;if(d&&(a._Store.currentSessionMPIDs=[d]),!a._Store.sessionStartDate){var e=new Date;a._Store.sessionStartDate=e,a._Store.dateLastEventSent=e;}b.setSessionTimer(),a._Store.identifyCalled||(a.Identity.identify(a._Store.SDKConfig.identifyRequest,a._Store.SDKConfig.identityCallback),a._Store.identifyCalled=!0,a._Store.SDKConfig.identityCallback=null),a._Events.logEvent({messageType:Types.MessageType.SessionStart});}else a.Logger.verbose(Messages$3.InformationMessages.AbandonStartSession);},this.endSession=function(c){if(a.Logger.verbose(Messages$3.InformationMessages.StartingEndSession),c)a._Events.logEvent({messageType:Types.MessageType.SessionEnd}),a._Store.sessionId=null,a._Store.dateLastEventSent=null,a._Store.sessionAttributes={},a._Persistence.update();else if(a._Helpers.canLog()){var d,e,f;if(e=a._Persistence.getPersistence(),!e)return;if(e.gs&&!e.gs.sid)return void a.Logger.verbose(Messages$3.InformationMessages.NoSessionToEnd);// sessionId is not equal to cookies.sid if cookies.sid is changed in another tab
if(e.gs.sid&&a._Store.sessionId!==e.gs.sid&&(a._Store.sessionId=e.gs.sid),e.gs&&e.gs.les){d=6e4*a._Store.SDKConfig.sessionTimeout;var g=new Date().getTime();f=g-e.gs.les,f<d?b.setSessionTimer():(a._Events.logEvent({messageType:Types.MessageType.SessionEnd}),a._Store.sessionId=null,a._Store.dateLastEventSent=null,a._Store.sessionStartDate=null,a._Store.sessionAttributes={},a._Persistence.update());}}else a.Logger.verbose(Messages$3.InformationMessages.AbandonEndSession);},this.setSessionTimer=function(){var c=6e4*a._Store.SDKConfig.sessionTimeout;a._Store.globalTimer=window.setTimeout(function(){b.endSession();},c);},this.resetSessionTimer=function(){a._Store.webviewBridgeEnabled||(!a._Store.sessionId&&b.startNewSession(),b.clearSessionTimeout(),b.setSessionTimer()),b.startNewSessionIfNeeded();},this.clearSessionTimeout=function(){clearTimeout(a._Store.globalTimer);},this.startNewSessionIfNeeded=function(){if(!a._Store.webviewBridgeEnabled){var c=a._Persistence.getPersistence();!a._Store.sessionId&&c&&(c.sid?a._Store.sessionId=c.sid:b.startNewSession());}};}

var Messages$4=Constants.Messages;function Ecommerce(a){var b=this;this.convertTransactionAttributesToProductAction=function(a,b){b.TransactionId=a.Id,b.Affiliation=a.Affiliation,b.CouponCode=a.CouponCode,b.TotalAmount=a.Revenue,b.ShippingAmount=a.Shipping,b.TaxAmount=a.Tax;},this.getProductActionEventName=function(a){switch(a){case Types.ProductActionType.AddToCart:return "AddToCart";case Types.ProductActionType.AddToWishlist:return "AddToWishlist";case Types.ProductActionType.Checkout:return "Checkout";case Types.ProductActionType.CheckoutOption:return "CheckoutOption";case Types.ProductActionType.Click:return "Click";case Types.ProductActionType.Purchase:return "Purchase";case Types.ProductActionType.Refund:return "Refund";case Types.ProductActionType.RemoveFromCart:return "RemoveFromCart";case Types.ProductActionType.RemoveFromWishlist:return "RemoveFromWishlist";case Types.ProductActionType.ViewDetail:return "ViewDetail";case Types.ProductActionType.Unknown:default:return "Unknown";}},this.getPromotionActionEventName=function(a){return a===Types.PromotionActionType.PromotionClick?"PromotionClick":a===Types.PromotionActionType.PromotionView?"PromotionView":"Unknown"},this.convertProductActionToEventType=function(b){return b===Types.ProductActionType.AddToCart?Types.CommerceEventType.ProductAddToCart:b===Types.ProductActionType.AddToWishlist?Types.CommerceEventType.ProductAddToWishlist:b===Types.ProductActionType.Checkout?Types.CommerceEventType.ProductCheckout:b===Types.ProductActionType.CheckoutOption?Types.CommerceEventType.ProductCheckoutOption:b===Types.ProductActionType.Click?Types.CommerceEventType.ProductClick:b===Types.ProductActionType.Purchase?Types.CommerceEventType.ProductPurchase:b===Types.ProductActionType.Refund?Types.CommerceEventType.ProductRefund:b===Types.ProductActionType.RemoveFromCart?Types.CommerceEventType.ProductRemoveFromCart:b===Types.ProductActionType.RemoveFromWishlist?Types.CommerceEventType.ProductRemoveFromWishlist:b===Types.ProductActionType.Unknown?Types.EventType.Unknown:b===Types.ProductActionType.ViewDetail?Types.CommerceEventType.ProductViewDetail:(a.Logger.error("Could not convert product action type "+b+" to event type"),null)},this.convertPromotionActionToEventType=function(b){return b===Types.PromotionActionType.PromotionClick?Types.CommerceEventType.PromotionClick:b===Types.PromotionActionType.PromotionView?Types.CommerceEventType.PromotionView:(a.Logger.error("Could not convert promotion action type "+b+" to event type"),null)},this.generateExpandedEcommerceName=function(a,b){return "eCommerce - "+a+" - "+(b?"Total":"Item")},this.extractProductAttributes=function(a,b){b.CouponCode&&(a["Coupon Code"]=b.CouponCode),b.Brand&&(a.Brand=b.Brand),b.Category&&(a.Category=b.Category),b.Name&&(a.Name=b.Name),b.Sku&&(a.Id=b.Sku),b.Price&&(a["Item Price"]=b.Price),b.Quantity&&(a.Quantity=b.Quantity),b.Position&&(a.Position=b.Position),b.Variant&&(a.Variant=b.Variant),a["Total Product Amount"]=b.TotalAmount||0;},this.extractTransactionId=function(a,b){b.TransactionId&&(a["Transaction Id"]=b.TransactionId);},this.extractActionAttributes=function(a,c){b.extractTransactionId(a,c),c.Affiliation&&(a.Affiliation=c.Affiliation),c.CouponCode&&(a["Coupon Code"]=c.CouponCode),c.TotalAmount&&(a["Total Amount"]=c.TotalAmount),c.ShippingAmount&&(a["Shipping Amount"]=c.ShippingAmount),c.TaxAmount&&(a["Tax Amount"]=c.TaxAmount),c.CheckoutOptions&&(a["Checkout Options"]=c.CheckoutOptions),c.CheckoutStep&&(a["Checkout Step"]=c.CheckoutStep);},this.extractPromotionAttributes=function(a,b){b.Id&&(a.Id=b.Id),b.Creative&&(a.Creative=b.Creative),b.Name&&(a.Name=b.Name),b.Position&&(a.Position=b.Position);},this.buildProductList=function(a,b){return b?Array.isArray(b)?b:[b]:a.ShoppingCart.ProductList},this.createProduct=function(b,c,d,e,f,g,h,i,j,k){return (k=a._Helpers.sanitizeAttributes(k),"string"!=typeof b)?(a.Logger.error("Name is required when creating a product"),null):a._Helpers.Validators.isStringOrNumber(c)?a._Helpers.Validators.isStringOrNumber(d)?(i&&!a._Helpers.Validators.isNumber(i)&&(a.Logger.error("Position must be a number, it will be set to null."),i=null),e||(e=1),{Name:b,Sku:c,Price:d,Quantity:e,Brand:h,Variant:f,Category:g,Position:i,CouponCode:j,TotalAmount:e*d,Attributes:k}):(a.Logger.error("Price is required when creating a product, and must be a string or a number"),null):(a.Logger.error("SKU is required when creating a product, and must be a string or a number"),null)},this.createPromotion=function(b,c,d,e){return a._Helpers.Validators.isStringOrNumber(b)?{Id:b,Creative:c,Name:d,Position:e}:(a.Logger.error(Messages$4.ErrorMessages.PromotionIdRequired),null)},this.createImpression=function(b,c){return "string"==typeof b?c?{Name:b,Product:c}:(a.Logger.error("Product is required when creating an impression."),null):(a.Logger.error("Name is required when creating an impression."),null)},this.createTransactionAttributes=function(b,c,d,e,f,g){return a._Helpers.Validators.isStringOrNumber(b)?{Id:b,Affiliation:c,CouponCode:d,Revenue:e,Shipping:f,Tax:g}:(a.Logger.error(Messages$4.ErrorMessages.TransactionIdRequired),null)},this.expandProductImpression=function(c){var d=[];return c.ProductImpressions?(c.ProductImpressions.forEach(function(e){e.ProductList&&e.ProductList.forEach(function(f){var g=a._Helpers.extend(!1,{},c.EventAttributes);if(f.Attributes)for(var h in f.Attributes)g[h]=f.Attributes[h];b.extractProductAttributes(g,f),e.ProductImpressionList&&(g["Product Impression List"]=e.ProductImpressionList);var i=a._ServerModel.createEventObject({messageType:Types.MessageType.PageEvent,name:b.generateExpandedEcommerceName("Impression"),data:g,eventType:Types.EventType.Transaction});d.push(i);});}),d):d},this.expandCommerceEvent=function(a){return a?b.expandProductAction(a).concat(b.expandPromotionAction(a)).concat(b.expandProductImpression(a)):null},this.expandPromotionAction=function(c){var d=[];if(!c.PromotionAction)return d;var e=c.PromotionAction.PromotionList;return e.forEach(function(e){var f=a._Helpers.extend(!1,{},c.EventAttributes);b.extractPromotionAttributes(f,e);var g=a._ServerModel.createEventObject({messageType:Types.MessageType.PageEvent,name:b.generateExpandedEcommerceName(Types.PromotionActionType.getExpansionName(c.PromotionAction.PromotionActionType)),data:f,eventType:Types.EventType.Transaction});d.push(g);}),d},this.expandProductAction=function(c){var d=[];if(!c.ProductAction)return d;var e=!1;if(c.ProductAction.ProductActionType===Types.ProductActionType.Purchase||c.ProductAction.ProductActionType===Types.ProductActionType.Refund){var f=a._Helpers.extend(!1,{},c.EventAttributes);f["Product Count"]=c.ProductAction.ProductList?c.ProductAction.ProductList.length:0,b.extractActionAttributes(f,c.ProductAction),c.CurrencyCode&&(f["Currency Code"]=c.CurrencyCode);var g=a._ServerModel.createEventObject({messageType:Types.MessageType.PageEvent,name:b.generateExpandedEcommerceName(Types.ProductActionType.getExpansionName(c.ProductAction.ProductActionType),!0),data:f,eventType:Types.EventType.Transaction});d.push(g);}else e=!0;var h=c.ProductAction.ProductList;return h?(h.forEach(function(f){var g=a._Helpers.extend(!1,c.EventAttributes,f.Attributes);e?b.extractActionAttributes(g,c.ProductAction):b.extractTransactionId(g,c.ProductAction),b.extractProductAttributes(g,f);var h=a._ServerModel.createEventObject({messageType:Types.MessageType.PageEvent,name:b.generateExpandedEcommerceName(Types.ProductActionType.getExpansionName(c.ProductAction.ProductActionType)),data:g,eventType:Types.EventType.Transaction});d.push(h);}),d):d},this.createCommerceEventObject=function(b){var c;return (a.Logger.verbose(Messages$4.InformationMessages.StartingLogCommerceEvent),a._Helpers.canLog())?(c=a._ServerModel.createEventObject({messageType:Types.MessageType.Commerce}),c.EventName="eCommerce - ",c.CurrencyCode=a._Store.currencyCode,c.ShoppingCart=[],c.CustomFlags=b,c):(a.Logger.verbose(Messages$4.InformationMessages.AbandonLogEvent),null)};}

function createSDKConfig(a){var b={};for(var c in Constants.DefaultConfig)Constants.DefaultConfig.hasOwnProperty(c)&&(b[c]=Constants.DefaultConfig[c]);if(a)for(c in a)a.hasOwnProperty(c)&&(b[c]=a[c]);for(c in Constants.DefaultUrls)b[c]=Constants.DefaultUrls[c];return b}function Store(a,b){var c={isEnabled:!0,sessionAttributes:{},currentSessionMPIDs:[],consentState:null,sessionId:null,isFirstRun:null,clientId:null,deviceId:null,devToken:null,migrationData:{},serverSettings:{},dateLastEventSent:null,sessionStartDate:null,currentPosition:null,isTracking:!1,watchPositionId:null,cartProducts:[],eventQueue:[],currencyCode:null,globalTimer:null,context:"",configurationLoaded:!1,identityCallInFlight:!1,SDKConfig:{},migratingToIDSyncCookies:!1,nonCurrentUserMPIDs:{},identifyCalled:!1,isLoggedIn:!1,cookieSyncDates:{},integrationAttributes:{},requireDelay:!0,isLocalStorageAvailable:null,storageName:null,prodStorageName:null,activeForwarders:[],kits:{},configuredForwarders:[],pixelConfigurations:[]};for(var d in c)this[d]=c[d];// Set configuration to default settings
if(this.integrationDelayTimeoutStart=Date.now(),this.SDKConfig=createSDKConfig(a),a){if(this.SDKConfig.isDevelopmentMode=!!a.hasOwnProperty("isDevelopmentMode")&&b._Helpers.returnConvertedBoolean(a.isDevelopmentMode),a.hasOwnProperty("v1SecureServiceUrl")&&(this.SDKConfig.v1SecureServiceUrl=a.v1SecureServiceUrl),a.hasOwnProperty("v2SecureServiceUrl")&&(this.SDKConfig.v2SecureServiceUrl=a.v2SecureServiceUrl),a.hasOwnProperty("v3SecureServiceUrl")&&(this.SDKConfig.v3SecureServiceUrl=a.v3SecureServiceUrl),a.hasOwnProperty("identityUrl")&&(this.SDKConfig.identityUrl=a.identityUrl),a.hasOwnProperty("aliasUrl")&&(this.SDKConfig.aliasUrl=a.aliasUrl),a.hasOwnProperty("configUrl")&&(this.SDKConfig.configUrl=a.configUrl),a.hasOwnProperty("logLevel")&&(this.SDKConfig.logLevel=a.logLevel),this.SDKConfig.useNativeSdk=!!a.hasOwnProperty("useNativeSdk")&&a.useNativeSdk,a.hasOwnProperty("kits")&&(this.SDKConfig.kits=a.kits),this.SDKConfig.isIOS=a.hasOwnProperty("isIOS")?a.isIOS:!!(window.mParticle&&window.mParticle.isIOS)&&window.mParticle.isIOS,this.SDKConfig.useCookieStorage=!!a.hasOwnProperty("useCookieStorage")&&a.useCookieStorage,this.SDKConfig.maxProducts=a.hasOwnProperty("maxProducts")?a.maxProducts:Constants.DefaultConfig.maxProducts,this.SDKConfig.maxCookieSize=a.hasOwnProperty("maxCookieSize")?a.maxCookieSize:Constants.DefaultConfig.maxCookieSize,a.hasOwnProperty("appName")&&(this.SDKConfig.appName=a.appName),this.SDKConfig.integrationDelayTimeout=a.hasOwnProperty("integrationDelayTimeout")?a.integrationDelayTimeout:Constants.DefaultConfig.integrationDelayTimeout,a.hasOwnProperty("identifyRequest")&&(this.SDKConfig.identifyRequest=a.identifyRequest),a.hasOwnProperty("identityCallback")){var e=a.identityCallback;b._Helpers.Validators.isFunction(e)?this.SDKConfig.identityCallback=a.identityCallback:b.Logger.warning("The optional callback must be a function. You tried entering a(n) "+_typeof_1(e)," . Callback not set. Please set your callback again.");}a.hasOwnProperty("appVersion")&&(this.SDKConfig.appVersion=a.appVersion),a.hasOwnProperty("appName")&&(this.SDKConfig.appName=a.appName),a.hasOwnProperty("sessionTimeout")&&(this.SDKConfig.sessionTimeout=a.sessionTimeout),a.hasOwnProperty("dataPlan")&&(this.SDKConfig.dataPlan={PlanVersion:null,PlanId:null},a.dataPlan.hasOwnProperty("planId")&&("string"==typeof a.dataPlan.planId?b._Helpers.isSlug(a.dataPlan.planId)?this.SDKConfig.dataPlan.PlanId=a.dataPlan.planId:b.Logger.error("Your data plan id must be in a slug format"):b.Logger.error("Your data plan id must be a string")),a.dataPlan.hasOwnProperty("planVersion")&&("number"==typeof a.dataPlan.planVersion?this.SDKConfig.dataPlan.PlanVersion=a.dataPlan.planVersion:b.Logger.error("Your data plan version must be a number"))),this.SDKConfig.forceHttps=!a.hasOwnProperty("forceHttps")||a.forceHttps,a.hasOwnProperty("customFlags")&&(this.SDKConfig.customFlags=a.customFlags),this.SDKConfig.minWebviewBridgeVersion=a.hasOwnProperty("minWebviewBridgeVersion")?a.minWebviewBridgeVersion:1,this.SDKConfig.aliasMaxWindow=a.hasOwnProperty("aliasMaxWindow")?a.aliasMaxWindow:Constants.DefaultConfig.aliasMaxWindow,a.hasOwnProperty("flags")||(this.SDKConfig.flags={}),this.SDKConfig.flags.hasOwnProperty(Constants.FeatureFlags.EventsV3)||(this.SDKConfig.flags[Constants.FeatureFlags.EventsV3]=0),this.SDKConfig.flags.hasOwnProperty(Constants.FeatureFlags.EventBatchingIntervalMillis)||(this.SDKConfig.flags[Constants.FeatureFlags.EventBatchingIntervalMillis]=Constants.DefaultConfig.uploadInterval),this.SDKConfig.flags.hasOwnProperty(Constants.FeatureFlags.ReportBatching)||(this.SDKConfig.flags[Constants.FeatureFlags.ReportBatching]=!1);}}

function Logger(a){var b=this,c=a.logLevel||"warning";this.logger=a.hasOwnProperty("logger")?a.logger:new ConsoleLogger,this.verbose=function(a){"none"!==c&&b.logger.verbose&&"verbose"===c&&b.logger.verbose(a);},this.warning=function(a){"none"!==c&&b.logger.warning&&("verbose"===c||"warning"===c)&&b.logger.warning(a);},this.error=function(a){"none"!==c&&b.logger.error&&b.logger.error(a);},this.setLogLevel=function(a){c=a;};}function ConsoleLogger(){this.verbose=function(a){window.console&&window.console.info&&window.console.info(a);},this.error=function(a){window.console&&window.console.error&&window.console.error(a);},this.warning=function(a){window.console&&window.console.warn&&window.console.warn(a);};}

var Base64$1=Polyfill.Base64,Messages$5=Constants.Messages,Base64CookieKeys=Constants.Base64CookieKeys,SDKv2NonMPIDCookieKeys=Constants.SDKv2NonMPIDCookieKeys,StorageNames$1=Constants.StorageNames;function _Persistence(a){function b(b){var c=a._Store;return b.gs.sid=c.sessionId,b.gs.ie=c.isEnabled,b.gs.sa=c.sessionAttributes,b.gs.ss=c.serverSettings,b.gs.dt=c.devToken,b.gs.les=c.dateLastEventSent?c.dateLastEventSent.getTime():null,b.gs.av=c.SDKConfig.appVersion,b.gs.cgid=c.clientId,b.gs.das=c.deviceId,b.gs.c=c.context,b.gs.ssd=c.sessionStartDate?c.sessionStartDate.getTime():null,b.gs.ia=c.integrationAttributes,b}function c(a){localStorage.removeItem(a);}function d(a,b,c){return f.encodePersistence(JSON.stringify(a))+";expires="+b+";path=/"+c}var f=this;// only used in persistence
/*  This function determines if a cookie is greater than the configured maxCookieSize.
        - If it is, we remove an MPID and its associated UI/UA/CSD from the cookie.
        - Once removed, check size, and repeat.
        - Never remove the currentUser's MPID from the cookie.

    MPID removal priority:
    1. If there are no currentSessionMPIDs, remove a random MPID from the the cookie.
    2. If there are currentSessionMPIDs:
        a. Remove at random MPIDs on the cookie that are not part of the currentSessionMPIDs
        b. Then remove MPIDs based on order in currentSessionMPIDs array, which
        stores MPIDs based on earliest login.
*/ // This function loops through the parts of a full hostname, attempting to set a cookie on that domain. It will set a cookie at the highest level possible.
// For example subdomain.domain.co.uk would try the following combinations:
// "co.uk" -> fail
// "domain.co.uk" -> success, return
// "subdomain.domain.co.uk" -> skipped, because already found
/**
     * set the "first seen" time for a user. the time will only be set once for a given
     * mpid after which subsequent calls will be ignored
     */ /**
     * returns the "last seen" time for a user. If the mpid represents the current user, the
     * return value will always be the current time, otherwise it will be to stored "last seen"
     * time
     */ // Forwarder Batching Code
this.useLocalStorage=function(){return !a._Store.SDKConfig.useCookieStorage&&a._Store.isLocalStorageAvailable},this.initializeStorage=function(){try{var b,c,d=f.getLocalStorage(),e=f.getCookie();// Determine if there is any data in cookies or localStorage to figure out if it is the first time the browser is loading mParticle
d||e?a._Store.isFirstRun=!1:(a._Store.isFirstRun=!0,a._Store.mpid=0),a._Store.isLocalStorageAvailable||(a._Store.SDKConfig.useCookieStorage=!0),a._Store.isLocalStorageAvailable?(b=window.localStorage,a._Store.SDKConfig.useCookieStorage?(d?(c=e?a._Helpers.extend(!1,d,e):d,b.removeItem(a._Store.storageName)):e&&(c=e),f.storeDataInMemory(c)):e?(c=d?a._Helpers.extend(!1,d,e):e,f.storeDataInMemory(c),f.expireCookies(a._Store.storageName)):f.storeDataInMemory(d)):f.storeDataInMemory(e);try{if(a._Store.isLocalStorageAvailable){var g=localStorage.getItem(a._Store.prodStorageName);if(g)var h=JSON.parse(Base64$1.decode(g));a._Store.mpid&&f.storeProductsInMemory(h,a._Store.mpid);}}catch(b){a._Store.isLocalStorageAvailable&&localStorage.removeItem(a._Store.prodStorageName),a._Store.cartProducts=[],a.Logger.error("Error loading products in initialization: "+b);}for(var i in c)c.hasOwnProperty(i)&&(SDKv2NonMPIDCookieKeys[i]||(a._Store.nonCurrentUserMPIDs[i]=c[i]));f.update();}catch(b){f.useLocalStorage()&&a._Store.isLocalStorageAvailable?localStorage.removeItem(a._Store.storageName):f.expireCookies(a._Store.storageName),a.Logger.error("Error initializing storage: "+b);}},this.update=function(){a._Store.webviewBridgeEnabled||(a._Store.SDKConfig.useCookieStorage&&f.setCookie(),f.setLocalStorage());},this.storeProductsInMemory=function(b,c){if(b)try{a._Store.cartProducts=b[c]&&b[c].cp?b[c].cp:[];}catch(b){a.Logger.error(Messages$5.ErrorMessages.CookieParseError);}},this.storeDataInMemory=function(b,c){try{b?(a._Store.mpid=c?c:b.cu||0,b.gs=b.gs||{},a._Store.sessionId=b.gs.sid||a._Store.sessionId,a._Store.isEnabled="undefined"==typeof b.gs.ie?a._Store.isEnabled:b.gs.ie,a._Store.sessionAttributes=b.gs.sa||a._Store.sessionAttributes,a._Store.serverSettings=b.gs.ss||a._Store.serverSettings,a._Store.devToken=a._Store.devToken||b.gs.dt,a._Store.SDKConfig.appVersion=a._Store.SDKConfig.appVersion||b.gs.av,a._Store.clientId=b.gs.cgid||a._Store.clientId||a._Helpers.generateUniqueId(),a._Store.deviceId=b.gs.das||a._Store.deviceId||a._Helpers.generateUniqueId(),a._Store.integrationAttributes=b.gs.ia||{},a._Store.context=b.gs.c||a._Store.context,a._Store.currentSessionMPIDs=b.gs.csm||a._Store.currentSessionMPIDs,a._Store.isLoggedIn=!0===b.l,b.gs.les&&(a._Store.dateLastEventSent=new Date(b.gs.les)),a._Store.sessionStartDate=b.gs.ssd?new Date(b.gs.ssd):new Date,b=c?b[c]:b[b.cu]):(a.Logger.verbose(Messages$5.InformationMessages.CookieNotFound),a._Store.clientId=a._Store.clientId||a._Helpers.generateUniqueId(),a._Store.deviceId=a._Store.deviceId||a._Helpers.generateUniqueId());}catch(b){a.Logger.error(Messages$5.ErrorMessages.CookieParseError);}},this.determineLocalStorageAvailability=function(a){var b;window.mParticle&&window.mParticle._forceNoLocalStorage&&(a=void 0);try{return a.setItem("mparticle","test"),b="test"===a.getItem("mparticle"),a.removeItem("mparticle"),b&&a}catch(a){return !1}},this.getUserProductsFromLS=function(b){if(!a._Store.isLocalStorageAvailable)return [];var c,d,e,f=localStorage.getItem(a._Store.prodStorageName);// if there is an MPID, we are retrieving the user's products, which is an array
if(f&&(c=Base64$1.decode(f)),b)try{return c&&(e=JSON.parse(c)),d=c&&e[b]&&e[b].cp&&Array.isArray(e[b].cp)?e[b].cp:[],d}catch(a){return []}else return []},this.getAllUserProductsFromLS=function(){var b,c,d=localStorage.getItem(a._Store.prodStorageName);d&&(b=Base64$1.decode(d));// returns an object with keys of MPID and values of array of products
try{c=JSON.parse(b);}catch(a){c={};}return c},this.setLocalStorage=function(){if(a._Store.isLocalStorageAvailable){var c=a._Store.storageName,d=f.getAllUserProductsFromLS(),e=f.getLocalStorage()||{},g=a.Identity.getCurrentUser(),h=g?g.getMPID():null,i={cp:d[h]?d[h].cp:[]};if(h){d=d||{},d[h]=i;try{window.localStorage.setItem(encodeURIComponent(a._Store.prodStorageName),Base64$1.encode(JSON.stringify(d)));}catch(b){a.Logger.error("Error with setting products on localStorage.");}}if(!a._Store.SDKConfig.useCookieStorage){e.gs=e.gs||{},e.l=a._Store.isLoggedIn?1:0,a._Store.sessionId&&(e.gs.csm=a._Store.currentSessionMPIDs),e.gs.ie=a._Store.isEnabled,h&&(e.cu=h),Object.keys(a._Store.nonCurrentUserMPIDs).length&&(e=a._Helpers.extend({},e,a._Store.nonCurrentUserMPIDs),a._Store.nonCurrentUserMPIDs={}),e=b(e);try{window.localStorage.setItem(encodeURIComponent(c),f.encodePersistence(JSON.stringify(e)));}catch(b){a.Logger.error("Error with setting localStorage item.");}}}},this.getLocalStorage=function(){if(!a._Store.isLocalStorageAvailable)return null;var b,c=a._Store.storageName,d=f.decodePersistence(window.localStorage.getItem(c)),e={};if(d)for(b in d=JSON.parse(d),d)d.hasOwnProperty(b)&&(e[b]=d[b]);return Object.keys(e).length?e:null},this.expireCookies=function(a){var b,c,d,e=new Date;d=f.getCookieDomain(),c=""===d?"":";domain="+d,e.setTime(e.getTime()-86400000),b="; expires="+e.toUTCString(),document.cookie=a+"="+b+"; path=/"+c;},this.getCookie=function(){var b,c,d,e,g,h=window.document.cookie.split("; "),j=a._Store.storageName,k=j?void 0:{};for(a.Logger.verbose(Messages$5.InformationMessages.CookieSearch),b=0,c=h.length;b<c;b++){if(d=h[b].split("="),e=a._Helpers.decoded(d.shift()),g=a._Helpers.decoded(d.join("=")),j&&j===e){k=a._Helpers.converted(g);break}j||(k[e]=a._Helpers.converted(g));}return k?(a.Logger.verbose(Messages$5.InformationMessages.CookieFound),JSON.parse(f.decodePersistence(k))):null},this.setCookie=function(){var c,d=a.Identity.getCurrentUser();d&&(c=d.getMPID());var e,g,h,i=new Date,j=a._Store.storageName,k=f.getCookie()||{},l=new Date(i.getTime()+1e3*(60*(60*(24*a._Store.SDKConfig.cookieExpiration)))).toGMTString();e=f.getCookieDomain(),g=""===e?"":";domain="+e,k.gs=k.gs||{},a._Store.sessionId&&(k.gs.csm=a._Store.currentSessionMPIDs),c&&(k.cu=c),k.l=a._Store.isLoggedIn?1:0,k=b(k),Object.keys(a._Store.nonCurrentUserMPIDs).length&&(k=a._Helpers.extend({},k,a._Store.nonCurrentUserMPIDs),a._Store.nonCurrentUserMPIDs={}),h=f.reduceAndEncodePersistence(k,l,g,a._Store.SDKConfig.maxCookieSize),a.Logger.verbose(Messages$5.InformationMessages.CookieSet),window.document.cookie=encodeURIComponent(j)+"="+h;},this.reduceAndEncodePersistence=function(b,c,e,f){var g,h=b.gs.csm?b.gs.csm:[];// Comment 1 above
if(!h.length)for(var j in b)b.hasOwnProperty(j)&&(g=d(b,c,e),g.length>f&&!SDKv2NonMPIDCookieKeys[j]&&j!==b.cu&&delete b[j]);else{// Comment 2 above - First create an object of all MPIDs on the cookie
var k={};for(var l in b)b.hasOwnProperty(l)&&(SDKv2NonMPIDCookieKeys[l]||l===b.cu||(k[l]=1));// Comment 2a above
if(Object.keys(k).length)for(var m in k)g=d(b,c,e),g.length>f&&k.hasOwnProperty(m)&&-1===h.indexOf(m)&&delete b[m];// Comment 2b above
for(var n,o=0;o<h.length&&(g=d(b,c,e),g.length>f);o++)n=h[o],b[n]?(a.Logger.verbose("Size of new encoded cookie is larger than maxCookieSize setting of "+f+". Removing from cookie the earliest logged in MPID containing: "+JSON.stringify(b[n],0,2)),delete b[n]):a.Logger.error("Unable to save MPID data to cookies because the resulting encoded cookie is larger than the maxCookieSize setting of "+f+". We recommend using a maxCookieSize of 1500.");}return g},this.findPrevCookiesBasedOnUI=function(b){var c,d=a._Persistence.getPersistence();if(b)for(var e in b.userIdentities)if(d&&Object.keys(d).length)for(var g in d)// any value in persistence that has an MPID key will be an MPID to search through
// other keys on the cookie are currentSessionMPIDs and currentMPID which should not be searched
if(d[g].mpid){var h=d[g].ui;for(var i in h)if(e===i&&b.userIdentities[e]===h[i]){c=g;break}}c&&f.storeDataInMemory(d,c);},this.encodePersistence=function(b){for(var c in b=JSON.parse(b),b.gs)b.gs.hasOwnProperty(c)&&(Base64CookieKeys[c]?b.gs[c]?Array.isArray(b.gs[c])&&b.gs[c].length||a._Helpers.isObject(b.gs[c])&&Object.keys(b.gs[c]).length?b.gs[c]=Base64$1.encode(JSON.stringify(b.gs[c])):delete b.gs[c]:delete b.gs[c]:"ie"===c?b.gs[c]=b.gs[c]?1:0:!b.gs[c]&&delete b.gs[c]);for(var d in b)if(b.hasOwnProperty(d)&&!SDKv2NonMPIDCookieKeys[d])for(c in b[d])b[d].hasOwnProperty(c)&&Base64CookieKeys[c]&&(a._Helpers.isObject(b[d][c])&&Object.keys(b[d][c]).length?b[d][c]=Base64$1.encode(JSON.stringify(b[d][c])):delete b[d][c]);return f.createCookieString(JSON.stringify(b))},this.decodePersistence=function(b){try{if(b){if(b=JSON.parse(f.revertCookieString(b)),a._Helpers.isObject(b)&&Object.keys(b).length){for(var c in b.gs)b.gs.hasOwnProperty(c)&&(Base64CookieKeys[c]?b.gs[c]=JSON.parse(Base64$1.decode(b.gs[c])):"ie"===c&&(b.gs[c]=!!b.gs[c]));for(var d in b)if(b.hasOwnProperty(d))if(!SDKv2NonMPIDCookieKeys[d])for(c in b[d])b[d].hasOwnProperty(c)&&Base64CookieKeys[c]&&b[d][c].length&&(b[d][c]=JSON.parse(Base64$1.decode(b[d][c])));else"l"===d&&(b[d]=!!b[d]);}return JSON.stringify(b)}}catch(b){a.Logger.error("Problem with decoding cookie",b);}},this.replaceCommasWithPipes=function(a){return a.replace(/,/g,"|")},this.replacePipesWithCommas=function(a){return a.replace(/\|/g,",")},this.replaceApostrophesWithQuotes=function(a){return a.replace(/\'/g,"\"")},this.replaceQuotesWithApostrophes=function(a){return a.replace(/\"/g,"'")},this.createCookieString=function(a){return f.replaceCommasWithPipes(f.replaceQuotesWithApostrophes(a))},this.revertCookieString=function(a){return f.replacePipesWithCommas(f.replaceApostrophesWithQuotes(a))},this.getCookieDomain=function(){if(a._Store.SDKConfig.cookieDomain)return a._Store.SDKConfig.cookieDomain;var b=f.getDomain(document,location.hostname);return ""===b?"":"."+b},this.getDomain=function(a,b){var c,d,e=b.split(".");for(c=e.length-1;0<=c;c--)if(d=e.slice(c).join("."),a.cookie="mptest=cookie;domain=."+d+";",-1<a.cookie.indexOf("mptest=cookie"))return a.cookie="mptest=;domain=."+d+";expires=Thu, 01 Jan 1970 00:00:01 GMT;",d;return ""},this.getUserIdentities=function(a){var b=f.getPersistence();return b&&b[a]&&b[a].ui?b[a].ui:{}},this.getAllUserAttributes=function(a){var b=f.getPersistence();return b&&b[a]&&b[a].ua?b[a].ua:{}},this.getCartProducts=function(b){var c,d=localStorage.getItem(a._Store.prodStorageName);return d&&(c=JSON.parse(Base64$1.decode(d)),c&&c[b]&&c[b].cp)?c[b].cp:[]},this.setCartProducts=function(b){if(a._Store.isLocalStorageAvailable)try{window.localStorage.setItem(encodeURIComponent(a._Store.prodStorageName),Base64$1.encode(JSON.stringify(b)));}catch(b){a.Logger.error("Error with setting products on localStorage.");}},this.saveUserIdentitiesToPersistence=function(a,b){if(b){var c=f.getPersistence();c&&(c[a]?c[a].ui=b:c[a]={ui:b},f.savePersistence(c));}},this.saveUserAttributesToPersistence=function(a,b){var c=f.getPersistence();b&&(c&&(c[a]?c[a].ui=b:c[a]={ui:b}),f.savePersistence(c));},this.saveUserCookieSyncDatesToPersistence=function(a,b){if(b){var c=f.getPersistence();c&&(c[a]?c[a].csd=b:c[a]={csd:b}),f.savePersistence(c);}},this.saveUserConsentStateToCookies=function(b,c){//it's currently not supported to set persistence
//for any MPID that's not the current one.
if(c||null===c){var d=f.getPersistence();d&&(d[b]?d[b].con=a._Consent.ConsentSerialization.toMinifiedJsonObject(c):d[b]={con:a._Consent.ConsentSerialization.toMinifiedJsonObject(c)},f.savePersistence(d));}},this.savePersistence=function(b){var c,d=f.encodePersistence(JSON.stringify(b)),e=new Date,g=a._Store.storageName,h=new Date(e.getTime()+1e3*(60*(60*(24*a._Store.SDKConfig.cookieExpiration)))).toGMTString(),i=f.getCookieDomain();if(c=""===i?"":";domain="+i,a._Store.SDKConfig.useCookieStorage){var j=f.reduceAndEncodePersistence(b,h,c,a._Store.SDKConfig.maxCookieSize);window.document.cookie=encodeURIComponent(g)+"="+j;}else a._Store.isLocalStorageAvailable&&localStorage.setItem(a._Store.storageName,d);},this.getPersistence=function(){var a=this.useLocalStorage()?this.getLocalStorage():this.getCookie();return a},this.getConsentState=function(b){var c=f.getPersistence();return c&&c[b]&&c[b].con?a._Consent.ConsentSerialization.fromMinifiedJsonObject(c[b].con):null},this.getFirstSeenTime=function(a){if(!a)return null;var b=f.getPersistence();return b&&b[a]&&b[a].fst?b[a].fst:null},this.setFirstSeenTime=function(a,b){if(a){b||(b=new Date().getTime());var c=f.getPersistence();c&&(!c[a]&&(c[a]={}),!c[a].fst&&(c[a].fst=b,f.savePersistence(c)));}},this.getLastSeenTime=function(b){if(!b)return null;if(b===a.Identity.getCurrentUser().getMPID())//if the mpid is the current user, its last seen time is the current time
return new Date().getTime();var c=f.getPersistence();return c&&c[b]&&c[b].lst?c[b].lst:null},this.setLastSeenTime=function(a,b){if(a){b||(b=new Date().getTime());var c=f.getPersistence();c&&c[a]&&(c[a].lst=b,f.savePersistence(c));}},this.getDeviceId=function(){return a._Store.deviceId},this.resetPersistence=function(){if(c(StorageNames$1.localStorageName),c(StorageNames$1.localStorageNameV3),c(StorageNames$1.localStorageNameV4),c(a._Store.prodStorageName),c(a._Store.storageName),c(StorageNames$1.localStorageProductsV4),f.expireCookies(StorageNames$1.cookieName),f.expireCookies(StorageNames$1.cookieNameV2),f.expireCookies(StorageNames$1.cookieNameV3),f.expireCookies(StorageNames$1.cookieNameV4),f.expireCookies(a._Store.prodStorageName),f.expireCookies(a._Store.storageName),mParticle._isTestEnv){c(a._Helpers.createMainStorageName("abcdef")),f.expireCookies(a._Helpers.createMainStorageName("abcdef")),c(a._Helpers.createProductStorageName("abcdef"));}},this.forwardingStatsBatches={uploadsTable:{},forwardingStatsEventQueue:[]};}

var Messages$6=Constants.Messages;function Events(a){var b=this;this.logEvent=function(b){if(a.Logger.verbose(Messages$6.InformationMessages.StartingLogEvent+": "+b.name),a._Helpers.canLog()){b.data&&(b.data=a._Helpers.sanitizeAttributes(b.data));var c=a._ServerModel.createEventObject(b);a._APIClient.sendEventToServer(c);}else a.Logger.verbose(Messages$6.InformationMessages.AbandonLogEvent);},this.startTracking=function(b){function c(c){// prevents callback from being fired multiple times
a._Store.currentPosition={lat:c.coords.latitude,lng:c.coords.longitude},e(b,c),b=null,a._Store.isTracking=!0;}function d(){// prevents callback from being fired multiple times
e(b),b=null,a._Store.isTracking=!1;}function e(b,c){if(b)try{c?b(c):b();}catch(b){a.Logger.error("Error invoking the callback passed to startTrackingLocation."),a.Logger.error(b);}}if(!a._Store.isTracking)"geolocation"in navigator&&(a._Store.watchPositionId=navigator.geolocation.watchPosition(c,d));else{var f={coords:{latitude:a._Store.currentPosition.lat,longitude:a._Store.currentPosition.lng}};e(b,f);}},this.stopTracking=function(){a._Store.isTracking&&(navigator.geolocation.clearWatch(a._Store.watchPositionId),a._Store.currentPosition=null,a._Store.isTracking=!1);},this.logOptOut=function(){a.Logger.verbose(Messages$6.InformationMessages.StartingLogOptOut);var b=a._ServerModel.createEventObject({messageType:Types.MessageType.OptOut,eventType:Types.EventType.Other});a._APIClient.sendEventToServer(b);},this.logAST=function(){b.logEvent({messageType:Types.MessageType.AppStateTransition});},this.logCheckoutEvent=function(c,d,e,f){var g=a._Ecommerce.createCommerceEventObject(f);g&&(g.EventName+=a._Ecommerce.getProductActionEventName(Types.ProductActionType.Checkout),g.EventCategory=Types.CommerceEventType.ProductCheckout,g.ProductAction={ProductActionType:Types.ProductActionType.Checkout,CheckoutStep:c,CheckoutOptions:d,ProductList:g.ShoppingCart.ProductList},b.logCommerceEvent(g,e));},this.logProductActionEvent=function(c,d,e,f){var g=a._Ecommerce.createCommerceEventObject(f);g&&(g.EventCategory=a._Ecommerce.convertProductActionToEventType(c),g.EventName+=a._Ecommerce.getProductActionEventName(c),g.ProductAction={ProductActionType:c,ProductList:Array.isArray(d)?d:[d]},b.logCommerceEvent(g,e));},this.logPurchaseEvent=function(c,d,e,f){var g=a._Ecommerce.createCommerceEventObject(f);g&&(g.EventName+=a._Ecommerce.getProductActionEventName(Types.ProductActionType.Purchase),g.EventCategory=Types.CommerceEventType.ProductPurchase,g.ProductAction={ProductActionType:Types.ProductActionType.Purchase},g.ProductAction.ProductList=a._Ecommerce.buildProductList(g,d),a._Ecommerce.convertTransactionAttributesToProductAction(c,g.ProductAction),b.logCommerceEvent(g,e));},this.logRefundEvent=function(c,d,e,f){if(!c)return void a.Logger.error(Messages$6.ErrorMessages.TransactionRequired);var g=a._Ecommerce.createCommerceEventObject(f);g&&(g.EventName+=a._Ecommerce.getProductActionEventName(Types.ProductActionType.Refund),g.EventCategory=Types.CommerceEventType.ProductRefund,g.ProductAction={ProductActionType:Types.ProductActionType.Refund},g.ProductAction.ProductList=a._Ecommerce.buildProductList(g,d),a._Ecommerce.convertTransactionAttributesToProductAction(c,g.ProductAction),b.logCommerceEvent(g,e));},this.logPromotionEvent=function(c,d,e,f){var g=a._Ecommerce.createCommerceEventObject(f);g&&(g.EventName+=a._Ecommerce.getPromotionActionEventName(c),g.EventCategory=a._Ecommerce.convertPromotionActionToEventType(c),g.PromotionAction={PromotionActionType:c,PromotionList:[d]},b.logCommerceEvent(g,e));},this.logImpressionEvent=function(c,d,e){var f=a._Ecommerce.createCommerceEventObject(e);f&&(f.EventName+="Impression",f.EventCategory=Types.CommerceEventType.ProductImpression,!Array.isArray(c)&&(c=[c]),f.ProductImpressions=[],c.forEach(function(a){f.ProductImpressions.push({ProductImpressionList:a.Name,ProductList:Array.isArray(a.Product)?a.Product:[a.Product]});}),b.logCommerceEvent(f,d));},this.logCommerceEvent=function(b,c){a.Logger.verbose(Messages$6.InformationMessages.StartingLogCommerceEvent),c=a._Helpers.sanitizeAttributes(c),a._Helpers.canLog()?(a._Store.webviewBridgeEnabled&&(b.ShoppingCart={}),c&&(b.EventAttributes=c),a._APIClient.sendEventToServer(b),a._Persistence.update()):a.Logger.verbose(Messages$6.InformationMessages.AbandonLogEvent);},this.addEventHandler=function(c,d,f,g,h){var j,k,e=[],l=function(c){var d=function(){j.href?window.location.href=j.href:j.submit&&j.submit();};a.Logger.verbose("DOM event triggered, handling event"),b.logEvent({messageType:Types.MessageType.PageEvent,name:"function"==typeof f?f(j):f,data:"function"==typeof g?g(j):g,eventType:h||Types.EventType.Other}),(j.href&&"_blank"!==j.target||j.submit)&&(c.preventDefault?c.preventDefault():c.returnValue=!1,setTimeout(d,a._Store.SDKConfig.timeout));};if(!d)return void a.Logger.error("Can't bind event, selector is required");// Handle a css selector string or a dom element
if("string"==typeof d?e=document.querySelectorAll(d):d.nodeType&&(e=[d]),e.length)for(a.Logger.verbose("Found "+e.length+" element"+(1<e.length?"s":"")+", attaching event handlers"),k=0;k<e.length;k++)j=e[k],j.addEventListener?j.addEventListener(c,l,!1):j.attachEvent?j.attachEvent("on"+c,l):j["on"+c]=l;else a.Logger.verbose("No elements found");};}

var StorageNames$2=Constants.StorageNames,Base64$2=Polyfill.Base64,CookiesGlobalSettingsKeys={das:1},MPIDKeys={ui:1};function Migrations(a){function b(){var b,d,f,g,j,k,m=window.document.cookie.split("; ");for(a.Logger.verbose(Constants.Messages.InformationMessages.CookieSearch),d=0,f=m.length;d<f;d++){//most recent version needs no migration
if(g=m[d].split("="),j=a._Helpers.decoded(g.shift()),k=a._Helpers.decoded(g.join("=")),j===a._Store.storageName)return;if(j===StorageNames$2.cookieNameV4)return c(k,StorageNames$2.cookieNameV4),void(a._Store.isLocalStorageAvailable&&e());// migration path for SDKv1CookiesV3, doesn't need to be encoded
if(j===StorageNames$2.cookieNameV3){b=h.convertSDKv1CookiesV3ToSDKv2CookiesV4(k),c(b,StorageNames$2.cookieNameV3);break}}}function c(b,c){var d,e,f=new Date,g=a._Persistence.getCookieDomain();d=new Date(f.getTime()+1e3*(60*(60*(24*StorageNames$2.CookieExpiration)))).toGMTString(),e=""===g?"":";domain="+g,a.Logger.verbose(Constants.Messages.InformationMessages.CookieSet),window.document.cookie=encodeURIComponent(a._Store.storageName)+"="+b+";expires="+d+";path=/"+e,a._Persistence.expireCookies(c),a._Store.migratingToIDSyncCookies=!0;}function d(b){try{var c={gs:{csm:[]}};for(var d in b=JSON.parse(b),b)b.hasOwnProperty(d)&&(CookiesGlobalSettingsKeys[d]?c.gs[d]=b[d]:"mpid"===d?c.cu=b[d]:b.mpid&&(c[b.mpid]=c[b.mpid]||{},MPIDKeys[d]&&(c[b.mpid][d]=b[d])));return JSON.stringify(c)}catch(b){a.Logger.error("Failed to restructure previous cookie into most current cookie schema");}}function e(){var b=StorageNames$2.localStorageProductsV4,c=localStorage.getItem(StorageNames$2.localStorageProductsV4);localStorage.setItem(a._Store.prodStorageName,c),localStorage.removeItem(b);}function f(b,c){if(a._Store.isLocalStorageAvailable){var d={};if(d[c]={},b.cp){try{d[c].cp=JSON.parse(Base64$2.decode(b.cp));}catch(a){d[c].cp=b.cp;}Array.isArray(d[c].cp)||(d[c].cp=[]);}localStorage.setItem(a._Store.prodStorageName,Base64$2.encode(JSON.stringify(d)));}}function g(){function b(b,c){try{window.localStorage.setItem(encodeURIComponent(a._Store.storageName),b);}catch(b){a.Logger.error("Error with setting localStorage item.");}window.localStorage.removeItem(encodeURIComponent(c));}var c,d,g,i,j=StorageNames$2.localStorageNameV3,k=StorageNames$2.localStorageNameV4,l=window.localStorage.getItem(a._Store.storageName);if(!l){if(d=window.localStorage.getItem(k),d)return b(d,k),void e();if(g=window.localStorage.getItem(j),g){// localStorage may contain only products, or the full persistence
// when there is an MPID on the cookie, it is the full persistence
if(a._Store.migratingToIDSyncCookies=!0,i=g.slice(),g=JSON.parse(a._Persistence.replacePipesWithCommas(a._Persistence.replaceApostrophesWithQuotes(g))),g.mpid)return g=JSON.parse(h.convertSDKv1CookiesV3ToSDKv2CookiesV4(i)),void b(JSON.stringify(g),j);// if no MPID, it is only the products
if((g.cp||g.pb)&&!g.mpid)return c=a._Persistence.getCookie(),c?(f(g,c.cu),void localStorage.removeItem(StorageNames$2.localStorageNameV3)):void localStorage.removeItem(StorageNames$2.localStorageNameV3)}}}var h=this;//  if there is a cookie or localStorage:
//  1. determine which version it is ('mprtcl-api', 'mprtcl-v2', 'mprtcl-v3', 'mprtcl-v4')
//  2. return if 'mprtcl-v4', otherwise migrate to mprtclv4 schema
// 3. if 'mprtcl-api', could be JSSDKv2 or JSSDKv1. JSSDKv2 cookie has a 'globalSettings' key on it
this.migrate=function(){try{b();}catch(b){a._Persistence.expireCookies(StorageNames$2.cookieNameV3),a._Persistence.expireCookies(StorageNames$2.cookieNameV4),a.Logger.error("Error migrating cookie: "+b);}if(a._Store.isLocalStorageAvailable)try{g();}catch(b){localStorage.removeItem(StorageNames$2.localStorageNameV3),localStorage.removeItem(StorageNames$2.localStorageNameV4),a.Logger.error("Error migrating localStorage: "+b);}},this.convertSDKv1CookiesV3ToSDKv2CookiesV4=function(b){b=a._Persistence.replacePipesWithCommas(a._Persistence.replaceApostrophesWithQuotes(b));var c=JSON.parse(b),e=JSON.parse(d(b));return c.mpid&&(e.gs.csm.push(c.mpid),e.gs.csm=Base64$2.encode(JSON.stringify(e.gs.csm)),f(c,c.mpid)),JSON.stringify(e)};}

function filteredMparticleUser(a,b,c){var d=this;return {getUserIdentities:function getUserIdentities(){var d={},e=c._Persistence.getUserIdentities(a);for(var f in e)e.hasOwnProperty(f)&&(d[Types.IdentityType.getIdentityName(c._Helpers.parseNumber(f))]=e[f]);return d=c._Helpers.filterUserIdentitiesForForwarders(d,b.userIdentityFilters),{userIdentities:d}},getMPID:function getMPID(){return a},getUserAttributesLists:function getUserAttributesLists(a){var b,e={};for(var f in b=d.getAllUserAttributes(),b)b.hasOwnProperty(f)&&Array.isArray(b[f])&&(e[f]=b[f].slice());return e=c._Helpers.filterUserAttributes(e,a.userAttributeFilters),e},getAllUserAttributes:function getAllUserAttributes(){var d={},e=c._Persistence.getAllUserAttributes(a);if(e)for(var f in e)e.hasOwnProperty(f)&&(d[f]=Array.isArray(e[f])?e[f].slice():e[f]);return d=c._Helpers.filterUserAttributes(d,b.userAttributeFilters),d}}}

function Forwarders(a){var b=this;this.initForwarders=function(c,d){var e=a.Identity.getCurrentUser();!a._Store.webviewBridgeEnabled&&a._Store.configuredForwarders&&(a._Store.configuredForwarders.sort(function(a,b){return a.settings.PriorityValue=a.settings.PriorityValue||0,b.settings.PriorityValue=b.settings.PriorityValue||0,-1*(a.settings.PriorityValue-b.settings.PriorityValue)}),a._Store.activeForwarders=a._Store.configuredForwarders.filter(function(f){if(!b.isEnabledForUserConsent(f.filteringConsentRuleValues,e))return !1;if(!b.isEnabledForUserAttributes(f.filteringUserAttributeValue,e))return !1;if(!b.isEnabledForUnknownUser(f.excludeAnonymousUser,e))return !1;var g=a._Helpers.filterUserIdentities(c,f.userIdentityFilters),h=a._Helpers.filterUserAttributes(e?e.getAllUserAttributes():{},f.userAttributeFilters);return f.initialized||(f.init(f.settings,d,!1,null,h,g,a._Store.SDKConfig.appVersion,a._Store.SDKConfig.appName,a._Store.SDKConfig.customFlags,a._Store.clientId),f.initialized=!0),!0}));},this.isEnabledForUserConsent=function(b,c){if(!b||!b.values||!b.values.length)return !0;if(!c)return !1;var d={},e=c.getConsentState();if(e){// the server hashes consent purposes in the following way:
// GDPR - '1' + purpose name
// CCPA - '2data_sale_opt_out' (there is only 1 purpose of data_sale_opt_out for CCPA)
var f=e.getGDPRConsentState();if(f)for(var g in f)f.hasOwnProperty(g)&&(i=a._Helpers.generateHash("1"+g).toString(),d[i]=f[g].Consented);var h=e.getCCPAConsentState();if(h){var i=a._Helpers.generateHash("2"+"data_sale_opt_out").toString();d[i]=h.Consented;}}var j=!1;return b.values.forEach(function(a){if(!j){var b=a.consentPurpose,c=a.hasConsented;d.hasOwnProperty(b)&&d[b]===c&&(j=!0);}}),b.includeOnMatch===j},this.isEnabledForUserAttributes=function(b,c){if(!b||!a._Helpers.isObject(b)||!Object.keys(b).length)return !0;var d,e,f;if(!c)return !1;f=c.getAllUserAttributes();var g=!1;try{if(f&&a._Helpers.isObject(f)&&Object.keys(f).length)for(var h in f)if(f.hasOwnProperty(h)&&(d=a._Helpers.generateHash(h).toString(),e=a._Helpers.generateHash(f[h]).toString(),d===b.userAttributeName&&e===b.userAttributeValue)){g=!0;break}return !b||b.includeOnMatch===g}catch(a){// in any error scenario, err on side of returning true and forwarding event
return !0}},this.isEnabledForUnknownUser=function(a,b){return !!(b&&b.isLoggedIn()||!a)},this.applyToForwarders=function(b,c){a._Store.activeForwarders.length&&a._Store.activeForwarders.forEach(function(d){var e=d[b];if(e)try{var f=d[b](c);f&&a.Logger.verbose(f);}catch(b){a.Logger.verbose(b);}});},this.sendEventToForwarders=function(b){var c,d,e,f=function(b,c){b.UserIdentities&&b.UserIdentities.length&&b.UserIdentities.forEach(function(d,e){a._Helpers.inArray(c,d.Type)&&(b.UserIdentities.splice(e,1),0<e&&e--);});},g=function(b,c){var d;if(c)for(var e in b.EventAttributes)b.EventAttributes.hasOwnProperty(e)&&(d=a._Helpers.generateHash(b.EventCategory+b.EventName+e),a._Helpers.inArray(c,d)&&delete b.EventAttributes[e]);},h=function(b,c){return !!(b&&b.length&&a._Helpers.inArray(b,c))},j=[Types.MessageType.PageEvent,Types.MessageType.PageView,Types.MessageType.Commerce];if(!a._Store.webviewBridgeEnabled&&a._Store.activeForwarders){d=a._Helpers.generateHash(b.EventCategory+b.EventName),e=a._Helpers.generateHash(b.EventCategory);for(var k=0;k<a._Store.activeForwarders.length;k++){// Check attribute forwarding rule. This rule allows users to only forward an event if a
// specific attribute exists and has a specific value. Alternatively, they can specify
// that an event not be forwarded if the specified attribute name and value exists.
// The two cases are controlled by the "includeOnMatch" boolean value.
// Supported message types for attribute forwarding rules are defined in the forwardingRuleMessageTypes array
if(-1<j.indexOf(b.EventDataType)&&a._Store.activeForwarders[k].filteringEventAttributeValue&&a._Store.activeForwarders[k].filteringEventAttributeValue.eventAttributeName&&a._Store.activeForwarders[k].filteringEventAttributeValue.eventAttributeValue){var l=null;// Attempt to find the attribute in the collection of event attributes
if(b.EventAttributes)for(var m in b.EventAttributes){var n;if(n=a._Helpers.generateHash(m).toString(),n===a._Store.activeForwarders[k].filteringEventAttributeValue.eventAttributeName&&(l={name:n,value:a._Helpers.generateHash(b.EventAttributes[m]).toString()}),l)break}var o=null!==l&&l.value===a._Store.activeForwarders[k].filteringEventAttributeValue.eventAttributeValue,p=!0===a._Store.activeForwarders[k].filteringEventAttributeValue.includeOnMatch?o:!o;if(!p)continue}// Clone the event object, as we could be sending different attributes to each forwarder
// Check event filtering rules
if(c={},c=a._Helpers.extend(!0,c,b),b.EventDataType===Types.MessageType.PageEvent&&(h(a._Store.activeForwarders[k].eventNameFilters,d)||h(a._Store.activeForwarders[k].eventTypeFilters,e)))continue;else if(b.EventDataType===Types.MessageType.Commerce&&h(a._Store.activeForwarders[k].eventTypeFilters,e))continue;else if(b.EventDataType===Types.MessageType.PageView&&h(a._Store.activeForwarders[k].screenNameFilters,d))continue;// Check attribute filtering rules
if(c.EventAttributes&&(b.EventDataType===Types.MessageType.PageEvent?g(c,a._Store.activeForwarders[k].attributeFilters):b.EventDataType===Types.MessageType.PageView&&g(c,a._Store.activeForwarders[k].pageViewAttributeFilters)),f(c,a._Store.activeForwarders[k].userIdentityFilters),c.UserAttributes=a._Helpers.filterUserAttributes(c.UserAttributes,a._Store.activeForwarders[k].userAttributeFilters),a.Logger.verbose("Sending message to forwarder: "+a._Store.activeForwarders[k].name),a._Store.activeForwarders[k].process){var q=a._Store.activeForwarders[k].process(c);q&&a.Logger.verbose(q);}}}},this.callSetUserAttributeOnForwarders=function(b,c){a._Store.activeForwarders.length&&a._Store.activeForwarders.forEach(function(d){if(d.setUserAttribute&&d.userAttributeFilters&&!a._Helpers.inArray(d.userAttributeFilters,a._Helpers.generateHash(b)))try{var e=d.setUserAttribute(b,c);e&&a.Logger.verbose(e);}catch(b){a.Logger.error(b);}});},this.setForwarderUserIdentities=function(b){a._Store.activeForwarders.forEach(function(c){var d=a._Helpers.filterUserIdentities(b,c.userIdentityFilters);c.setUserIdentity&&d.forEach(function(b){var d=c.setUserIdentity(b.Identity,b.Type);d&&a.Logger.verbose(d);});});},this.setForwarderOnUserIdentified=function(b){a._Store.activeForwarders.forEach(function(c){var d=filteredMparticleUser(b.getMPID(),c,a);if(c.onUserIdentified){var e=c.onUserIdentified(d);e&&a.Logger.verbose(e);}});},this.setForwarderOnIdentityComplete=function(b,c){var d;a._Store.activeForwarders.forEach(function(e){var f=filteredMparticleUser(b.getMPID(),e,a);"identify"===c?e.onIdentifyComplete&&(d=e.onIdentifyComplete(f),d&&a.Logger.verbose(d)):"login"===c?e.onLoginComplete&&(d=e.onLoginComplete(f),d&&a.Logger.verbose(d)):"logout"===c?e.onLogoutComplete&&(d=e.onLogoutComplete(f),d&&a.Logger.verbose(d)):"modify"==c&&e.onModifyComplete&&(d=e.onModifyComplete(f),d&&a.Logger.verbose(d));});},this.getForwarderStatsQueue=function(){return a._Persistence.forwardingStatsBatches.forwardingStatsEventQueue},this.setForwarderStatsQueue=function(b){a._Persistence.forwardingStatsBatches.forwardingStatsEventQueue=b;},this.configureForwarder=function(b){var c=null,d=b,e={};// if there are kits inside of mpInstance._Store.SDKConfig.kits, then mParticle is self hosted
for(var f in a._Helpers.isObject(a._Store.SDKConfig.kits)&&0<Object.keys(a._Store.SDKConfig.kits).length?e=a._Store.SDKConfig.kits:0<a._preInit.forwarderConstructors.length&&a._preInit.forwarderConstructors.forEach(function(a){e[a.name]=a;}),e)if(f===d.name&&(d.isDebug===a._Store.SDKConfig.isDevelopmentMode||d.isSandbox===a._Store.SDKConfig.isDevelopmentMode)){c=new e[f].constructor,c.id=d.moduleId,c.isSandbox=d.isDebug||d.isSandbox,c.hasSandbox="true"===d.hasDebugString,c.isVisible=d.isVisible,c.settings=d.settings,c.eventNameFilters=d.eventNameFilters,c.eventTypeFilters=d.eventTypeFilters,c.attributeFilters=d.attributeFilters,c.screenNameFilters=d.screenNameFilters,c.screenNameFilters=d.screenNameFilters,c.pageViewAttributeFilters=d.pageViewAttributeFilters,c.userIdentityFilters=d.userIdentityFilters,c.userAttributeFilters=d.userAttributeFilters,c.filteringEventAttributeValue=d.filteringEventAttributeValue,c.filteringUserAttributeValue=d.filteringUserAttributeValue,c.eventSubscriptionId=d.eventSubscriptionId,c.filteringConsentRuleValues=d.filteringConsentRuleValues,c.excludeAnonymousUser=d.excludeAnonymousUser,a._Store.configuredForwarders.push(c);break}},this.configurePixel=function(b){(b.isDebug===a._Store.SDKConfig.isDevelopmentMode||b.isProduction!==a._Store.SDKConfig.isDevelopmentMode)&&a._Store.pixelConfigurations.push(b);},this.processForwarders=function(c,d){if(!c)a.Logger.warning("No config was passed. Cannot process forwarders");else try{Array.isArray(c.kitConfigs)&&c.kitConfigs.length&&c.kitConfigs.forEach(function(a){b.configureForwarder(a);}),Array.isArray(c.pixelConfigs)&&c.pixelConfigs.length&&c.pixelConfigs.forEach(function(a){b.configurePixel(a);}),b.initForwarders(a._Store.SDKConfig.identifyRequest.userIdentities,d);}catch(b){a.Logger.error("Config was not parsed propertly. Forwarders may not be initialized.");}};}

var MessageType$1=Types.MessageType,ApplicationTransitionType$1=Types.ApplicationTransitionType;function ServerModel(a){function b(a,b){var c=[];for(var d in b.flags={},a.CustomFlags)c=[],a.CustomFlags.hasOwnProperty(d)&&(Array.isArray(a.CustomFlags[d])?a.CustomFlags[d].forEach(function(a){("number"==typeof a||"string"==typeof a||"boolean"==typeof a)&&c.push(a.toString());}):("number"==typeof a.CustomFlags[d]||"string"==typeof a.CustomFlags[d]||"boolean"==typeof a.CustomFlags[d])&&c.push(a.CustomFlags[d].toString()),c.length&&(b.flags[d]=c));}function c(a){return a?a.map(function(a){return d(a)}):[]}function d(b){return {id:a._Helpers.parseStringOrNumber(b.Sku),nm:a._Helpers.parseStringOrNumber(b.Name),pr:a._Helpers.parseNumber(b.Price),qt:a._Helpers.parseNumber(b.Quantity),br:a._Helpers.parseStringOrNumber(b.Brand),va:a._Helpers.parseStringOrNumber(b.Variant),ca:a._Helpers.parseStringOrNumber(b.Category),ps:a._Helpers.parseNumber(b.Position),cc:a._Helpers.parseStringOrNumber(b.CouponCode),tpa:a._Helpers.parseNumber(b.TotalAmount),attrs:b.Attributes}}var e=this;this.appendUserInfo=function(b,c){if(c){if(!b)return c.MPID=null,c.ConsentState=null,c.UserAttributes=null,void(c.UserIdentities=null);if(!(c.MPID&&c.MPID===b.getMPID())){c.MPID=b.getMPID(),c.ConsentState=b.getConsentState(),c.UserAttributes=b.getAllUserAttributes();var d=b.getUserIdentities().userIdentities,e={};for(var f in d){var g=Types.IdentityType.getIdentityType(f);!1!==g&&(e[g]=d[f]);}var h=[];if(a._Helpers.isObject(e)&&Object.keys(e).length)for(var i in e){var j={};j.Identity=e[i],j.Type=a._Helpers.parseNumber(i),h.push(j);}c.UserIdentities=h;}}},this.convertToConsentStateDTO=function(a){if(!a)return null;var b={},c=a.getGDPRConsentState();if(c){var d={};for(var e in b.gdpr=d,c)if(c.hasOwnProperty(e)){var f=c[e];b.gdpr[e]={},"boolean"==typeof f.Consented&&(d[e].c=f.Consented),"number"==typeof f.Timestamp&&(d[e].ts=f.Timestamp),"string"==typeof f.ConsentDocument&&(d[e].d=f.ConsentDocument),"string"==typeof f.Location&&(d[e].l=f.Location),"string"==typeof f.HardwareId&&(d[e].h=f.HardwareId);}}var g=a.getCCPAConsentState();return g&&(b.ccpa={data_sale_opt_out:{c:g.Consented,ts:g.Timestamp,d:g.ConsentDocument,l:g.Location,h:g.HardwareId}}),b},this.createEventObject=function(b){var c={},d={},f=b.messageType===Types.MessageType.OptOut?!a._Store.isEnabled:null;if(a._Store.sessionId||b.messageType==Types.MessageType.OptOut||a._Store.webviewBridgeEnabled){d=b.hasOwnProperty("toEventAPIObject")?b.toEventAPIObject():{EventName:b.name||b.messageType,EventCategory:b.eventType,EventAttributes:a._Helpers.sanitizeAttributes(b.data),EventDataType:b.messageType,CustomFlags:b.customFlags||{},UserAttributeChanges:b.userAttributeChanges,UserIdentityChanges:b.userIdentityChanges},b.messageType!==Types.MessageType.SessionEnd&&(a._Store.dateLastEventSent=new Date),c={Store:a._Store.serverSettings,SDKVersion:Constants.sdkVersion,SessionId:a._Store.sessionId,SessionStartDate:a._Store.sessionStartDate?a._Store.sessionStartDate.getTime():null,Debug:a._Store.SDKConfig.isDevelopmentMode,Location:a._Store.currentPosition,OptOut:f,ExpandedEventCount:0,AppVersion:a.getAppVersion(),AppName:a.getAppName(),ClientGeneratedId:a._Store.clientId,DeviceId:a._Store.deviceId,IntegrationAttributes:a._Store.integrationAttributes,CurrencyCode:a._Store.currencyCode,DataPlan:a._Store.SDKConfig.dataPlan?a._Store.SDKConfig.dataPlan:{}},d.CurrencyCode=a._Store.currencyCode;var g=a.Identity.getCurrentUser();return e.appendUserInfo(g,d),b.messageType===Types.MessageType.SessionEnd&&(d.SessionLength=a._Store.dateLastEventSent.getTime()-a._Store.sessionStartDate.getTime(),d.currentSessionMPIDs=a._Store.currentSessionMPIDs,d.EventAttributes=a._Store.sessionAttributes,a._Store.currentSessionMPIDs=[],a._Store.sessionStartDate=null),c.Timestamp=a._Store.dateLastEventSent.getTime(),a._Helpers.extend({},d,c)}return null},this.convertEventToDTO=function(d,f){var g={n:d.EventName,et:d.EventCategory,ua:d.UserAttributes,ui:d.UserIdentities,ia:d.IntegrationAttributes,str:d.Store,attrs:d.EventAttributes,sdk:d.SDKVersion,sid:d.SessionId,sl:d.SessionLength,ssd:d.SessionStartDate,dt:d.EventDataType,dbg:d.Debug,ct:d.Timestamp,lc:d.Location,o:d.OptOut,eec:d.ExpandedEventCount,av:d.AppVersion,cgid:d.ClientGeneratedId,das:d.DeviceId,mpid:d.MPID,smpids:d.currentSessionMPIDs};d.DataPlan&&d.DataPlan.PlanId&&(g.dp_id=d.DataPlan.PlanId,d.DataPlan.PlanVersion&&(g.dp_v=d.DataPlan.PlanVersion));var h=e.convertToConsentStateDTO(d.ConsentState);return h&&(g.con=h),d.EventDataType===MessageType$1.AppStateTransition&&(g.fr=f,g.iu=!1,g.at=ApplicationTransitionType$1.AppInit,g.lr=window.location.href||null,g.attrs=null),d.CustomFlags&&b(d,g),d.EventDataType===MessageType$1.Commerce?(g.cu=d.CurrencyCode,d.ShoppingCart&&(g.sc={pl:c(d.ShoppingCart.ProductList)}),d.ProductAction?g.pd={an:d.ProductAction.ProductActionType,cs:a._Helpers.parseNumber(d.ProductAction.CheckoutStep),co:d.ProductAction.CheckoutOptions,pl:c(d.ProductAction.ProductList),ti:d.ProductAction.TransactionId,ta:d.ProductAction.Affiliation,tcc:d.ProductAction.CouponCode,tr:a._Helpers.parseNumber(d.ProductAction.TotalAmount),ts:a._Helpers.parseNumber(d.ProductAction.ShippingAmount),tt:a._Helpers.parseNumber(d.ProductAction.TaxAmount)}:d.PromotionAction?g.pm={an:d.PromotionAction.PromotionActionType,pl:d.PromotionAction.PromotionList.map(function(a){return {id:a.Id,nm:a.Name,cr:a.Creative,ps:a.Position?a.Position:0}})}:d.ProductImpressions&&(g.pi=d.ProductImpressions.map(function(a){return {pil:a.ProductImpressionList,pl:c(a.ProductList)}}))):d.EventDataType===MessageType$1.Profile&&(g.pet=d.ProfileMessageType),g};}

function forwardingStatsUploader(a){function b(){var b=a._Forwarders.getForwarderStatsQueue(),c=a._Persistence.forwardingStatsBatches.uploadsTable,d=Date.now();for(var e in b.length&&(c[d]={uploading:!1,data:b},a._Forwarders.setForwarderStatsQueue([])),c)(function(b){if(c.hasOwnProperty(b)&&!1===c[b].uploading){var d=function(){4===e.readyState&&(200===e.status||202===e.status?(a.Logger.verbose("Successfully sent  "+e.statusText+" from server"),delete c[b]):"4"===e.status.toString()[0]?429!==e.status&&delete c[b]:c[b].uploading=!1);},e=a._Helpers.createXHR(d),f=c[b].data;c[b].uploading=!0,a._APIClient.sendBatchForwardingStatsToServer(f,e);}})(e);}this.startForwardingStatsTimer=function(){mParticle._forwardingStatsTimer=setInterval(function(){b();},a._Store.SDKConfig.forwarderStatsTimeout);};}

var Messages$7=Constants.Messages,HTTPCodes$1=Constants.HTTPCodes;function Identity(t){var s=this;/**
     * Invoke these methods on the mParticle.Identity object.
     * Example: mParticle.Identity.getCurrentUser().
     * @class mParticle.Identity
     */ /**
     * Invoke these methods on the mParticle.Identity.getCurrentUser() object.
     * Example: mParticle.Identity.getCurrentUser().getAllUserAttributes()
     * @class mParticle.Identity.getCurrentUser()
     */ /**
     * Invoke these methods on the mParticle.Identity.getCurrentUser().getCart() object.
     * Example: mParticle.Identity.getCurrentUser().getCart().add(...);
     * @class mParticle.Identity.getCurrentUser().getCart()
     * @deprecated
     */ // send a user identity change request on identify, login, logout, modify when any values change.
// compare what identities exist vs what is previously was for the specific user if they were in memory before.
// if it's the first time the user is logging in, send a user identity change request with
this.checkIdentitySwap=function(e,s,r){if(e&&s&&e!==s){var i=t._Persistence.getPersistence();i&&(i.cu=s,i.gs.csm=r,t._Persistence.savePersistence(i));}},this.IdentityRequest={createKnownIdentities:function createKnownIdentities(e,s){var r={};if(e&&e.userIdentities&&t._Helpers.isObject(e.userIdentities))for(var i in e.userIdentities)r[i]=e.userIdentities[i];return r.device_application_stamp=s,r},preProcessIdentityRequest:function preProcessIdentityRequest(e,s,r){t.Logger.verbose(Messages$7.InformationMessages.StartingLogEvent+": "+r);var i=t._Helpers.Validators.validateIdentities(e,r);if(!i.valid)return t.Logger.error("ERROR: "+i.error),{valid:!1,error:i.error};if(s&&!t._Helpers.Validators.isFunction(s)){var n="The optional callback must be a function. You tried entering a(n) "+_typeof_1(s);return t.Logger.error(n),{valid:!1,error:n}}return {valid:!0}},createIdentityRequest:function createIdentityRequest(e,s,r,i,n,o,a){var d={client_sdk:{platform:s,sdk_vendor:r,sdk_version:i},context:o,environment:t._Store.SDKConfig.isDevelopmentMode?"development":"production",request_id:t._Helpers.generateUniqueId(),request_timestamp_ms:new Date().getTime(),previous_mpid:a||null,known_identities:this.createKnownIdentities(e,n)};return d},createModifyIdentityRequest:function createModifyIdentityRequest(e,s,r,i,n,o){return {client_sdk:{platform:r,sdk_vendor:i,sdk_version:n},context:o,environment:t._Store.SDKConfig.isDevelopmentMode?"development":"production",request_id:t._Helpers.generateUniqueId(),request_timestamp_ms:new Date().getTime(),identity_changes:this.createIdentityChanges(e,s)}},createIdentityChanges:function createIdentityChanges(e,s){var r,i=[];if(s&&t._Helpers.isObject(s)&&e&&t._Helpers.isObject(e))for(r in s)i.push({old_value:e[r]||null,new_value:s[r],identity_type:r});return i},modifyUserIdentities:function modifyUserIdentities(e,t){var s={};for(var r in t)s[Types.IdentityType.getIdentityType(r)]=t[r];for(r in e)s[r]||(s[r]=e[r]);return s},createAliasNetworkRequest:function createAliasNetworkRequest(e){return {request_id:t._Helpers.generateUniqueId(),request_type:"alias",environment:t._Store.SDKConfig.isDevelopmentMode?"development":"production",api_key:t._Store.devToken,data:{destination_mpid:e.destinationMpid,source_mpid:e.sourceMpid,start_unixtime_ms:e.startTime,end_unixtime_ms:e.endTime,device_application_stamp:t._Store.deviceId}}},convertAliasToNative:function convertAliasToNative(e){return {DestinationMpid:e.destinationMpid,SourceMpid:e.sourceMpid,StartUnixtimeMs:e.startTime,EndUnixtimeMs:e.endTime}},convertToNative:function convertToNative(e){var t=[];if(e&&e.userIdentities){for(var s in e.userIdentities)e.userIdentities.hasOwnProperty(s)&&t.push({Type:Types.IdentityType.getIdentityType(s),Identity:e.userIdentities[s]});return {UserIdentities:t}}}},this.IdentityAPI={HTTPCodes:HTTPCodes$1,/**
         * Initiate a logout request to the mParticle server
         * @method identify
         * @param {Object} identityApiData The identityApiData object as indicated [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/README.md#1-customize-the-sdk)
         * @param {Function} [callback] A callback function that is called when the identify request completes
         */identify:function identify(e,r){var i,n=t.Identity.getCurrentUser(),o=t._Identity.IdentityRequest.preProcessIdentityRequest(e,r,"identify");if(n&&(i=n.getMPID()),o.valid){var a=t._Identity.IdentityRequest.createIdentityRequest(e,Constants.platform,Constants.sdkVendor,Constants.sdkVersion,t._Store.deviceId,t._Store.context,i);t._Helpers.canLog()?t._Store.webviewBridgeEnabled?(t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.Identify,JSON.stringify(t._Identity.IdentityRequest.convertToNative(e))),t._Helpers.invokeCallback(r,HTTPCodes$1.nativeIdentityRequest,"Identify request sent to native sdk")):t._APIClient.sendIdentityRequest(a,"identify",r,e,s.parseIdentityResponse,i):(t._Helpers.invokeCallback(r,HTTPCodes$1.loggingDisabledOrMissingAPIKey,Messages$7.InformationMessages.AbandonLogEvent),t.Logger.verbose(Messages$7.InformationMessages.AbandonLogEvent));}else t._Helpers.invokeCallback(r,HTTPCodes$1.validationIssue,o.error),t.Logger.verbose(o);},/**
         * Initiate a logout request to the mParticle server
         * @method logout
         * @param {Object} identityApiData The identityApiData object as indicated [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/README.md#1-customize-the-sdk)
         * @param {Function} [callback] A callback function that is called when the logout request completes
         */logout:function logout(e,r){var i,n=t.Identity.getCurrentUser(),o=t._Identity.IdentityRequest.preProcessIdentityRequest(e,r,"logout");if(n&&(i=n.getMPID()),o.valid){var a,d=t._Identity.IdentityRequest.createIdentityRequest(e,Constants.platform,Constants.sdkVendor,Constants.sdkVersion,t._Store.deviceId,t._Store.context,i);t._Helpers.canLog()?t._Store.webviewBridgeEnabled?(t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.Logout,JSON.stringify(t._Identity.IdentityRequest.convertToNative(e))),t._Helpers.invokeCallback(r,HTTPCodes$1.nativeIdentityRequest,"Logout request sent to native sdk")):(t._APIClient.sendIdentityRequest(d,"logout",r,e,s.parseIdentityResponse,i),a=t._ServerModel.createEventObject({messageType:Types.MessageType.Profile}),a.ProfileMessageType=Types.ProfileMessageType.Logout,t._Store.activeForwarders.length&&t._Store.activeForwarders.forEach(function(e){e.logOut&&e.logOut(a);})):(t._Helpers.invokeCallback(r,HTTPCodes$1.loggingDisabledOrMissingAPIKey,Messages$7.InformationMessages.AbandonLogEvent),t.Logger.verbose(Messages$7.InformationMessages.AbandonLogEvent));}else t._Helpers.invokeCallback(r,HTTPCodes$1.validationIssue,o.error),t.Logger.verbose(o);},/**
         * Initiate a login request to the mParticle server
         * @method login
         * @param {Object} identityApiData The identityApiData object as indicated [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/README.md#1-customize-the-sdk)
         * @param {Function} [callback] A callback function that is called when the login request completes
         */login:function login(e,r){var i,n=t.Identity.getCurrentUser(),o=t._Identity.IdentityRequest.preProcessIdentityRequest(e,r,"login");if(n&&(i=n.getMPID()),o.valid){var a=t._Identity.IdentityRequest.createIdentityRequest(e,Constants.platform,Constants.sdkVendor,Constants.sdkVersion,t._Store.deviceId,t._Store.context,i);t._Helpers.canLog()?t._Store.webviewBridgeEnabled?(t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.Login,JSON.stringify(t._Identity.IdentityRequest.convertToNative(e))),t._Helpers.invokeCallback(r,HTTPCodes$1.nativeIdentityRequest,"Login request sent to native sdk")):t._APIClient.sendIdentityRequest(a,"login",r,e,s.parseIdentityResponse,i):(t._Helpers.invokeCallback(r,HTTPCodes$1.loggingDisabledOrMissingAPIKey,Messages$7.InformationMessages.AbandonLogEvent),t.Logger.verbose(Messages$7.InformationMessages.AbandonLogEvent));}else t._Helpers.invokeCallback(r,HTTPCodes$1.validationIssue,o.error),t.Logger.verbose(o);},/**
         * Initiate a modify request to the mParticle server
         * @method modify
         * @param {Object} identityApiData The identityApiData object as indicated [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/README.md#1-customize-the-sdk)
         * @param {Function} [callback] A callback function that is called when the modify request completes
         */modify:function modify(e,r){var i,n=t.Identity.getCurrentUser(),o=t._Identity.IdentityRequest.preProcessIdentityRequest(e,r,"modify");n&&(i=n.getMPID());var a=e&&e.userIdentities?e.userIdentities:{};if(o.valid){var d=t._Identity.IdentityRequest.createModifyIdentityRequest(n?n.getUserIdentities().userIdentities:{},a,Constants.platform,Constants.sdkVendor,Constants.sdkVersion,t._Store.context);t._Helpers.canLog()?t._Store.webviewBridgeEnabled?(t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.Modify,JSON.stringify(t._Identity.IdentityRequest.convertToNative(e))),t._Helpers.invokeCallback(r,HTTPCodes$1.nativeIdentityRequest,"Modify request sent to native sdk")):t._APIClient.sendIdentityRequest(d,"modify",r,e,s.parseIdentityResponse,i):(t._Helpers.invokeCallback(r,HTTPCodes$1.loggingDisabledOrMissingAPIKey,Messages$7.InformationMessages.AbandonLogEvent),t.Logger.verbose(Messages$7.InformationMessages.AbandonLogEvent));}else t._Helpers.invokeCallback(r,HTTPCodes$1.validationIssue,o.error),t.Logger.verbose(o);},/**
         * Returns a user object with methods to interact with the current user
         * @method getCurrentUser
         * @return {Object} the current user object
         */getCurrentUser:function getCurrentUser(){var e;return t._Store?(e=t._Store.mpid,e?(e=t._Store.mpid.slice(),s.mParticleUser(e,t._Store.isLoggedIn)):t._Store.webviewBridgeEnabled?s.mParticleUser():null):null},/**
         * Returns a the user object associated with the mpid parameter or 'null' if no such
         * user exists
         * @method getUser
         * @param {String} mpid of the desired user
         * @return {Object} the user for  mpid
         */getUser:function getUser(e){var r=t._Persistence.getPersistence();return r?r[e]&&!Constants.SDKv2NonMPIDCookieKeys.hasOwnProperty(e)?s.mParticleUser(e):null:null},/**
         * Returns all users, including the current user and all previous users that are stored on the device.
         * @method getUsers
         * @return {Array} array of users
         */getUsers:function getUsers(){var e=t._Persistence.getPersistence(),r=[];if(e)for(var i in e)Constants.SDKv2NonMPIDCookieKeys.hasOwnProperty(i)||r.push(s.mParticleUser(i));return r.sort(function(e,t){var s=e.getLastSeenTime()||0,r=t.getLastSeenTime()||0;return s>r?-1:1}),r},/**
         * Initiate an alias request to the mParticle server
         * @method aliasUsers
         * @param {Object} aliasRequest  object representing an AliasRequest
         * @param {Function} [callback] A callback function that is called when the aliasUsers request completes
         */aliasUsers:function aliasUsers(e,s){var r;if(e.destinationMpid&&e.sourceMpid||(r=Messages$7.ValidationMessages.AliasMissingMpid),e.destinationMpid===e.sourceMpid&&(r=Messages$7.ValidationMessages.AliasNonUniqueMpid),e.startTime&&e.endTime||(r=Messages$7.ValidationMessages.AliasMissingTime),e.startTime>e.endTime&&(r=Messages$7.ValidationMessages.AliasStartBeforeEndTime),r)return t.Logger.warning(r),void t._Helpers.invokeAliasCallback(s,HTTPCodes$1.validationIssue,r);if(!t._Helpers.canLog())t._Helpers.invokeAliasCallback(s,HTTPCodes$1.loggingDisabledOrMissingAPIKey,Messages$7.InformationMessages.AbandonAliasUsers),t.Logger.verbose(Messages$7.InformationMessages.AbandonAliasUsers);else if(t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.Alias,JSON.stringify(t._Identity.IdentityRequest.convertAliasToNative(e))),t._Helpers.invokeAliasCallback(s,HTTPCodes$1.nativeIdentityRequest,"Alias request sent to native sdk");else{t.Logger.verbose(Messages$7.InformationMessages.StartingAliasRequest+": "+e.sourceMpid+" -> "+e.destinationMpid);var i=t._Identity.IdentityRequest.createAliasNetworkRequest(e);t._APIClient.sendAliasRequest(i,s);}},/**
         Create a default AliasRequest for 2 MParticleUsers. This will construct the request
        using the sourceUser's firstSeenTime as the startTime, and its lastSeenTime as the endTime.
        
        In the unlikely scenario that the sourceUser does not have a firstSeenTime, which will only
        be the case if they have not been the current user since this functionality was added, the 
        startTime will be populated with the earliest firstSeenTime out of any stored user. Similarly,
        if the sourceUser does not have a lastSeenTime, the endTime will be populated with the current time
        
        There is a limit to how old the startTime can be, represented by the config field 'aliasMaxWindow', in days.
        If the startTime falls before the limit, it will be adjusted to the oldest allowed startTime. 
        In rare cases, where the sourceUser's lastSeenTime also falls outside of the aliasMaxWindow limit, 
        after applying this adjustment it will be impossible to create an aliasRequest passes the aliasUsers() 
        validation that the startTime must be less than the endTime 
        */createAliasRequest:function createAliasRequest(e,s){try{if(!s||!e)return t.Logger.error("'destinationUser' and 'sourceUser' must both be present"),null;var r=e.getFirstSeenTime();r||t.Identity.getUsers().forEach(function(e){e.getFirstSeenTime()&&(!r||e.getFirstSeenTime()<r)&&(r=e.getFirstSeenTime());});var i=new Date().getTime()-1e3*(60*(60*(24*t._Store.SDKConfig.aliasMaxWindow))),n=e.getLastSeenTime()||new Date().getTime();return r<i&&(r=i,n<r&&t.Logger.warning("Source User has not been seen in the last "+t._Store.SDKConfig.maxAliasWindow+" days, Alias Request will likely fail")),{destinationMpid:s.getMPID(),sourceMpid:e.getMPID(),startTime:r,endTime:n}}catch(s){return t.Logger.error("There was a problem with creating an alias request: "+s),null}}},this.mParticleUser=function(e,s){var r=this;return {/**
             * Get user identities for current user
             * @method getUserIdentities
             * @return {Object} an object with userIdentities as its key
             */getUserIdentities:function getUserIdentities(){var s={},r=t._Persistence.getUserIdentities(e);for(var i in r)r.hasOwnProperty(i)&&(s[Types.IdentityType.getIdentityName(t._Helpers.parseNumber(i))]=r[i]);return {userIdentities:s}},/**
             * Get the MPID of the current user
             * @method getMPID
             * @return {String} the current user MPID as a string
             */getMPID:function getMPID(){return e},/**
             * Sets a user tag
             * @method setUserTag
             * @param {String} tagName
             */setUserTag:function setUserTag(e){return t._Helpers.Validators.isValidKeyValue(e)?void this.setUserAttribute(e,null):void t.Logger.error(Messages$7.ErrorMessages.BadKey)},/**
             * Removes a user tag
             * @method removeUserTag
             * @param {String} tagName
             */removeUserTag:function removeUserTag(e){return t._Helpers.Validators.isValidKeyValue(e)?void this.removeUserAttribute(e):void t.Logger.error(Messages$7.ErrorMessages.BadKey)},/**
             * Sets a user attribute
             * @method setUserAttribute
             * @param {String} key
             * @param {String} value
             */setUserAttribute:function setUserAttribute(s,i){var n,o,a,d;if(t._SessionManager.resetSessionTimer(),t._Helpers.canLog()){if(!t._Helpers.Validators.isValidAttributeValue(i))return void t.Logger.error(Messages$7.ErrorMessages.BadAttribute);if(!t._Helpers.Validators.isValidKeyValue(s))return void t.Logger.error(Messages$7.ErrorMessages.BadKey);if(t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.SetUserAttribute,JSON.stringify({key:s,value:i}));else{n=t._Persistence.getPersistence(),o=this.getAllUserAttributes();var g=t._Helpers.findKeyInObject(o,s);g?(d=!1,a=o[g],delete o[g]):d=!0,r.sendUserAttributeChangeEvent(s,i,a,d,!1),o[s]=i,n&&n[e]&&(n[e].ua=o,t._Persistence.savePersistence(n,e)),t._Forwarders.initForwarders(r.IdentityAPI.getCurrentUser().getUserIdentities(),t._APIClient.prepareForwardingStats),t._Forwarders.callSetUserAttributeOnForwarders(s,i);}}},/**
             * Set multiple user attributes
             * @method setUserAttributes
             * @param {Object} user attribute object with keys of the attribute type, and value of the attribute value
             */setUserAttributes:function setUserAttributes(e){if(t._SessionManager.resetSessionTimer(),!t._Helpers.isObject(e))t.Logger.error("Must pass an object into setUserAttributes. You passed a "+_typeof_1(e));else if(t._Helpers.canLog())for(var s in e)e.hasOwnProperty(s)&&this.setUserAttribute(s,e[s]);},/**
             * Removes a specific user attribute
             * @method removeUserAttribute
             * @param {String} key
             */removeUserAttribute:function removeUserAttribute(s){var i,n;if(t._SessionManager.resetSessionTimer(),!t._Helpers.Validators.isValidKeyValue(s))return void t.Logger.error(Messages$7.ErrorMessages.BadKey);if(t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.RemoveUserAttribute,JSON.stringify({key:s,value:null}));else{i=t._Persistence.getPersistence(),n=this.getAllUserAttributes(),r.sendUserAttributeChangeEvent(s,null,n[s],!1,!0);var o=t._Helpers.findKeyInObject(n,s);o&&(s=o),delete n[s],i&&i[e]&&(i[e].ua=n,t._Persistence.savePersistence(i,e)),t._Forwarders.initForwarders(r.IdentityAPI.getCurrentUser().getUserIdentities(),t._APIClient.prepareForwardingStats),t._Forwarders.applyToForwarders("removeUserAttribute",s);}},/**
             * Sets a list of user attributes
             * @method setUserAttributeList
             * @param {String} key
             * @param {Array} value an array of values
             */setUserAttributeList:function setUserAttributeList(s,n){var o,a,d,g,l;if(t._SessionManager.resetSessionTimer(),!t._Helpers.Validators.isValidKeyValue(s))return void t.Logger.error(Messages$7.ErrorMessages.BadKey);if(!Array.isArray(n))return void t.Logger.error("The value you passed in to setUserAttributeList must be an array. You passed in a "+("undefined"==typeof value?"undefined":_typeof_1(value)));var u=n.slice();if(t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.SetUserAttributeList,JSON.stringify({key:s,value:u}));else{o=t._Persistence.getPersistence(),a=this.getAllUserAttributes();var p=t._Helpers.findKeyInObject(a,s);if(p?(g=!1,d=a[p],delete a[p]):g=!0,t._APIClient.shouldEnableBatching()){// If the new attributeList length is different previous, then there is a change event.
// Loop through new attributes list, see if they are all in the same index as previous user attributes list
// If there are any changes, break, and immediately send a userAttributeChangeEvent with full array as a value
if(!d||!Array.isArray(d))l=!0;else if(n.length!==d.length)l=!0;else for(var c=0;c<n.length;c++)if(d[c]!==n[c]){l=!0;break}l&&r.sendUserAttributeChangeEvent(s,n,d,g,!1);}a[s]=u,o&&o[e]&&(o[e].ua=a,t._Persistence.savePersistence(o,e)),t._Forwarders.initForwarders(r.IdentityAPI.getCurrentUser().getUserIdentities(),t._APIClient.prepareForwardingStats),t._Forwarders.callSetUserAttributeOnForwarders(s,u);}},/**
             * Removes all user attributes
             * @method removeAllUserAttributes
             */removeAllUserAttributes:function removeAllUserAttributes(){var e;if(t._SessionManager.resetSessionTimer(),t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.RemoveAllUserAttributes);else if(e=this.getAllUserAttributes(),t._Forwarders.initForwarders(r.IdentityAPI.getCurrentUser().getUserIdentities(),t._APIClient.prepareForwardingStats),e)for(var s in e)e.hasOwnProperty(s)&&t._Forwarders.applyToForwarders("removeUserAttribute",s),this.removeUserAttribute(s);},/**
             * Returns all user attribute keys that have values that are arrays
             * @method getUserAttributesLists
             * @return {Object} an object of only keys with array values. Example: { attr1: [1, 2, 3], attr2: ['a', 'b', 'c'] }
             */getUserAttributesLists:function getUserAttributesLists(){var e,t={};for(var s in e=this.getAllUserAttributes(),e)e.hasOwnProperty(s)&&Array.isArray(e[s])&&(t[s]=e[s].slice());return t},/**
             * Returns all user attributes
             * @method getAllUserAttributes
             * @return {Object} an object of all user attributes. Example: { attr1: 'value1', attr2: ['a', 'b', 'c'] }
             */getAllUserAttributes:function getAllUserAttributes(){var s={},r=t._Persistence.getAllUserAttributes(e);if(r)for(var i in r)r.hasOwnProperty(i)&&(s[i]=Array.isArray(r[i])?r[i].slice():r[i]);return s},/**
             * Returns the cart object for the current user
             * @method getCart
             * @return a cart object
             */getCart:function getCart(){return t.Logger.warning("Deprecated function Identity.getCurrentUser().getCart() will be removed in future releases"),r.mParticleUserCart(e)},/**
             * Returns the Consent State stored locally for this user.
             * @method getConsentState
             * @return a ConsentState object
             */getConsentState:function getConsentState(){return t._Persistence.getConsentState(e)},/**
             * Sets the Consent State stored locally for this user.
             * @method setConsentState
             * @param {Object} consent state
             */setConsentState:function setConsentState(s){t._Persistence.saveUserConsentStateToCookies(e,s),t._Forwarders.initForwarders(this.getUserIdentities().userIdentities,t._APIClient.prepareForwardingStats);},isLoggedIn:function isLoggedIn(){return s},getLastSeenTime:function getLastSeenTime(){return t._Persistence.getLastSeenTime(e)},getFirstSeenTime:function getFirstSeenTime(){return t._Persistence.getFirstSeenTime(e)}}},this.mParticleUserCart=function(e){return {/**
             * Adds a cart product to the user cart
             * @method add
             * @param {Object} product the product
             * @param {Boolean} [logEvent] a boolean to log adding of the cart object. If blank, no logging occurs.
             * @deprecated
             */add:function add(s,r){t.Logger.warning("Deprecated function Identity.getCurrentUser().getCart().add() will be removed in future releases");var i,n,o;if(o=Array.isArray(s)?s.slice():[s],o.forEach(function(e){e.Attributes=t._Helpers.sanitizeAttributes(e.Attributes);}),t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.AddToCart,JSON.stringify(o));else{t._SessionManager.resetSessionTimer(),n=t._Persistence.getUserProductsFromLS(e),n=n.concat(o),!0===r&&t._Events.logProductActionEvent(Types.ProductActionType.AddToCart,o);n.length>t._Store.SDKConfig.maxProducts&&(t.Logger.verbose("The cart contains "+n.length+" items. Only "+t._Store.SDKConfig.maxProducts+" can currently be saved in cookies."),n=n.slice(-t._Store.SDKConfig.maxProducts)),i=t._Persistence.getAllUserProductsFromLS(),i[e].cp=n,t._Persistence.setCartProducts(i);}},/**
             * Removes a cart product from the current user cart
             * @method remove
             * @param {Object} product the product
             * @param {Boolean} [logEvent] a boolean to log adding of the cart object. If blank, no logging occurs.
             * @deprecated
             */remove:function remove(s,r){t.Logger.warning("Deprecated function Identity.getCurrentUser().getCart().remove() will be removed in future releases");var i,n,o=-1,a=null;if(t._Store.webviewBridgeEnabled)t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.RemoveFromCart,JSON.stringify(s));else{t._SessionManager.resetSessionTimer(),n=t._Persistence.getUserProductsFromLS(e),n&&(n.forEach(function(e,t){e.Sku===s.Sku&&(o=t,a=e);}),-1<o&&(n.splice(o,1),!0===r&&t._Events.logProductActionEvent(Types.ProductActionType.RemoveFromCart,a)));i=t._Persistence.getAllUserProductsFromLS(),i[e].cp=n,t._Persistence.setCartProducts(i);}},/**
             * Clears the user's cart
             * @method clear
             * @deprecated
             */clear:function clear(){t.Logger.warning("Deprecated function Identity.getCurrentUser().getCart().clear() will be removed in future releases");var s;t._Store.webviewBridgeEnabled?t._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.ClearCart):(t._SessionManager.resetSessionTimer(),s=t._Persistence.getAllUserProductsFromLS(),s&&s[e]&&s[e].cp&&(s[e].cp=[],s[e].cp=[],t._Persistence.setCartProducts(s)));},/**
             * Returns all cart products
             * @method getCartProducts
             * @return {Array} array of cart products
             * @deprecated
             */getCartProducts:function getCartProducts(){return t.Logger.warning("Deprecated function Identity.getCurrentUser().getCart().getCartProducts() will be removed in future releases"),t._Persistence.getCartProducts(e)}}},this.parseIdentityResponse=function(r,i,n,o,a){var d,g,l,u=t.Identity.getCurrentUser(),p={},c=u?u.getUserIdentities().userIdentities:{};for(var y in c)p[Types.IdentityType.getIdentityType(y)]=c[y];var I={};t._Store.identityCallInFlight=!1;try{if(t.Logger.verbose("Parsing \""+a+"\" identity response from server"),r.responseText&&(g=JSON.parse(r.responseText),s.sendUserIdentityChange(o,a,g.mpid),g.hasOwnProperty("is_logged_in")&&(t._Store.isLoggedIn=g.is_logged_in)),200===r.status){if("modify"===a)I=t._Identity.IdentityRequest.modifyUserIdentities(p,o.userIdentities),t._Persistence.saveUserIdentitiesToPersistence(u.getMPID(),I);else{//if there is any previous migration data
if(g=JSON.parse(r.responseText),t.Logger.verbose("Successfully parsed Identity Response"),(!u||u.getMPID()&&g.mpid&&g.mpid!==u.getMPID())&&(t._Store.mpid=g.mpid,u&&t._Persistence.setLastSeenTime(i),t._Persistence.setFirstSeenTime(g.mpid)),"identify"==a&&u&&g.mpid===u.getMPID()&&t._Persistence.setFirstSeenTime(g.mpid),l=t._Store.currentSessionMPIDs.indexOf(g.mpid),t._Store.sessionId&&g.mpid&&i!==g.mpid&&0>l&&t._Store.currentSessionMPIDs.push(g.mpid),-1<l&&(t._Store.currentSessionMPIDs=t._Store.currentSessionMPIDs.slice(0,l).concat(t._Store.currentSessionMPIDs.slice(l+1,t._Store.currentSessionMPIDs.length)),t._Store.currentSessionMPIDs.push(g.mpid)),t._Persistence.saveUserIdentitiesToPersistence(g.mpid,I),t._CookieSyncManager.attemptCookieSync(i,g.mpid),s.checkIdentitySwap(i,g.mpid,t._Store.currentSessionMPIDs),Object.keys(t._Store.migrationData).length){I=t._Store.migrationData.userIdentities||{};var _=t._Store.migrationData.userAttributes||{};t._Persistence.saveUserAttributesToPersistence(g.mpid,_);}else o&&o.userIdentities&&Object.keys(o.userIdentities).length&&(I=t._Identity.IdentityRequest.modifyUserIdentities(p,o.userIdentities));t._Persistence.saveUserIdentitiesToPersistence(g.mpid,I),t._Persistence.update(),t._Persistence.findPrevCookiesBasedOnUI(o),t._Store.context=g.context||t._Store.context;}if(d=t.Identity.getCurrentUser(),o&&o.onUserAlias&&t._Helpers.Validators.isFunction(o.onUserAlias))try{t.Logger.warning("Deprecated function onUserAlias will be removed in future releases"),o.onUserAlias(u,d);}catch(s){t.Logger.error("There was an error with your onUserAlias function - "+s);}var v=t._Persistence.getPersistence();d&&(t._Persistence.storeDataInMemory(v,d.getMPID()),(!u||d.getMPID()!==u.getMPID()||u.isLoggedIn()!==d.isLoggedIn())&&t._Forwarders.initForwarders(d.getUserIdentities().userIdentities,t._APIClient.prepareForwardingStats),t._Forwarders.setForwarderUserIdentities(d.getUserIdentities().userIdentities),t._Forwarders.setForwarderOnIdentityComplete(d,a),t._Forwarders.setForwarderOnUserIdentified(d,a)),t._APIClient.processQueuedEvents();}n?0===r.status?t._Helpers.invokeCallback(n,HTTPCodes$1.noHttpCoverage,g||null,d):t._Helpers.invokeCallback(n,r.status,g||null,d):g&&g.errors&&g.errors.length&&t.Logger.error("Received HTTP response code of "+r.status+" - "+g.errors[0].message);}catch(s){n&&t._Helpers.invokeCallback(n,r.status,g||null),t.Logger.error("Error parsing JSON response from Identity server: "+s);}},this.sendUserIdentityChange=function(e,r,i){var n,o,a;if(t._APIClient.shouldEnableBatching()&&(i||"modify"===r)){n="modify"===r?this.IdentityAPI.getCurrentUser():this.IdentityAPI.getUser(i);var d=e.userIdentities;// if there is not a user in memory with this mpid, then it is a new user, and we send a user identity
// change for each identity on the identity api request
if(n)o=n.getUserIdentities()?n.getUserIdentities().userIdentities:{};else{for(var g in d)a=this.createUserIdentityChange(g,d[g],null,!0),t._APIClient.sendEventToServer(a);return}for(g in d)if(o[g]!==d[g]){var l=!o[g];a=s.createUserIdentityChange(g,d[g],o[g],l),t._APIClient.sendEventToServer(a);}}},this.createUserIdentityChange=function(e,s,r,i){var n;return n=t._ServerModel.createEventObject({messageType:Types.MessageType.UserIdentityChange,userIdentityChanges:{New:{IdentityType:e,Identity:s,CreatedThisBatch:i},Old:{IdentityType:e,Identity:r,CreatedThisBatch:!1}}}),n},this.sendUserAttributeChangeEvent=function(e,r,i,n,o){if(t._APIClient.shouldEnableBatching()){var a=s.createUserAttributeChange(e,r,i,n,o);a&&t._APIClient.sendEventToServer(a);}},this.createUserAttributeChange=function(e,s,r,i,n){r||(r=null);var o;return s!==r&&(o=t._ServerModel.createEventObject({messageType:Types.MessageType.UserAttributeChange,userAttributeChanges:{UserAttributeName:e,New:s,Old:r||null,Deleted:n,IsNewAttribute:i}})),o};}

function Consent(a){var b=this,c="data_sale_opt_out";this.createPrivacyConsent=function(b,c,d,e,f){return "boolean"==typeof b?c&&isNaN(c)?(a.Logger.error("Timestamp must be a valid number when constructing a Consent object."),null):d&&"string"!=typeof d?(a.Logger.error("Document must be a valid string when constructing a Consent object."),null):e&&"string"!=typeof e?(a.Logger.error("Location must be a valid string when constructing a Consent object."),null):f&&"string"!=typeof f?(a.Logger.error("Hardware ID must be a valid string when constructing a Consent object."),null):{Consented:b,Timestamp:c||Date.now(),ConsentDocument:d,Location:e,HardwareId:f}:(a.Logger.error("Consented boolean is required when constructing a Consent object."),null)},this.ConsentSerialization={toMinifiedJsonObject:function toMinifiedJsonObject(a){var b={};if(a){var d=a.getGDPRConsentState();if(d)for(var e in b.gdpr={},d)if(d.hasOwnProperty(e)){var f=d[e];b.gdpr[e]={},"boolean"==typeof f.Consented&&(b.gdpr[e].c=f.Consented),"number"==typeof f.Timestamp&&(b.gdpr[e].ts=f.Timestamp),"string"==typeof f.ConsentDocument&&(b.gdpr[e].d=f.ConsentDocument),"string"==typeof f.Location&&(b.gdpr[e].l=f.Location),"string"==typeof f.HardwareId&&(b.gdpr[e].h=f.HardwareId);}var g=a.getCCPAConsentState();g&&(b.ccpa={},b.ccpa[c]={},"boolean"==typeof g.Consented&&(b.ccpa[c].c=g.Consented),"number"==typeof g.Timestamp&&(b.ccpa[c].ts=g.Timestamp),"string"==typeof g.ConsentDocument&&(b.ccpa[c].d=g.ConsentDocument),"string"==typeof g.Location&&(b.ccpa[c].l=g.Location),"string"==typeof g.HardwareId&&(b.ccpa[c].h=g.HardwareId));}return b},fromMinifiedJsonObject:function fromMinifiedJsonObject(a){var d=b.createConsentState();if(a.gdpr)for(var e in a.gdpr)if(a.gdpr.hasOwnProperty(e)){var f=b.createPrivacyConsent(a.gdpr[e].c,a.gdpr[e].ts,a.gdpr[e].d,a.gdpr[e].l,a.gdpr[e].h);d.addGDPRConsentState(e,f);}if(a.ccpa&&a.ccpa.hasOwnProperty(c)){var g=b.createPrivacyConsent(a.ccpa[c].c,a.ccpa[c].ts,a.ccpa[c].d,a.ccpa[c].l,a.ccpa[c].h);d.setCCPAConsentState(g);}return d}},this.createConsentState=function(d){function e(a){if("string"!=typeof a)return null;var b=a.trim();return b.length?b.toLowerCase():null}/**
         * Invoke these methods on a consent state object.
         * <p>
         * Usage: var consent = mParticle.Consent.createConsentState()
         * <br>
         * consent.setGDPRCoonsentState()
         *
         * @class Consent
         */ /**
         * Add a GDPR Consent State to the consent state object
         *
         * @method addGDPRConsentState
         * @param purpose [String] Data processing purpose that describes the type of processing done on the data subject’s data
         * @param gdprConsent [Object] A GDPR consent object created via mParticle.Consent.createGDPRConsent(...)
         */function f(c,d){var f=e(c);if(!f)return a.Logger.error("Purpose must be a string."),this;if(!a._Helpers.isObject(d))return a.Logger.error("Invoked with a bad or empty consent object."),this;var g=b.createPrivacyConsent(d.Consented,d.Timestamp,d.ConsentDocument,d.Location,d.HardwareId);return g&&(k[f]=g),this}function g(b){if(!b)k={};else if(a._Helpers.isObject(b))for(var c in k={},b)b.hasOwnProperty(c)&&f(c,b[c]);return this}/**
         * Remove a GDPR Consent State to the consent state object
         *
         * @method removeGDPRConsentState
         * @param purpose [String] Data processing purpose that describes the type of processing done on the data subject’s data
         */function h(a){var b=e(a);return b?(delete k[b],this):this}/**
         * Gets the GDPR Consent State
         *
         * @method getGDPRConsentState
         * @return {Object} A GDPR Consent State
         */function i(){return a._Helpers.extend({},k)}/**
         * Sets a CCPA Consent state (has a single purpose of 'data_sale_opt_out')
         *
         * @method setCCPAConsentState
         * @param {Object} ccpaConsent CCPA Consent State
         */function j(d){if(!a._Helpers.isObject(d))return a.Logger.error("Invoked with a bad or empty CCPA consent object."),this;var e=b.createPrivacyConsent(d.Consented,d.Timestamp,d.ConsentDocument,d.Location,d.HardwareId);return e&&(l[c]=e),this}/**
         * Gets the CCPA Consent State
         *
         * @method getCCPAConsentStatensent
         * @return {Object} A CCPA Consent State
         */var k={},l={};return d&&(g(d.getGDPRConsentState()),j(d.getCCPAConsentState())),{setGDPRConsentState:g,addGDPRConsentState:f,setCCPAConsentState:j,getCCPAConsentState:function(){return l[c]}/**
         * Removes CCPA from the consent state object
         *
         * @method removeCCPAState
         */,getGDPRConsentState:i,removeGDPRConsentState:h,removeCCPAState:function(){return delete l[c],this}}};}

var Messages$8=Constants.Messages,HTTPCodes$2=Constants.HTTPCodes;/**
 * <p>All of the following methods can be called on the primary mParticle class. In version 2.10.0, we introduced <a href="https://docs.mparticle.com/developers/sdk/web/multiple-instances/">multiple instances</a>. If you are using multiple instances (self hosted environments only), you should call these methods on each instance.</p>
 * <p>In current versions of mParticle, if your site has one instance, that instance name is 'default_instance'. Any methods called on mParticle on a site with one instance will be mapped to the `default_instance`.</p>
 * <p>This is for simplicity and backwards compatibility. For example, calling mParticle.logPageView() automatically maps to mParticle.getInstance('default_instance').logPageView().</p>
 * <p>If you have multiple instances, instances must first be initialized and then a method can be called on that instance. For example:</p>
 * <code>
 *  mParticle.init('apiKey', config, 'another_instance');
 *  mParticle.getInstance('another_instance').logPageView();
 * </code>
 *
 * @class mParticle & mParticleInstance
 */function mParticleInstance(a){var b=this;// These classes are for internal use only. Not documented for public consumption
// required for forwarders once they reference the mparticle instance
/**
     * Resets the SDK to an uninitialized state and removes cookies/localStorage. You MUST call mParticle.init(apiKey, window.mParticle.config)
     * before any other mParticle methods or the SDK will not function as intended.
     * @method setLogLevel
     * @param {String} logLevel verbose, warning, or none. By default, `warning` is chosen.
     */ /**
     * Resets the SDK to an uninitialized state and removes cookies/localStorage. You MUST call mParticle.init(apiKey, window.mParticle.config)
     * before any other mParticle methods or the SDK will not function as intended.
     * @method reset
     */ /**
     * A callback method that is invoked after mParticle is initialized.
     * @method ready
     * @param {Function} function A function to be called after mParticle is initialized
     */ /**
     * Returns the mParticle SDK version number
     * @method getVersion
     * @return {String} mParticle SDK version number
     */ /**
     * Sets the app version
     * @method setAppVersion
     * @param {String} version version number
     */ /**
     * Gets the app name
     * @method getAppName
     * @return {String} App name
     */ /**
     * Sets the app name
     * @method setAppName
     * @param {String} name App Name
     */ /**
     * Gets the app version
     * @method getAppVersion
     * @return {String} App version
     */ /**
     * Stops tracking the location of the user
     * @method stopTrackingLocation
     */ /**
     * Starts tracking the location of the user
     * @method startTrackingLocation
     * @param {Function} [callback] A callback function that is called when the location is either allowed or rejected by the user. A position object of schema {coords: {latitude: number, longitude: number}} is passed to the callback
     */ /**
     * Sets the position of the user
     * @method setPosition
     * @param {Number} lattitude lattitude digit
     * @param {Number} longitude longitude digit
     */ /**
     * Starts a new session
     * @method startNewSession
     */ /**
     * Ends the current session
     * @method endSession
     */ /**
     * Logs a Base Event to mParticle's servers
     * @param {Object} event Base Event Object
     */ /**
     * Logs an event to mParticle's servers
     * @method logEvent
     * @param {String} eventName The name of the event
     * @param {Number} [eventType] The eventType as seen [here](http://docs.mparticle.com/developers/sdk/web/event-tracking#event-type)
     * @param {Object} [eventInfo] Attributes for the event
     * @param {Object} [customFlags] Additional customFlags
     */ /**
     * Used to log custom errors
     *
     * @method logError
     * @param {String or Object} error The name of the error (string), or an object formed as follows {name: 'exampleName', message: 'exampleMessage', stack: 'exampleStack'}
     * @param {Object} [attrs] Custom attrs to be passed along with the error event; values must be string, number, or boolean
     */ /**
     * Logs `click` events
     * @method logLink
     * @param {String} selector The selector to add a 'click' event to (ex. #purchase-event)
     * @param {String} [eventName] The name of the event
     * @param {Number} [eventType] The eventType as seen [here](http://docs.mparticle.com/developers/sdk/javascript/event-tracking#event-type)
     * @param {Object} [eventInfo] Attributes for the event
     */ /**
     * Logs `submit` events
     * @method logForm
     * @param {String} selector The selector to add the event handler to (ex. #search-event)
     * @param {String} [eventName] The name of the event
     * @param {Number} [eventType] The eventType as seen [here](http://docs.mparticle.com/developers/sdk/javascript/event-tracking#event-type)
     * @param {Object} [eventInfo] Attributes for the event
     */ /**
     * Logs a page view
     * @method logPageView
     * @param {String} eventName The name of the event. Defaults to 'PageView'.
     * @param {Object} [attrs] Attributes for the event
     * @param {Object} [customFlags] Custom flags for the event
     */ /**
     * Invoke these methods on the mParticle.Consent object.
     * Example: mParticle.Consent.createConsentState()
     *
     * @class mParticle.Consent
     */ /**
     * Invoke these methods on the mParticle.eCommerce object.
     * Example: mParticle.eCommerce.createImpresion(...)
     * @class mParticle.eCommerce
     */ /**
     * Sets a session attribute
     * @method setSessionAttribute
     * @param {String} key key for session attribute
     * @param {String or Number} value value for session attribute
     */ /**
     * Set opt out of logging
     * @method setOptOut
     * @param {Boolean} isOptingOut boolean to opt out or not. When set to true, opt out of logging.
     */ /**
     * Set or remove the integration attributes for a given integration ID.
     * Integration attributes are keys and values specific to a given integration. For example,
     * many integrations have their own internal user/device ID. mParticle will store integration attributes
     * for a given device, and will be able to use these values for server-to-server communication to services.
     * This is often useful when used in combination with a server-to-server feed, allowing the feed to be enriched
     * with the necessary integration attributes to be properly forwarded to the given integration.
     * @method setIntegrationAttribute
     * @param {Number} integrationId mParticle integration ID
     * @param {Object} attrs a map of attributes that will replace any current attributes. The keys are predefined by mParticle.
     * Please consult with the mParticle docs or your solutions consultant for the correct value. You may
     * also pass a null or empty map here to remove all of the attributes.
     */ /**
     * Get integration attributes for a given integration ID.
     * @method getIntegrationAttributes
     * @param {Number} integrationId mParticle integration ID
     * @return {Object} an object map of the integrationId's attributes
     */ // Used by our forwarders
this._instanceName=a,this._NativeSdkHelpers=new NativeSdkHelpers(this),this._Migrations=new Migrations(this),this._SessionManager=new SessionManager(this),this._Persistence=new _Persistence(this),this._Helpers=new Helpers(this),this._Forwarders=new Forwarders(this),this._APIClient=new APIClient(this),this._Events=new Events(this),this._CookieSyncManager=new cookieSyncManager(this),this._ServerModel=new ServerModel(this),this._Ecommerce=new Ecommerce(this),this._ForwardingStatsUploader=new forwardingStatsUploader(this),this._Consent=new Consent(this),this._preInit={readyQueue:[],integrationDelays:{},forwarderConstructors:[]},this.IdentityType=Types.IdentityType,this.EventType=Types.EventType,this.CommerceEventType=Types.CommerceEventType,this.PromotionType=Types.PromotionActionType,this.ProductActionType=Types.ProductActionType,this._Identity=new Identity(this),this.Identity=this._Identity.IdentityAPI,this.generateHash=this._Helpers.generateHash,this.getDeviceId=this._Persistence.getDeviceId,window.mParticle&&window.mParticle.config&&window.mParticle.config.hasOwnProperty("rq")&&(this._preInit.readyQueue=window.mParticle.config.rq),this.init=function(a,c){// config code - Fetch config when requestConfig = true, otherwise, proceed with SDKInitialization
// Since fetching the configuration is asynchronous, we must pass completeSDKInitialization
// to it for it to be run after fetched
return c||window.console.warn("You did not pass a config object to init(). mParticle will not initialize properly"),runPreConfigFetchInitialization(this,a,c),c?void(!c.hasOwnProperty("requestConfig")||c.requestConfig?b._APIClient.getSDKConfiguration(a,c,completeSDKInitialization,this):completeSDKInitialization(a,c,this)):void window.console.error("No config available on the window, please pass a config object to mParticle.init()")},this.setLogLevel=function(a){b.Logger.setLogLevel(a);},this.reset=function(a){a._Persistence.resetPersistence(),a._Store&&delete a._Store;},this._resetForTests=function(a,b,c){c._Store&&delete c._Store,c._Store=new Store(a,c),c._Store.isLocalStorageAvailable=c._Persistence.determineLocalStorageAvailability(window.localStorage),c._Events.stopTracking(),b||c._Persistence.resetPersistence(),c._Persistence.forwardingStatsBatches.uploadsTable={},c._Persistence.forwardingStatsBatches.forwardingStatsEventQueue=[],c._preInit={readyQueue:[],pixelConfigurations:[],integrationDelays:{},forwarderConstructors:[],isDevelopmentMode:!1};},this.ready=function(a){b._Store.isInitialized&&"function"==typeof a?a():b._preInit.readyQueue.push(a);},this.getVersion=function(){return Constants.sdkVersion},this.setAppVersion=function(a){b._Store.SDKConfig.appVersion=a,b._Persistence.update();},this.getAppName=function(){return b._Store.SDKConfig.appName},this.setAppName=function(a){b._Store.SDKConfig.appName=a;},this.getAppVersion=function(){return b._Store.SDKConfig.appVersion},this.stopTrackingLocation=function(){b._SessionManager.resetSessionTimer(),b._Events.stopTracking();},this.startTrackingLocation=function(a){b._Helpers.Validators.isFunction(a)||b.Logger.warning("Warning: Location tracking is triggered, but not including a callback into the `startTrackingLocation` may result in events logged too quickly and not being associated with a location."),b._SessionManager.resetSessionTimer(),b._Events.startTracking(a);},this.setPosition=function(a,c){b._SessionManager.resetSessionTimer(),"number"==typeof a&&"number"==typeof c?b._Store.currentPosition={lat:a,lng:c}:b.Logger.error("Position latitude and/or longitude must both be of type number");},this.startNewSession=function(){b._SessionManager.startNewSession();},this.endSession=function(){// Sends true as an over ride vs when endSession is called from the setInterval
b._SessionManager.endSession(!0);},this.logBaseEvent=function(a){return b._Store.isInitialized?(b._SessionManager.resetSessionTimer(),"string"!=typeof a.name)?void b.Logger.error(Messages$8.ErrorMessages.EventNameInvalidType):(a.eventType||(a.eventType=Types.EventType.Unknown),b._Helpers.canLog()?void b._Events.logEvent(a):void b.Logger.error(Messages$8.ErrorMessages.LoggingDisabled)):void b.ready(function(){b.logBaseEvent(a);})},this.logEvent=function(a,c,d,e){return b._Store.isInitialized?(b._SessionManager.resetSessionTimer(),"string"!=typeof a)?void b.Logger.error(Messages$8.ErrorMessages.EventNameInvalidType):(c||(c=Types.EventType.Unknown),b._Helpers.isEventType(c)?b._Helpers.canLog()?void b._Events.logEvent({messageType:Types.MessageType.PageEvent,name:a,data:d,eventType:c,customFlags:e}):void b.Logger.error(Messages$8.ErrorMessages.LoggingDisabled):void b.Logger.error("Invalid event type: "+c+", must be one of: \n"+JSON.stringify(Types.EventType))):void b.ready(function(){b.logEvent(a,c,d,e);})},this.logError=function(a,c){if(!b._Store.isInitialized)return void b.ready(function(){b.logError(a,c);});if(b._SessionManager.resetSessionTimer(),!!a){"string"==typeof a&&(a={message:a});var d={m:a.message?a.message:a,s:"Error",t:a.stack};if(c){var e=b._Helpers.sanitizeAttributes(c);for(var f in e)d[f]=e[f];}b._Events.logEvent({messageType:Types.MessageType.CrashReport,name:a.name?a.name:"Error",data:d,eventType:Types.EventType.Other});}},this.logLink=function(a,c,d,e){b._Events.addEventHandler("click",a,c,e,d);},this.logForm=function(a,c,d,e){b._Events.addEventHandler("submit",a,c,e,d);},this.logPageView=function(a,c,d){if(!b._Store.isInitialized)return void b.ready(function(){b.logPageView(a,c,d);});if(b._SessionManager.resetSessionTimer(),b._Helpers.canLog()){if(b._Helpers.Validators.isStringOrNumber(a)||(a="PageView"),!c)c={hostname:window.location.hostname,title:window.document.title};else if(!b._Helpers.isObject(c))return void b.Logger.error("The attributes argument must be an object. A "+_typeof_1(c)+" was entered. Please correct and retry.");if(d&&!b._Helpers.isObject(d))return void b.Logger.error("The customFlags argument must be an object. A "+_typeof_1(d)+" was entered. Please correct and retry.")}b._Events.logEvent({messageType:Types.MessageType.PageView,name:a,data:c,eventType:Types.EventType.Unknown,customFlags:d});},this.Consent={/**
         * Creates a CCPA Opt Out Consent State.
         *
         * @method createCCPAConsent
         * @param {Boolean} optOut true represents a "data sale opt-out", false represents the user declining a "data sale opt-out"
         * @param {Number} timestamp Unix time (likely to be Date.now())
         * @param {String} consentDocument document version or experience that the user may have consented to
         * @param {String} location location where the user gave consent
         * @param {String} hardwareId hardware ID for the device or browser used to give consent. This property exists only to provide additional context and is not used to identify users
         * @return {Object} CCPA Consent State
         */createCCPAConsent:b._Consent.createPrivacyConsent,/**
         * Creates a GDPR Consent State.
         *
         * @method createGDPRConsent
         * @param {Boolean} consent true represents a "data sale opt-out", false represents the user declining a "data sale opt-out"
         * @param {Number} timestamp Unix time (likely to be Date.now())
         * @param {String} consentDocument document version or experience that the user may have consented to
         * @param {String} location location where the user gave consent
         * @param {String} hardwareId hardware ID for the device or browser used to give consent. This property exists only to provide additional context and is not used to identify users
         * @return {Object} GDPR Consent State
         */createGDPRConsent:b._Consent.createPrivacyConsent,/**
         * Creates a Consent State Object, which can then be used to set CCPA states, add multiple GDPR states, as well as get and remove these privacy states.
         *
         * @method createConsentState
         * @return {Object} ConsentState object
         */createConsentState:b._Consent.createConsentState},this.eCommerce={/**
         * Invoke these methods on the mParticle.eCommerce.Cart object.
         * Example: mParticle.eCommerce.Cart.add(...)
         * @class mParticle.eCommerce.Cart
         * @deprecated
         */Cart:{/**
             * Adds a product to the cart
             * @method add
             * @param {Object} product The product you want to add to the cart
             * @param {Boolean} [logEventBoolean] Option to log the event to mParticle's servers. If blank, no logging occurs.
             * @deprecated
             */add:function add(a,c){b.Logger.warning("Deprecated function eCommerce.Cart.add() will be removed in future releases");var d,e=b.Identity.getCurrentUser();e&&(d=e.getMPID()),b._Identity.mParticleUserCart(d).add(a,c);},/**
             * Removes a product from the cart
             * @method remove
             * @param {Object} product The product you want to add to the cart
             * @param {Boolean} [logEventBoolean] Option to log the event to mParticle's servers. If blank, no logging occurs.
             * @deprecated
             */remove:function remove(a,c){b.Logger.warning("Deprecated function eCommerce.Cart.remove() will be removed in future releases");var d,e=b.Identity.getCurrentUser();e&&(d=e.getMPID()),b._Identity.mParticleUserCart(d).remove(a,c);},/**
             * Clears the cart
             * @method clear
             * @deprecated
             */clear:function clear(){b.Logger.warning("Deprecated function eCommerce.Cart.clear() will be removed in future releases");var a,c=b.Identity.getCurrentUser();c&&(a=c.getMPID()),b._Identity.mParticleUserCart(a).clear();}},/**
         * Sets the currency code
         * @for mParticle.eCommerce
         * @method setCurrencyCode
         * @param {String} code The currency code
         */setCurrencyCode:function setCurrencyCode(a){return b._Store.isInitialized?"string"==typeof a?void(b._SessionManager.resetSessionTimer(),b._Store.currencyCode=a):void b.Logger.error("Code must be a string"):void b.ready(function(){b.setCurrencyCode(a);})},/**
         * Creates a product
         * @for mParticle.eCommerce
         * @method createProduct
         * @param {String} name product name
         * @param {String} sku product sku
         * @param {Number} price product price
         * @param {Number} [quantity] product quantity. If blank, defaults to 1.
         * @param {String} [variant] product variant
         * @param {String} [category] product category
         * @param {String} [brand] product brand
         * @param {Number} [position] product position
         * @param {String} [coupon] product coupon
         * @param {Object} [attributes] product attributes
         */createProduct:function createProduct(a,c,d,e,f,g,h,i,j,k){return b._Ecommerce.createProduct(a,c,d,e,f,g,h,i,j,k)},/**
         * Creates a promotion
         * @for mParticle.eCommerce
         * @method createPromotion
         * @param {String} id a unique promotion id
         * @param {String} [creative] promotion creative
         * @param {String} [name] promotion name
         * @param {Number} [position] promotion position
         */createPromotion:function createPromotion(a,c,d,e){return b._Ecommerce.createPromotion(a,c,d,e)},/**
         * Creates a product impression
         * @for mParticle.eCommerce
         * @method createImpression
         * @param {String} name impression name
         * @param {Object} product the product for which an impression is being created
         */createImpression:function createImpression(a,c){return b._Ecommerce.createImpression(a,c)},/**
         * Creates a transaction attributes object to be used with a checkout
         * @for mParticle.eCommerce
         * @method createTransactionAttributes
         * @param {String or Number} id a unique transaction id
         * @param {String} [affiliation] affilliation
         * @param {String} [couponCode] the coupon code for which you are creating transaction attributes
         * @param {Number} [revenue] total revenue for the product being purchased
         * @param {String} [shipping] the shipping method
         * @param {Number} [tax] the tax amount
         */createTransactionAttributes:function createTransactionAttributes(a,c,d,e,f,g){return b._Ecommerce.createTransactionAttributes(a,c,d,e,f,g)},/**
         * Logs a checkout action
         * @for mParticle.eCommerce
         * @method logCheckout
         * @param {Number} step checkout step number
         * @param {Object} options
         * @param {Object} attrs
         * @param {Object} [customFlags] Custom flags for the event
         */logCheckout:function logCheckout(a,c,d,e){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Events.logCheckoutEvent(a,c,d,e)):void b.ready(function(){b.eCommerce.logCheckout(a,c,d,e);})},/**
         * Logs a product action
         * @for mParticle.eCommerce
         * @method logProductAction
         * @param {Number} productActionType product action type as found [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/src/types.js#L206-L218)
         * @param {Object} product the product for which you are creating the product action
         * @param {Object} [attrs] attributes related to the product action
         * @param {Object} [customFlags] Custom flags for the event
         */logProductAction:function logProductAction(a,c,d,e){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Events.logProductActionEvent(a,c,d,e)):void b.ready(function(){b.eCommerce.logProductAction(a,c,d,e);})},/**
         * Logs a product purchase
         * @for mParticle.eCommerce
         * @method logPurchase
         * @param {Object} transactionAttributes transactionAttributes object
         * @param {Object} product the product being purchased
         * @param {Boolean} [clearCart] boolean to clear the cart after logging or not. Defaults to false
         * @param {Object} [attrs] other attributes related to the product purchase
         * @param {Object} [customFlags] Custom flags for the event
         */logPurchase:function logPurchase(a,c,d,e,f){return b._Store.isInitialized?a&&c?void(b._SessionManager.resetSessionTimer(),b._Events.logPurchaseEvent(a,c,e,f)):void b.Logger.error(Messages$8.ErrorMessages.BadLogPurchase):void b.ready(function(){b.eCommerce.logPurchase(a,c,d,e,f);})},/**
         * Logs a product promotion
         * @for mParticle.eCommerce
         * @method logPromotion
         * @param {Number} type the promotion type as found [here](https://github.com/mParticle/mparticle-sdk-javascript/blob/master-v2/src/types.js#L275-L279)
         * @param {Object} promotion promotion object
         * @param {Object} [attrs] boolean to clear the cart after logging or not
         * @param {Object} [customFlags] Custom flags for the event
         */logPromotion:function logPromotion(a,c,d,e){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Events.logPromotionEvent(a,c,d,e)):void b.ready(function(){b.eCommerce.logPromotion(a,c,d,e);})},/**
         * Logs a product impression
         * @for mParticle.eCommerce
         * @method logImpression
         * @param {Object} impression product impression object
         * @param {Object} attrs attributes related to the impression log
         * @param {Object} [customFlags] Custom flags for the event
         */logImpression:function logImpression(a,c,d){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Events.logImpressionEvent(a,c,d)):void b.ready(function(){b.eCommerce.logImpression(a,c,d);})},/**
         * Logs a refund
         * @for mParticle.eCommerce
         * @method logRefund
         * @param {Object} transactionAttributes transaction attributes related to the refund
         * @param {Object} product product being refunded
         * @param {Boolean} [clearCart] boolean to clear the cart after refund is logged. Defaults to false.
         * @param {Object} [attrs] attributes related to the refund
         * @param {Object} [customFlags] Custom flags for the event
         */logRefund:function logRefund(a,c,d,e,f){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Events.logRefundEvent(a,c,e,f)):void b.ready(function(){b.eCommerce.logRefund(a,c,d,e,f);})},expandCommerceEvent:function expandCommerceEvent(a){return b._Ecommerce.expandCommerceEvent(a)}},this.setSessionAttribute=function(a,c){if(!b._Store.isInitialized)return void b.ready(function(){b.setSessionAttribute(a,c);});// Logs to cookie
// And logs to in-memory object
// Example: mParticle.setSessionAttribute('location', '33431');
if(b._Helpers.canLog()){if(!b._Helpers.Validators.isValidAttributeValue(c))return void b.Logger.error(Messages$8.ErrorMessages.BadAttribute);if(!b._Helpers.Validators.isValidKeyValue(a))return void b.Logger.error(Messages$8.ErrorMessages.BadKey);if(b._Store.webviewBridgeEnabled)b._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.SetSessionAttribute,JSON.stringify({key:a,value:c}));else{var d=b._Helpers.findKeyInObject(b._Store.sessionAttributes,a);d&&(a=d),b._Store.sessionAttributes[a]=c,b._Persistence.update(),b._Forwarders.applyToForwarders("setSessionAttribute",[a,c]);}}},this.setOptOut=function(a){return b._Store.isInitialized?void(b._SessionManager.resetSessionTimer(),b._Store.isEnabled=!a,b._Events.logOptOut(),b._Persistence.update(),b._Store.activeForwarders.length&&b._Store.activeForwarders.forEach(function(c){if(c.setOptOut){var d=c.setOptOut(a);d&&b.Logger.verbose(d);}})):void b.ready(function(){b.setOptOut(a);})},this.setIntegrationAttribute=function(a,c){if(!b._Store.isInitialized)return void b.ready(function(){b.setIntegrationAttribute(a,c);});if("number"!=typeof a)return void b.Logger.error("integrationId must be a number");if(null===c)b._Store.integrationAttributes[a]={};else{if(!b._Helpers.isObject(c))return void b.Logger.error("Attrs must be an object with keys and values. You entered a "+_typeof_1(c));if(0===Object.keys(c).length)b._Store.integrationAttributes[a]={};else for(var d in c)if("string"!=typeof d){b.Logger.error("Keys must be strings, you entered a "+_typeof_1(d));continue}else if("string"==typeof c[d])b._Helpers.isObject(b._Store.integrationAttributes[a])?b._Store.integrationAttributes[a][d]=c[d]:(b._Store.integrationAttributes[a]={},b._Store.integrationAttributes[a][d]=c[d]);else{b.Logger.error("Values for integration attributes must be strings. You entered a "+_typeof_1(c[d]));continue}}b._Persistence.update();},this.getIntegrationAttributes=function(a){return b._Store.integrationAttributes[a]?b._Store.integrationAttributes[a]:{}},this.addForwarder=function(a){b._preInit.forwarderConstructors.push(a);},this.configurePixel=function(a){b._Forwarders.configurePixel(a);},this._getActiveForwarders=function(){return b._Store.activeForwarders},this._getIntegrationDelays=function(){return b._preInit.integrationDelays},this._setIntegrationDelay=function(a,c){b._preInit.integrationDelays[a]=c;};}function completeSDKInitialization(a,b,c){if(b.flags&&(b.flags.hasOwnProperty(Constants.FeatureFlags.EventsV3)&&(c._Store.SDKConfig.flags[Constants.FeatureFlags.EventsV3]=b.flags[Constants.FeatureFlags.EventsV3]),b.flags.hasOwnProperty(Constants.FeatureFlags.EventBatchingIntervalMillis)&&(c._Store.SDKConfig.flags[Constants.FeatureFlags.EventBatchingIntervalMillis]=b.flags[Constants.FeatureFlags.EventBatchingIntervalMillis])),c._Store.storageName=c._Helpers.createMainStorageName(b.workspaceToken),c._Store.prodStorageName=c._Helpers.createProductStorageName(b.workspaceToken),b.hasOwnProperty("workspaceToken")?c._Store.SDKConfig.workspaceToken=b.workspaceToken:c.Logger.warning("You should have a workspaceToken on your config object for security purposes."),b.hasOwnProperty("requiredWebviewBridgeName")?c._Store.SDKConfig.requiredWebviewBridgeName=b.requiredWebviewBridgeName:b.hasOwnProperty("workspaceToken")&&(c._Store.SDKConfig.requiredWebviewBridgeName=b.workspaceToken),c._Store.webviewBridgeEnabled=c._NativeSdkHelpers.isWebviewEnabled(c._Store.SDKConfig.requiredWebviewBridgeName,c._Store.SDKConfig.minWebviewBridgeVersion),c._Store.configurationLoaded=!0,c._Store.webviewBridgeEnabled||(c._Migrations.migrate(),c._Persistence.initializeStorage()),c._Store.webviewBridgeEnabled)c._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.SetSessionAttribute,JSON.stringify({key:"$src_env",value:"webview"})),a&&c._NativeSdkHelpers.sendToNative(Constants.NativeSdkPaths.SetSessionAttribute,JSON.stringify({key:"$src_key",value:a}));else{var d;// If no initialIdentityRequest is passed in, we set the user identities to what is currently in cookies for the identify request
if(c._Helpers.isObject(c._Store.SDKConfig.identifyRequest)&&c._Helpers.isObject(c._Store.SDKConfig.identifyRequest.userIdentities)&&0===Object.keys(c._Store.SDKConfig.identifyRequest.userIdentities).length||!c._Store.SDKConfig.identifyRequest){var e={};if(d=c.Identity.getCurrentUser(),d){var f=d.getUserIdentities().userIdentities||{};for(var g in f)f.hasOwnProperty(g)&&(e[g]=f[g]);}c._Store.SDKConfig.identifyRequest={userIdentities:e};}// If migrating from pre-IDSync to IDSync, a sessionID will exist and an identify request will not have been fired, so we need this check
c._Store.migratingToIDSyncCookies&&(c.Identity.identify(c._Store.SDKConfig.identifyRequest,c._Store.SDKConfig.identityCallback),c._Store.migratingToIDSyncCookies=!1),d=c.Identity.getCurrentUser(),c._Helpers.getFeatureFlag(Constants.FeatureFlags.ReportBatching)&&c._ForwardingStatsUploader.startForwardingStatsTimer(),c._Forwarders.processForwarders(b,c._APIClient.prepareForwardingStats),!c._Store.identifyCalled&&c._Store.SDKConfig.identityCallback&&d&&d.getMPID()&&c._Store.SDKConfig.identityCallback({httpCode:HTTPCodes$2.activeSession,getUser:function getUser(){return c._Identity.mParticleUser(d.getMPID())},getPreviousUser:function getPreviousUser(){var a=c.Identity.getUsers(),b=a.shift();return b&&d&&b.getMPID()===d.getMPID()&&(b=a.shift()),b||null},body:{mpid:d.getMPID(),is_logged_in:c._Store.isLoggedIn,matched_identities:d.getUserIdentities().userIdentities,context:null,is_ephemeral:!1}}),c._SessionManager.initialize(),c._Events.logAST();}c._Store.isInitialized=!0,c._preInit.readyQueue&&c._preInit.readyQueue.length&&(c._preInit.readyQueue.forEach(function(a){c._Helpers.Validators.isFunction(a)?a():Array.isArray(a)&&processPreloadedItem(a,c);}),c._preInit.readyQueue=[]),c._Store.isFirstRun&&(c._Store.isFirstRun=!1);}function runPreConfigFetchInitialization(a,b,c){a.Logger=new Logger(c),a._Store=new Store(c,a),window.mParticle.Store=a._Store,a._Store.devToken=b||null,a.Logger.verbose(Messages$8.InformationMessages.StartingInitialization);//check to see if localStorage is available for migrating purposes
try{a._Store.isLocalStorageAvailable=a._Persistence.determineLocalStorageAvailability(window.localStorage);}catch(b){a.Logger.warning("localStorage is not available, using cookies if avaialble"),a._Store.isLocalStorageAvailable=!1;}}function processPreloadedItem(a,b){var c=a,d=c.splice(0,1)[0];// if the first argument is a method on the base mParticle object, run it
if(mParticle[c[0]])mParticle[d].apply(this,c);else{var e=d.split(".");try{for(var f,g=mParticle,h=0;h<e.length;h++)f=e[h],g=g[f];g.apply(this,c);}catch(a){b.Logger.verbose("Unable to compute proper mParticle function "+a);}}}

var _BatchValidator = /*#__PURE__*/ function () {
    function a() { classCallCheck(this, a); }
    return createClass(a, [{ key: "getMPInstance", value: function getMPInstance() {
                return {
                    _Helpers: { sanitizeAttributes: window.mParticle.getInstance()._Helpers.sanitizeAttributes, generateUniqueId: function generateUniqueId() { return "mockId"; }, extend: window.mParticle.getInstance()._Helpers.extend }, _Store: { sessionId: "mockSessionId", SDKConfig: {} }, Identity: { getCurrentUser: function getCurrentUser() { return null; } }, getAppVersion: function getAppVersion() { return null; }, getAppName: function getAppName() { return null; }
                };
            } }, { key: "returnBatch", value: function returnBatch(a) { var b = this.getMPInstance(), c = new ServerModel(b).createEventObject(a), d = convertEvents("0", [c], b); return d; } }]), a;
}();

Array.prototype.forEach||(Array.prototype.forEach=Polyfill.forEach),Array.prototype.map||(Array.prototype.map=Polyfill.map),Array.prototype.filter||(Array.prototype.filter=Polyfill.filter),Array.isArray||(Array.prototype.isArray=Polyfill.isArray);function mParticle$1(){var a=this;// Only leaving this here in case any clients are trying to access mParticle.Store, to prevent from throwing
/**
     * Initializes the mParticle instance. If no instanceName is provided, an instance name of `default_instance` will be used.
     * <p>
     * If you'd like to initiate multiple mParticle instances, first review our <a href="https://docs.mparticle.com/developers/sdk/web/multiple-instances/">doc site</a>, and ensure you pass a unique instance name as the third argument as shown below.
     * @method init
     * @param {String} apiKey your mParticle assigned API key
     * @param {Object} [config] an options object for additional configuration
     * @param {String} [instanceName] If you are self hosting the JS SDK and working with multiple instances, you would pass an instanceName to `init`. This instance will be selected when invoking other methods. See the above link to the doc site for more info and examples.
     */this.Store={},this._instances={},this.IdentityType=Types.IdentityType,this.EventType=Types.EventType,this.CommerceEventType=Types.CommerceEventType,this.PromotionType=Types.PromotionActionType,this.ProductActionType=Types.ProductActionType,this.isIOS=!!(window.mParticle&&window.mParticle.isIOS)&&window.mParticle.isIOS,this.config=window.mParticle&&window.mParticle.config?window.mParticle.config:{},this.init=function(b,c,d){!c&&window.mParticle&&window.mParticle.config&&(window.console.warn("You did not pass a config object to mParticle.init(). Attempting to use the window.mParticle.config if it exists. Please note that in a future release, this may not work and mParticle will not initialize properly"),c=window.mParticle?window.mParticle.config:{}),d=(d&&0!==d.length?d:Constants.DefaultInstance).toLowerCase();var e=a._instances[d];e===void 0&&(e=new mParticleInstance(b,c,d),a._instances[d]=e),e.init(b,c,d);},this.getInstance=function(b){var c;return b?(c=a._instances[b.toLowerCase()],c?c:(console.log("You tried to initialize an instance named "+b+". This instance does not exist. Check your instance name or initialize a new instance with this name before calling it."),null)):(b=Constants.DefaultInstance,c=a._instances[b],c||(c=new mParticleInstance(b),a._instances[Constants.DefaultInstance]=c),c)},this.getDeviceId=function(){return a.getInstance().getDeviceId()},this.startNewSession=function(){a.getInstance().startNewSession();},this.endSession=function(){a.getInstance().endSession();},this.setLogLevel=function(b){a.getInstance().setLogLevel(b);},this.ready=function(b){a.getInstance().ready(b);},this.setAppVersion=function(b){a.getInstance().setAppVersion(b);},this.getAppName=function(){return a.getInstance().getAppName()},this.setAppName=function(b){a.getInstance().setAppName(b);},this.getAppVersion=function(){return a.getInstance().getAppVersion()},this.stopTrackingLocation=function(){a.getInstance().stopTrackingLocation();},this.startTrackingLocation=function(b){a.getInstance().startTrackingLocation(b);},this.setPosition=function(b,c){a.getInstance().setPosition(b,c);},this.startNewSession=function(){a.getInstance().startNewSession();},this.endSession=function(){a.getInstance().endSession();},this.logBaseEvent=function(b){a.getInstance().logBaseEvent(b);},this.logEvent=function(b,c,d,e){a.getInstance().logEvent(b,c,d,e);},this.logError=function(b,c){a.getInstance().logError(b,c);},this.logLink=function(b,c,d,e){a.getInstance().logLink(b,c,d,e);},this.logForm=function(b,c,d,e){a.getInstance().logForm(b,c,d,e);},this.logPageView=function(b,c,d){a.getInstance().logPageView(b,c,d);},this.eCommerce={Cart:{add:function add(b,c){a.getInstance().eCommerce.Cart.add(b,c);},remove:function remove(b,c){a.getInstance().eCommerce.Cart.remove(b,c);},clear:function clear(){a.getInstance().eCommerce.Cart.clear();}},setCurrencyCode:function setCurrencyCode(b){a.getInstance().eCommerce.setCurrencyCode(b);},createProduct:function createProduct(b,c,d,e,f,g,h,i,j,k){return a.getInstance().eCommerce.createProduct(b,c,d,e,f,g,h,i,j,k)},createPromotion:function createPromotion(b,c,d,e){return a.getInstance().eCommerce.createPromotion(b,c,d,e)},createImpression:function createImpression(b,c){return a.getInstance().eCommerce.createImpression(b,c)},createTransactionAttributes:function createTransactionAttributes(b,c,d,e,f,g){return a.getInstance().eCommerce.createTransactionAttributes(b,c,d,e,f,g)},logCheckout:function logCheckout(b,c,d,e){a.getInstance().eCommerce.logCheckout(b,c,d,e);},logProductAction:function logProductAction(b,c,d,e){a.getInstance().eCommerce.logProductAction(b,c,d,e);},logPurchase:function logPurchase(b,c,d,e,f){a.getInstance().eCommerce.logPurchase(b,c,d,e,f);},logPromotion:function logPromotion(b,c,d,e){a.getInstance().eCommerce.logPromotion(b,c,d,e);},logImpression:function logImpression(b,c,d){a.getInstance().eCommerce.logImpression(b,c,d);},logRefund:function logRefund(b,c,d,e,f){a.getInstance().eCommerce.logRefund(b,c,d,e,f);},expandCommerceEvent:function expandCommerceEvent(b){return a.getInstance().eCommerce.expandCommerceEvent(b)}},this.setSessionAttribute=function(b,c){a.getInstance().setSessionAttribute(b,c);},this.setOptOut=function(b){a.getInstance().setOptOut(b);},this.setIntegrationAttribute=function(b,c){a.getInstance().setIntegrationAttribute(b,c);},this.getIntegrationAttributes=function(b){return a.getInstance().getIntegrationAttributes(b)},this.Identity={HTTPCodes:a.getInstance().Identity.HTTPCodes,aliasUsers:function aliasUsers(b,c){a.getInstance().Identity.aliasUsers(b,c);},createAliasRequest:function createAliasRequest(b,c){return a.getInstance().Identity.createAliasRequest(b,c)},getCurrentUser:function getCurrentUser(){return a.getInstance().Identity.getCurrentUser()},getUser:function getUser(b){return a.getInstance().Identity.getUser(b)},getUsers:function getUsers(){return a.getInstance().Identity.getUsers()},identify:function identify(b,c){a.getInstance().Identity.identify(b,c);},login:function login(b,c){a.getInstance().Identity.login(b,c);},logout:function logout(b,c){a.getInstance().Identity.logout(b,c);},modify:function modify(b,c){a.getInstance().Identity.modify(b,c);}},this.sessionManager={getSession:function getSession(){return a.getInstance()._SessionManager.getSession()}},this.Consent={createConsentState:function createConsentState(){return a.getInstance().Consent.createConsentState()},createGDPRConsent:function createGDPRConsent(b,c,d,e,f){return a.getInstance().Consent.createGDPRConsent(b,c,d,e,f)},createCCPAConsent:function createCCPAConsent(b,c,d,e,f){return a.getInstance().Consent.createGDPRConsent(b,c,d,e,f)}},this.reset=function(){a.getInstance().reset(a.getInstance());},this._resetForTests=function(b,c){"boolean"==typeof c?a.getInstance()._resetForTests(b,c,a.getInstance()):a.getInstance()._resetForTests(b,!1,a.getInstance());},this.configurePixel=function(b){a.getInstance().configurePixel(b);},this._setIntegrationDelay=function(b,c){a.getInstance()._setIntegrationDelay(b,c);},this._getIntegrationDelays=function(){return a.getInstance()._getIntegrationDelays()},this.getVersion=function(){return a.getInstance().getVersion()},this.generateHash=function(b){return a.getInstance().generateHash(b)},this.addForwarder=function(b){a.getInstance().addForwarder(b);},this._getActiveForwarders=function(){return a.getInstance()._getActiveForwarders()};}var mparticleInstance=new mParticle$1;window.mParticle=mparticleInstance,window.mParticle._BatchValidator=new _BatchValidator;

module.exports = mparticleInstance;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":3,"buffer":4,"ieee754":5}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
module.exports = function format(msg) {
  var args = arguments;
  for(var i = 1, l = args.length; i < l; i++) {
    msg = msg.replace(/%s/, args[i]);
  }
  return msg;
}

},{}],7:[function(require,module,exports){
var getType = require('should-type');
var format = require('./format');
var hasOwnProperty = Object.prototype.hasOwnProperty;

function makeResult(r, path, reason, a, b) {
  var o = {result: r};
  if(!r) {
    o.path = path;
    o.reason = reason;
    o.a = a;
    o.b = b;
  }
  return o;
}

var EQUALS = makeResult(true);

function typeToString(t) {
  return t.type + (t.cls ? '(' + t.cls + (t.sub ? ' ' + t.sub : '') + ')' : '');
}



var REASON = {
  PLUS_0_AND_MINUS_0: '+0 is not equal to -0',
  DIFFERENT_TYPES: 'A has type %s and B has type %s',
  NAN_NUMBER: 'NaN is not equal to any number',
  EQUALITY: 'A is not equal to B',
  EQUALITY_PROTOTYPE: 'A and B have different prototypes',
  WRAPPED_VALUE: 'A wrapped value is not equal to B wrapped value',
  FUNCTION_SOURCES: 'function A is not equal to B by source code value (via .toString call)',
  MISSING_KEY: '%s has no key %s',
  CIRCULAR_VALUES: 'A has circular reference that was visited not in the same time as B',
  SET_MAP_MISSING_KEY: 'Set/Map missing key',
  MAP_VALUE_EQUALITY: 'Values of the same key in A and B is not equal'
};

function eqInternal(a, b, opts, stackA, stackB, path) {
  var r = EQUALS;

  function result(comparison, reason) {
    return makeResult(comparison, path, reason, a, b);
  }

  function checkPropertyEquality(property) {
    return eqInternal(a[property], b[property], opts, stackA, stackB, path.concat([property]));
  }


  // equal a and b exit early
  if(a === b) {
    // check for +0 !== -0;
    return result(a !== 0 || (1 / a == 1 / b), REASON.PLUS_0_AND_MINUS_0);
  }

  var l, p;

  var typeA = getType(a),
    typeB = getType(b);

  // if objects has different types they are not equals
  var typeDifferents = typeA.type !== typeB.type || typeA.cls !== typeB.cls;

  if(typeDifferents || ((opts.checkSubType && typeA.sub !== typeB.sub) || !opts.checkSubType)) {
    return result(false, format(REASON.DIFFERENT_TYPES, typeToString(typeA), typeToString(typeB)));
  }

  //early checks for types
  switch(typeA.type) {
    case 'number':
      // NaN !== NaN
      return (a !== a) ? result(b !== b, REASON.NAN_NUMBER)
        // but treat `+0` vs. `-0` as not equal
        : (a === 0 ? result(1 / a === 1 / b, REASON.PLUS_0_AND_MINUS_0) : result(a === b, REASON.EQUALITY));

    case 'boolean':
    case 'string':
      return result(a === b, REASON.EQUALITY);

    case 'function':
      var fA = a.toString(), fB = b.toString();
      r = eqInternal(fA, fB, opts, stackA, stackB, path);
      if(!r.result) {
        r.reason = REASON.FUNCTION_SOURCES;
        return r;
      }

      break;//check user properties

    case 'object':
      // additional checks for object instances
      switch(typeA.cls) {
        // check regexp flags
        // TODO add es6 flags
        case 'regexp':
          p = ['source', 'global', 'multiline', 'lastIndex', 'ignoreCase'];
          while(p.length) {
            r = checkPropertyEquality(p.shift());
            if(!r.result) return r;
          }
          break;//check user properties

        //check by timestamp only
        case 'date':
          if(+a !== +b) {
            return result(false, REASON.EQUALITY);
          }
          break;//check user properties

        //primitive type wrappers
        case 'number':
        case 'boolean':
        case 'string':
          r = eqInternal(a.valueOf(), b.valueOf(), opts, stackA, stackB, path);
          if(!r.result) {
            r.reason = REASON.WRAPPED_VALUE;
            return r;
          }
          break;//check user properties

        //node buffer
        case 'buffer':
          //if length different it is obviously different
          r = checkPropertyEquality('length');
          if(!r.result) return r;

          l = a.length;
          while(l--) {
            r = checkPropertyEquality(l);
            if(!r.result) return r;
          }

          //we do not check for user properties because
          //node Buffer have some strange hidden properties
          return EQUALS;

        case 'error':
          //check defined properties
          p = ['name', 'message'];
          while(p.length) {
            r = checkPropertyEquality(p.shift());
            if(!r.result) return r;
          }

          break;//check user properties

        case 'array':
        case 'arguments':
        case 'typed-array':
          r = checkPropertyEquality('length');
          if(!r.result) return r;

          break;//check user properties

        case 'array-buffer':
          r = checkPropertyEquality('byteLength');
          if(!r.result) return r;

          break;//check user properties

        case 'map':
        case 'set':
          r = checkPropertyEquality('size');
          if(!r.result) return r;

          stackA.push(a);
          stackB.push(b);

          var itA = a.entries();
          var nextA = itA.next();

          while(!nextA.done) {
            var key = nextA.value[0];
            //first check for primitive key if we can do light check
            //using .has and .get
            if(getType(key).type != 'object') {
              if(b.has(key)) {
                if(typeA.cls == 'map') {
                  //for map we also check its value to be equal
                  var value = b.get(key);
                  r = eqInternal(nextA.value[1], value, opts, stackA, stackB, path);
                  if(!r.result) {
                    r.a = nextA.value;
                    r.b = value;
                    r.reason = REASON.MAP_VALUE_EQUALITY;

                    break;
                  }
                }

              } else {
                r = result(false, REASON.SET_MAP_MISSING_KEY);
                r.a = key;
                r.b = key;

                break;
              }
            } else {
              //heavy check
              //we search by iterator for key equality using equal
              var itB = b.entries();
              var nextB = itB.next();

              while(!nextB.done) {
                //first check for keys
                r = eqInternal(nextA.value[0], nextB.value[0], opts, stackA, stackB, path);

                if(!r.result) {
                  r.reason = REASON.SET_MAP_MISSING_KEY;
                  r.a = key;
                  r.b = key;
                } else {
                  if(typeA.cls == 'map') {
                    r = eqInternal(nextA.value[1], nextB.value[1], opts, stackA, stackB, path);

                    if(!r.result) {
                      r.a = nextA.value;
                      r.b = nextB.value;
                      r.reason = REASON.MAP_VALUE_EQUALITY;
                    }
                  }

                  break;
                }

                nextB = itB.next();
              }
            }

            if(!r.result) {
              break;
            }

            nextA = itA.next();
          }

          stackA.pop();
          stackB.pop();

          if(!r.result) {
            r.reason = REASON.SET_MAP_MISSING_ENTRY;
            return r;
          }

          break; //check user properties
      }
  }

  // compare deep objects and arrays
  // stacks contain references only
  //

  l = stackA.length;
  while(l--) {
    if(stackA[l] == a) {
      return result(stackB[l] == b, REASON.CIRCULAR_VALUES);
    }
  }

  // add `a` and `b` to the stack of traversed objects
  stackA.push(a);
  stackB.push(b);

  var key;

  for(key in b) {
    if(hasOwnProperty.call(b, key)) {
      r = result(hasOwnProperty.call(a, key), format(REASON.MISSING_KEY, 'A', key));
      if(!r.result) {
        break;
      }

      if(r.result) {
        r = checkPropertyEquality(key);
        if(!r.result) {
          break;
        }
      }
    }
  }

  if(r.result) {
    // ensure both objects have the same number of properties
    for(key in a) {
      if(hasOwnProperty.call(a, key)) {
        r = result(hasOwnProperty.call(b, key), format(REASON.MISSING_KEY, 'B', key));
        if(!r.result) {
          return r;
        }
      }
    }
  }

  stackA.pop();
  stackB.pop();

  if(!r.result) return r;

  var prototypesEquals = false, canComparePrototypes = false;

  if(opts.checkProtoEql) {
    if(Object.getPrototypeOf) {//TODO should i check prototypes for === or use eq?
      prototypesEquals = Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
      canComparePrototypes = true;
    } else if(a.__proto__ && b.__proto__) {
      prototypesEquals = a.__proto__ === b.__proto__;
      canComparePrototypes = true;
    }

    if(canComparePrototypes && !prototypesEquals) {
      r = result(prototypesEquals, REASON.EQUALITY_PROTOTYPE);
      r.showReason = true;
      if(!r.result) {
        return r;
      }
    }
  }

  return EQUALS;
}

var defaultOptions = {
  checkProtoEql: true,
  checkSubType: true
};

function eq(a, b, opts) {
  opts = opts || {};
  if(typeof opts.checkProtoEql !== 'boolean')
    opts.checkProtoEql = defaultOptions.checkProtoEql;
  if(typeof opts.checkSubType !== 'boolean')
    opts.checkSubType = defaultOptions.checkSubType;

  var r = eqInternal(a, b, opts, [], [], []);
  return r;
}

module.exports = eq;

eq.r = REASON;

},{"./format":6,"should-type":10}],8:[function(require,module,exports){
var getType = require('should-type');
var util = require('./util');

function genKeysFunc(f) {
  return function(value) {
    var k = f(value);
    k.sort();
    return k;
  };
}


function Formatter(opts) {
  opts = opts || {};

  this.seen = [];
  this.keys = genKeysFunc(opts.keys === false ? Object.getOwnPropertyNames : Object.keys);

  this.maxLineLength = typeof opts.maxLineLength === 'number' ? opts.maxLineLength : 60;
  this.propSep = opts.propSep || ',';

  this.isUTCdate = !!opts.isUTCdate;
}

Formatter.prototype = {
  constructor: Formatter,

  format: function(value) {
    var t = getType(value);
    var name1 = t.type, name2 = t.type;
    if(t.cls) {
      name1 += '_' + t.cls;
      name2 += '_' + t.cls;
    }
    if(t.sub) {
      name2 += '_' + t.sub;
    }
    var f = this['_format_' + name2] || this['_format_' + name1] || this['_format_' + t.type] || this.defaultFormat;
    return f.call(this, value).trim();
  },

  _formatObject: function(value, opts) {
    opts = opts || {};
    var mainKeys = opts.keys || this.keys(value);

    var len = 0;

    var formatPropertyValue = opts.formatPropertyValue || this.formatPropertyValue;
    var formatPropertyName = opts.formatPropertyName || this.formatPropertyName;
    var keyValueSep = opts.keyValueSep || ': ';
    var keyFilter = opts.keyFilter || function() { return true; };

    this.seen.push(value);
    var keys = [];

    mainKeys.forEach(function(key) {
      if(!keyFilter(key)) return;

      var fName = formatPropertyName.call(this, key);

      var f = (fName ? fName + keyValueSep : '') + formatPropertyValue.call(this, value, key);
      len += f.length;
      keys.push(f);
    }, this);
    this.seen.pop();

    (opts.additionalProperties || []).forEach(function(keyValue) {
      var f = keyValue[0] + keyValueSep + this.format(keyValue[1]);
      len += f.length;
      keys.push(f);
    }, this);

    var prefix = opts.prefix || Formatter.constructorName(value) || '';
    if(prefix.length > 0) prefix += ' ';

    var lbracket, rbracket;
    if(Array.isArray(opts.brackets)) {
      lbracket = opts.brackets && opts.brackets[0];
      rbracket = opts.brackets && opts.brackets[1];
    } else {
      lbracket = '{';
      rbracket = '}';
    }

    var rootValue = opts.value || '';

    if(keys.length === 0)
      return rootValue || (prefix + lbracket + rbracket);

    if(len <= this.maxLineLength) {
      return prefix + lbracket + ' ' + (rootValue ? rootValue + ' ' : '') + keys.join(this.propSep + ' ') + ' ' + rbracket;
    } else {
      return prefix + lbracket + '\n' + (rootValue ? '  ' + rootValue + '\n' : '') + keys.map(util.addSpaces).join(this.propSep + '\n') + '\n' + rbracket;
    }
  },

  formatObject: function(value, prefix, props) {
    props = props || this.keys(value);

    var len = 0;

    this.seen.push(value);
    props = props.map(function(prop) {
      var f = this.formatProperty(value, prop);
      len += f.length;
      return f;
    }, this);
    this.seen.pop();

    if(props.length === 0) return '{}';

    if(len <= this.maxLineLength) {
      return '{ ' + (prefix ? prefix + ' ' : '') + props.join(this.propSep + ' ') + ' }';
    } else {
      return '{' + '\n' + (prefix ? '  ' + prefix + '\n' : '') + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
    }
  },

  formatPropertyName: function(name) {
    return name.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) ? name : this.format(name);
  },

  formatProperty: function(value, prop) {
    var desc = Formatter.getPropertyDescriptor(value, prop);

    var propName = this.formatPropertyName(prop);

    var propValue = desc.get && desc.set ?
      '[Getter/Setter]' : desc.get ?
      '[Getter]' : desc.set ?
      '[Setter]' : this.seen.indexOf(desc.value) >= 0 ?
      '[Circular]' :
      this.format(desc.value);

    return propName + ': ' + propValue;
  },

  formatPropertyValue: function(value, prop) {
    var desc = Formatter.getPropertyDescriptor(value, prop);

    var propValue = desc.get && desc.set ?
      '[Getter/Setter]' : desc.get ?
      '[Getter]' : desc.set ?
      '[Setter]' : this.seen.indexOf(desc.value) >= 0 ?
      '[Circular]' :
      this.format(desc.value);

    return propValue;
  }
};

Formatter.add = function add(type, cls, sub, f) {
  var args = Array.prototype.slice.call(arguments);
  f = args.pop();
  Formatter.prototype['_format_' + args.join('_')] = f;
};

Formatter.formatObjectWithPrefix = function formatObjectWithPrefix(f) {
  return function(value) {
    var prefix = f.call(this, value);
    var props = this.keys(value);
    if(props.length == 0) return prefix;
    else return this.formatObject(value, prefix, props);
  };
};

var functionNameRE = /^\s*function\s*(\S*)\s*\(/;

Formatter.functionName = function functionName(f) {
  if(f.name) {
    return f.name;
  }
  var name = f.toString().match(functionNameRE)[1];
  return name;
};

Formatter.constructorName = function(obj) {
  while (obj) {
    var descriptor = Object.getOwnPropertyDescriptor(obj, 'constructor');
    if (descriptor !== undefined &&
        typeof descriptor.value === 'function') {

        var name = Formatter.functionName(descriptor.value);
        if(name !== '') {
          return name;
        }
    }

    obj = Object.getPrototypeOf(obj);
  }
};

Formatter.getPropertyDescriptor = function(obj, value) {
  var desc;
  try {
    desc = Object.getOwnPropertyDescriptor(obj, value) || {value: obj[value]};
  } catch(e) {
    desc = {value: e};
  }
  return desc;
};

Formatter.generateFunctionForIndexedArray = function generateFunctionForIndexedArray(lengthProp, name, padding) {
  return function(value) {
    var max = this.byteArrayMaxLength || 50;
    var length = value[lengthProp];
    var formattedValues = [];
    var len = 0;
    for(var i = 0; i < max && i < length; i++) {
      var b = value[i] || 0;
      var v = util.pad0(b.toString(16), padding);
      len += v.length;
      formattedValues.push(v);
    }
    var prefix = value.constructor.name || name || '';
    if(prefix) prefix += ' ';

    if(formattedValues.length === 0)
      return prefix + '[]';

    if(len <= this.maxLineLength) {
      return prefix + '[ ' + formattedValues.join(this.propSep + ' ') + ' ' + ']';
    } else {
      return prefix + '[\n' + formattedValues.map(util.addSpaces).join(this.propSep + '\n') + '\n' + ']';
    }
  };
};

Formatter.add('undefined', function() { return 'undefined' });
Formatter.add('null', function() { return 'null' });
Formatter.add('boolean', function(value) { return value ? 'true': 'false' });
Formatter.add('symbol', function(value) { return value.toString() });

['number', 'boolean'].forEach(function(name) {
  Formatter.add('object', name, function(value) {
    return this._formatObject(value, {
      additionalProperties: [['[[PrimitiveValue]]', value.valueOf()]]
    });
  });
});

Formatter.add('object', 'string', function(value) {
  var realValue = value.valueOf();

  return this._formatObject(value, {
    keyFilter: function(key) {
      //skip useless indexed properties
      return !(key.match(/\d+/) && parseInt(key, 10) < realValue.length);
    },
    additionalProperties: [['[[PrimitiveValue]]', realValue]]
  });
});

Formatter.add('object', 'regexp', function(value) {
  return this._formatObject(value, {
    value: String(value)
  });
});

Formatter.add('number', function(value) {
  if(value === 0 && 1 / value < 0) return '-0';
  return String(value);
});

Formatter.add('string', function(value) {
  return '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
      .replace(/'/g, "\\'")
      .replace(/\\"/g, '"') + '\'';
});

Formatter.add('object', function(value) {
  return this._formatObject(value);
});

Formatter.add('object', 'arguments', function(value) {
  return this._formatObject(value, {
    prefix: 'Arguments',
    formatPropertyName: function(key) {
      if(!key.match(/\d+/)) {
        return this.formatPropertyName(key);
      }
    },
    brackets: ['[', ']']
  });
});

Formatter.add('object', 'array', function(value) {
  return this._formatObject(value, {
    formatPropertyName: function(key) {
      if(!key.match(/\d+/)) {
        return this.formatPropertyName(key);
      }
    },
    brackets: ['[', ']']
  });
});


function formatDate(value, isUTC) {
  var prefix = isUTC ? 'UTC' : '';

  var date = value['get' + prefix + 'FullYear']() +
    '-' +
    util.pad0(value['get' + prefix + 'Month']() + 1, 2) +
    '-' +
    util.pad0(value['get' + prefix + 'Date'](), 2);

  var time = util.pad0(value['get' + prefix + 'Hours'](), 2) +
    ':' +
    util.pad0(value['get' + prefix + 'Minutes'](), 2) +
    ':' +
    util.pad0(value['get' + prefix + 'Seconds'](), 2) +
    '.' +
    util.pad0(value['get' + prefix + 'Milliseconds'](), 3);

  var to = value.getTimezoneOffset();
  var absTo = Math.abs(to);
  var hours = Math.floor(absTo / 60);
  var minutes = absTo - hours * 60;
  var tzFormat = (to < 0 ? '+' : '-') + util.pad0(hours, 2) + util.pad0(minutes, 2);

  return date + ' ' + time + (isUTC ? '' : ' ' + tzFormat);
}

Formatter.add('object', 'date', function(value) {
  return this._formatObject(value, { value: formatDate(value, this.isUTCdate) });
});

Formatter.add('function', function(value) {
  return this._formatObject(value, {
    additionalProperties: [['name', Formatter.functionName(value)]]
  });
});

Formatter.add('object', 'error', function(value) {
  return this._formatObject(value, {
    prefix: value.name,
    additionalProperties: [['message', value.message]]
  });
});

Formatter.add('object', 'buffer', Formatter.generateFunctionForIndexedArray('length', 'Buffer', 2));

Formatter.add('object', 'array-buffer', Formatter.generateFunctionForIndexedArray('byteLength', 'ArrayBuffer', 2));

Formatter.add('object', 'typed-array', 'int8', Formatter.generateFunctionForIndexedArray('length', 'Int8Array', 2));
Formatter.add('object', 'typed-array', 'uint8', Formatter.generateFunctionForIndexedArray('length', 'Uint8Array', 2));
Formatter.add('object', 'typed-array', 'uint8clamped', Formatter.generateFunctionForIndexedArray('length', 'Uint8ClampedArray', 2));

Formatter.add('object', 'typed-array', 'int16', Formatter.generateFunctionForIndexedArray('length', 'Int16Array', 4));
Formatter.add('object', 'typed-array', 'uint16', Formatter.generateFunctionForIndexedArray('length', 'Uint16Array', 4));

Formatter.add('object', 'typed-array', 'int32', Formatter.generateFunctionForIndexedArray('length', 'Int32Array', 8));
Formatter.add('object', 'typed-array', 'uint32', Formatter.generateFunctionForIndexedArray('length', 'Uint32Array', 8));

//TODO add float32 and float64

Formatter.add('object', 'promise', function() {
  return '[Promise]';//TODO it could be nice to inspect its state and value
});

Formatter.add('object', 'xhr', function() {
  return '[XMLHttpRequest]';//TODO it could be nice to inspect its state
});

Formatter.add('object', 'html-element', function(value) {
  return value.outerHTML;
});

Formatter.add('object', 'html-element', '#text', function(value) {
  return value.nodeValue;
});

Formatter.add('object', 'html-element', '#document', function(value) {
  return value.documentElement.outerHTML;
});

Formatter.add('object', 'host', function() {
  return '[Host]';
});

Formatter.add('object', 'set', function(value) {
  var iter = value.values();
  var len = 0;

  this.seen.push(value);

  var props = [];

  var next = iter.next();
  while(!next.done) {
    var val = next.value;
    var f = this.format(val);
    len += f.length;
    props.push(f);

    next = iter.next();
  }

  this.seen.pop();

  if(props.length === 0) return 'Set {}';

  if(len <= this.maxLineLength) {
    return 'Set { ' + props.join(this.propSep + ' ') + ' }';
  } else {
    return 'Set {\n' + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
  }
});

Formatter.add('object', 'map', function(value) {
  var iter = value.entries();
  var len = 0;

  this.seen.push(value);

  var props = [];

  var next = iter.next();
  while(!next.done) {
    var val = next.value;
    var fK = this.format(val[0]);
    var fV = this.format(val[1]);

    var f;
    if((fK.length + fV.length + 4) <= this.maxLineLength) {
      f = fK + ' => ' + fV;
    } else {
      f = fK + ' =>\n' + fV;
    }

    len += fK.length + fV.length + 4;
    props.push(f);

    next = iter.next();
  }

  this.seen.pop();

  if(props.length === 0) return 'Map {}';

  if(len <= this.maxLineLength) {
    return 'Map { ' + props.join(this.propSep + ' ') + ' }';
  } else {
    return 'Map {\n' + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
  }
});

Formatter.prototype.defaultFormat = Formatter.prototype._format_object;

function defaultFormat(value, opts) {
  return new Formatter(opts).format(value);
}

defaultFormat.Formatter = Formatter;
module.exports = defaultFormat;

},{"./util":9,"should-type":10}],9:[function(require,module,exports){
function addSpaces(v) {
  return v.split('\n').map(function(vv) { return '  ' + vv; }).join('\n');
}

function pad(str, value, filler) {
  str = String(str)
  var isRight = false;

  if(value < 0) {
    isRight = true;
    value = -value;
  }

  if(str.length < value) {
    var padding = new Array(value - str.length + 1).join(filler);
    return isRight ? str + padding : padding + str;
  } else{
    return str;
  }
}

module.exports = {
  addSpaces: addSpaces,
  pad: pad,
  pad0: function(str, value) {
    return pad(str, value, '0');
  }
};

},{}],10:[function(require,module,exports){
(function (Buffer){
var toString = Object.prototype.toString;

var types = require('./types');

/**
 * Simple data function to store type information
 * @param {string} type Usually what is returned from typeof
 * @param {string} cls  Sanitized @Class via Object.prototype.toString
 * @param {string} sub  If type and cls the same, and need to specify somehow
 * @private
 * @example
 *
 * //for null
 * new Type('null');
 *
 * //for Date
 * new Type('object', 'date');
 *
 * //for Uint8Array
 *
 * new Type('object', 'typed-array', 'uint8');
 */
function Type(type, cls, sub) {
  this.type = type;
  this.cls = cls;
  this.sub = sub;
}

/**
 * Function to store type checks
 * @private
 */
function TypeChecker() {
  this.checks = [];
}

TypeChecker.prototype = {
  add: function(func) {
    this.checks.push(func);
    return this;
  },

  addTypeOf: function(type, res) {
    return this.add(function(obj, tpeOf) {
      if(tpeOf === type) {
        return new Type(res);
      }
    });
  },

  addClass: function(cls, res, sub) {
    return this.add(function(obj, tpeOf, objCls) {
      if(objCls === cls) {
        return new Type(types.OBJECT, res, sub);
      }
    });
  },

  getType: function(obj) {
    var typeOf = typeof obj;
    var cls = toString.call(obj);

    for(var i = 0, l = this.checks.length; i < l; i++) {
      var res = this.checks[i].call(this, obj, typeOf, cls);
      if(typeof res !== 'undefined') return res;
    }

  }
};

var main = new TypeChecker();

//TODO add iterators

main
  .addTypeOf(types.NUMBER, types.NUMBER)
  .addTypeOf(types.UNDEFINED, types.UNDEFINED)
  .addTypeOf(types.STRING, types.STRING)
  .addTypeOf(types.BOOLEAN, types.BOOLEAN)
  .addTypeOf(types.FUNCTION, types.FUNCTION)
  .addTypeOf(types.SYMBOL, types.SYMBOL)
  .add(function(obj, tpeOf) {
    if(obj === null) return new Type(types.NULL);
  })
  .addClass('[object String]', types.STRING)
  .addClass('[object Boolean]', types.BOOLEAN)
  .addClass('[object Number]', types.NUMBER)
  .addClass('[object Array]', types.ARRAY)
  .addClass('[object RegExp]', types.REGEXP)
  .addClass('[object Error]', types.ERROR)
  .addClass('[object Date]', types.DATE)
  .addClass('[object Arguments]', types.ARGUMENTS)
  .addClass('[object Math]')
  .addClass('[object JSON]')
  .addClass('[object ArrayBuffer]', types.ARRAY_BUFFER)
  .addClass('[object Int8Array]', types.TYPED_ARRAY, 'int8')
  .addClass('[object Uint8Array]', types.TYPED_ARRAY, 'uint8')
  .addClass('[object Uint8ClampedArray]', types.TYPED_ARRAY, 'uint8clamped')
  .addClass('[object Int16Array]', types.TYPED_ARRAY, 'int16')
  .addClass('[object Uint16Array]', types.TYPED_ARRAY, 'uint16')
  .addClass('[object Int32Array]', types.TYPED_ARRAY, 'int32')
  .addClass('[object Uint32Array]', types.TYPED_ARRAY, 'uint32')
  .addClass('[object Float32Array]', types.TYPED_ARRAY, 'float32')
  .addClass('[object Float64Array]', types.TYPED_ARRAY, 'float64')
  .addClass('[object DataView]', types.DATA_VIEW)
  .addClass('[object Map]', types.MAP)
  .addClass('[object WeakMap]', types.WEAK_MAP)
  .addClass('[object Set]', types.SET)
  .addClass('[object WeakSet]', types.WEAK_SET)
  .addClass('[object Promise]', types.PROMISE)
  .addClass('[object Blob]', types.BLOB)
  .addClass('[object File]', types.FILE)
  .addClass('[object FileList]', types.FILE_LIST)
  .addClass('[object XMLHttpRequest]', types.XHR)
  .add(function(obj) {
    if((typeof Promise === types.FUNCTION && obj instanceof Promise) ||
        (typeof obj.then === types.FUNCTION)) {
          return new Type(types.OBJECT, types.PROMISE);
        }
  })
  .add(function(obj) {
    if(typeof Buffer !== 'undefined' && obj instanceof Buffer) {
      return new Type(types.OBJECT, types.BUFFER);
    }
  })
  .add(function(obj) {
    if(typeof Node !== 'undefined' && obj instanceof Node) {
      return new Type(types.OBJECT, types.HTML_ELEMENT, obj.nodeName);
    }
  })
  .add(function(obj) {
    // probably at the begginging should be enough these checks
    if(obj.Boolean === Boolean && obj.Number === Number && obj.String === String && obj.Date === Date) {
      return new Type(types.OBJECT, types.HOST);
    }
  })
  .add(function() {
    return new Type(types.OBJECT);
  });

/**
 * Get type information of anything
 *
 * @param  {any} obj Anything that could require type information
 * @return {Type}    type info
 */
function getGlobalType(obj) {
  return main.getType(obj);
}

getGlobalType.checker = main;
getGlobalType.TypeChecker = TypeChecker;
getGlobalType.Type = Type;

Object.keys(types).forEach(function(typeName) {
  getGlobalType[typeName] = types[typeName];
});

module.exports = getGlobalType;

}).call(this,require("buffer").Buffer)
},{"./types":11,"buffer":4}],11:[function(require,module,exports){
var types = {
  NUMBER: 'number',
  UNDEFINED: 'undefined',
  STRING: 'string',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  FUNCTION: 'function',
  NULL: 'null',
  ARRAY: 'array',
  REGEXP: 'regexp',
  DATE: 'date',
  ERROR: 'error',
  ARGUMENTS: 'arguments',
  SYMBOL: 'symbol',
  ARRAY_BUFFER: 'array-buffer',
  TYPED_ARRAY: 'typed-array',
  DATA_VIEW: 'data-view',
  MAP: 'map',
  SET: 'set',
  WEAK_SET: 'weak-set',
  WEAK_MAP: 'weak-map',
  PROMISE: 'promise',

// node buffer
  BUFFER: 'buffer',

// dom html element
  HTML_ELEMENT: 'html-element',
  HTML_ELEMENT_TEXT: 'html-element-text',
  DOCUMENT: 'document',
  WINDOW: 'window',
  FILE: 'file',
  FILE_LIST: 'file-list',
  BLOB: 'blob',

  HOST: 'host',

  XHR: 'xhr'
};

module.exports = types;

},{}],12:[function(require,module,exports){
var should = require('./lib/should');

var defaultProto = Object.prototype;
var defaultProperty = 'should';

//Expose api via `Object#should`.
try {
  var prevShould = should.extend(defaultProperty, defaultProto);
  should._prevShould = prevShould;
} catch(e) {
  //ignore errors
}

module.exports = should;

},{"./lib/should":28}],13:[function(require,module,exports){
var util = require('./util');

/**
 * should AssertionError
 * @param {Object} options
 * @constructor
 * @memberOf should
 * @static
 */
var AssertionError = function AssertionError(options) {
  util.merge(this, options);

  if(!options.message) {
    Object.defineProperty(this, 'message', {
        get: function() {
          if(!this._message) {
            this._message = this.generateMessage();
            this.generatedMessage = true;
          }
          return this._message;
        },
        configurable: true,
        enumerable: false
      }
    );
  }

  if(Error.captureStackTrace) {
    Error.captureStackTrace(this, this.stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if(err.stack) {
      var out = err.stack;

      if(this.stackStartFunction) {
        // try to strip useless frames
        var fn_name = util.functionName(this.stackStartFunction);
        var idx = out.indexOf('\n' + fn_name);
        if(idx >= 0) {
          // once we have located the function frame
          // we need to strip out everything before it (and its line)
          var next_line = out.indexOf('\n', idx + 1);
          out = out.substring(next_line + 1);
        }
      }

      this.stack = out;
    }
  }
};


var indent = '    ';
function prependIndent(line) {
  return indent + line;
}

function indentLines(text) {
  return text.split('\n').map(prependIndent).join('\n');
}


// assert.AssertionError instanceof Error
AssertionError.prototype = Object.create(Error.prototype, {
  name: {
    value: 'AssertionError'
  },

  generateMessage: {
    value: function() {
      if(!this.operator && this.previous) {
        return this.previous.message;
      }
      var actual = util.format(this.actual);
      var expected = 'expected' in this ? ' ' + util.format(this.expected) : '';
      var details = 'details' in this && this.details ? ' (' + this.details + ')' : '';

      var previous = this.previous ? '\n' + indentLines(this.previous.message) : '';

      return 'expected ' + actual + (this.negate ? ' not ' : ' ') + this.operator + expected + details + previous;
    }
  }
});

module.exports = AssertionError;

},{"./util":29}],14:[function(require,module,exports){
var AssertionError = require('./assertion-error');
var util = require('./util');

/**
 * should Assertion
 * @param {*} obj Given object for assertion
 * @constructor
 * @memberOf should
 * @static
 */
function Assertion(obj) {
  this.obj = obj;

  this.anyOne = false;
  this.negate = false;

  this.params = {actual: obj};
}

/**
 * Way to extend Assertion function. It uses some logic
 * to define only positive assertions and itself rule with negative assertion.
 *
 * All actions happen in subcontext and this method take care about negation.
 * Potentially we can add some more modifiers that does not depends from state of assertion.
 * @memberOf Assertion
 * @category assertion
 * @static
 * @param {String} name Name of assertion. It will be used for defining method or getter on Assertion.prototype
 * @param {Function} func Function that will be called on executing assertion
 * @example
 *
 * Assertion.add('asset', function() {
 *      this.params = { operator: 'to be asset' };
 *
 *      this.obj.should.have.property('id').which.is.a.Number();
 *      this.obj.should.have.property('path');
 * });
 */
Assertion.add = function(name, func) {
  var prop = {enumerable: true, configurable: true};

  prop.value = function() {
    var context = new Assertion(this.obj, this, name);
    context.anyOne = this.anyOne;

    try {
      func.apply(context, arguments);
    } catch(e) {
      //check for fail
      if(e instanceof AssertionError) {
        //negative fail
        if(this.negate) {
          this.obj = context.obj;
          this.negate = false;
          return this;
        }

        if(context !== e.assertion) {
          context.params.previous = e;
        }

        //positive fail
        context.negate = false;
        context.fail();
      }
      // throw if it is another exception
      throw e;
    }

    //negative pass
    if(this.negate) {
      context.negate = true;//because .fail will set negate
      context.params.details = 'false negative fail';
      context.fail();
    }

    //positive pass
    if(!this.params.operator) this.params = context.params;//shortcut
    this.obj = context.obj;
    this.negate = false;
    return this;
  };

  Object.defineProperty(Assertion.prototype, name, prop);
};

Assertion.addChain = function(name, onCall) {
  onCall = onCall || function() {
  };
  Object.defineProperty(Assertion.prototype, name, {
    get: function() {
      onCall();
      return this;
    },
    enumerable: true
  });
};

/**
 * Create alias for some `Assertion` property
 *
 * @memberOf Assertion
 * @category assertion
 * @static
 * @param {String} from Name of to map
 * @param {String} to Name of alias
 * @example
 *
 * Assertion.alias('true', 'True');
 */
Assertion.alias = function(from, to) {
  var desc = Object.getOwnPropertyDescriptor(Assertion.prototype, from);
  if(!desc) throw new Error('Alias ' + from + ' -> ' + to + ' could not be created as ' + from + ' not defined');
  Object.defineProperty(Assertion.prototype, to, desc);
};

Assertion.prototype = {
  constructor: Assertion,

  /**
   * Base method for assertions. Before calling this method need to fill Assertion#params object. This method usually called from other assertion methods.
   * `Assertion#params` can contain such properties:
   * * `operator` - required string containing description of this assertion
   * * `obj` - optional replacement for this.obj, it usefull if you prepare more clear object then given
   * * `message` - if this property filled with string any others will be ignored and this one used as assertion message
   * * `expected` - any object used when you need to assert relation between given object and expected. Like given == expected (== is a relation)
   * * `details` - additional string with details to generated message
   *
   * @memberOf Assertion
   * @category assertion
   * @param {*} expr Any expression that will be used as a condition for asserting.
   * @example
   *
   * var a = new should.Assertion(42);
   *
   * a.params = {
   *  operator: 'to be magic number',
   * }
   *
   * a.assert(false);
   * //throws AssertionError: expected 42 to be magic number
   */
  assert: function(expr) {
    if(expr) return this;

    var params = this.params;

    if('obj' in params && !('actual' in params)) {
      params.actual = params.obj;
    } else if(!('obj' in params) && !('actual' in params)) {
      params.actual = this.obj;
    }

    params.stackStartFunction = params.stackStartFunction || this.assert;
    params.negate = this.negate;

    params.assertion = this;

    throw new AssertionError(params);
  },

  /**
   * Shortcut for `Assertion#assert(false)`.
   *
   * @memberOf Assertion
   * @category assertion
   * @example
   *
   * var a = new should.Assertion(42);
   *
   * a.params = {
   *  operator: 'to be magic number',
   * }
   *
   * a.fail();
   * //throws AssertionError: expected 42 to be magic number
   */
  fail: function() {
    return this.assert(false);
  },

  /**
   * Negation modifier. Current assertion chain become negated. Each call invert negation on current assertion.
   *
   * @memberOf Assertion
   * @category assertion
   */
  get not() {
    this.negate = !this.negate;
    return this;
  },

  /**
   * Any modifier - it affect on execution of sequenced assertion to do not `check all`, but `check any of`.
   *
   * @memberOf Assertion
   * @category assertion
   */
  get any() {
    this.anyOne = true;
    return this;
  }
};

module.exports = Assertion;

},{"./assertion-error":13,"./util":29}],15:[function(require,module,exports){
var Formatter = require('should-format').Formatter;

var config = {
  checkProtoEql: false,

  getFormatter: function(opts) {
    return new Formatter(opts || config);
  }
};

module.exports = config;

},{"should-format":8}],16:[function(require,module,exports){
// implement assert interface using already written peaces of should.js

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var Assertion = require('./../assertion');

var _deepEqual = require('should-equal');

var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.
/**
 * Node.js standard [`assert.fail`](http://nodejs.org/api/assert.html#assert_assert_fail_actual_expected_message_operator).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual Actual object
 * @param {*} expected Expected object
 * @param {string} message Message for assertion
 * @param {string} operator Operator text
 */
function fail(actual, expected, message, operator, stackStartFunction) {
  var a = new Assertion(actual);
  a.params = {
    operator: operator,
    expected: expected,
    message: message,
    stackStartFunction: stackStartFunction || fail
  };

  a.fail();
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.
/**
 * Node.js standard [`assert.ok`](http://nodejs.org/api/assert.html#assert_assert_value_message_assert_ok_value_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} value
 * @param {string} [message]
 */
function ok(value, message) {
  if(!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

/**
 * Node.js standard [`assert.equal`](http://nodejs.org/api/assert.html#assert_assert_equal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.equal = function equal(actual, expected, message) {
  if(actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notEqual`](http://nodejs.org/api/assert.html#assert_assert_notequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notEqual = function notEqual(actual, expected, message) {
  if(actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.deepEqual`](http://nodejs.org/api/assert.html#assert_assert_deepequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.deepEqual = function deepEqual(actual, expected, message) {
  if(!_deepEqual(actual, expected).result) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};


// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notDeepEqual`](http://nodejs.org/api/assert.html#assert_assert_notdeepequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if(_deepEqual(actual, expected).result) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.strictEqual`](http://nodejs.org/api/assert.html#assert_assert_strictequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.strictEqual = function strictEqual(actual, expected, message) {
  if(actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notStrictEqual`](http://nodejs.org/api/assert.html#assert_assert_notstrictequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if(actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if(!actual || !expected) {
    return false;
  }

  if(Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if(actual instanceof expected) {
    return true;
  } else if(expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if(typeof expected == 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch(e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ')' : '.') +
  (message ? ' ' + message : '.');

  if(shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if(!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if((shouldThrow && actual && expected && !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);
/**
 * Node.js standard [`assert.throws`](http://nodejs.org/api/assert.html#assert_assert_throws_block_error_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Function} block
 * @param {Function} [error]
 * @param {String} [message]
 */
assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
/**
 * Node.js standard [`assert.doesNotThrow`](http://nodejs.org/api/assert.html#assert_assert_doesnotthrow_block_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Function} block
 * @param {String} [message]
 */
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

/**
 * Node.js standard [`assert.ifError`](http://nodejs.org/api/assert.html#assert_assert_iferror_value).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Error} err
 */
assert.ifError = function(err) {
  if(err) {
    throw err;
  }
};

},{"./../assertion":14,"should-equal":7}],17:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var util = require('../util')
  , assert = require('./_assert')
  , AssertionError = require('../assertion-error');

module.exports = function(should) {
  var i = should.format;

  /*
   * Expose assert to should
   *
   * This allows you to do things like below
   * without require()ing the assert module.
   *
   *    should.equal(foo.bar, undefined);
   *
   */
  util.merge(should, assert);

  /**
   * Assert _obj_ exists, with optional message.
   *
   * @static
   * @memberOf should
   * @category assertion assert
   * @alias should.exists
   * @param {*} obj
   * @param {String} [msg]
   * @example
   *
   * should.exist(1);
   * should.exist(new Date());
   */
  should.exist = should.exists = function(obj, msg) {
    if(null == obj) {
      throw new AssertionError({
        message: msg || ('expected ' + i(obj) + ' to exist'), stackStartFunction: should.exist
      });
    }
  };

  should.not = {};
  /**
   * Asserts _obj_ does not exist, with optional message.
   *
   * @name not.exist
   * @static
   * @memberOf should
   * @category assertion assert
   * @alias should.not.exists
   * @param {*} obj
   * @param {String} [msg]
   * @example
   *
   * should.not.exist(null);
   * should.not.exist(void 0);
   */
  should.not.exist = should.not.exists = function(obj, msg) {
    if(null != obj) {
      throw new AssertionError({
        message: msg || ('expected ' + i(obj) + ' to not exist'), stackStartFunction: should.not.exist
      });
    }
  };
};
},{"../assertion-error":13,"../util":29,"./_assert":16}],18:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

module.exports = function(should, Assertion) {
  /**
   * Assert given object is exactly `true`.
   *
   * @name true
   * @memberOf Assertion
   * @category assertion bool
   * @alias Assertion#True
   * @example
   *
   * (true).should.be.true();
   * false.should.not.be.true();
   *
   * ({ a: 10}).should.not.be.true();
   */
  Assertion.add('true', function() {
    this.is.exactly(true);
  });

  Assertion.alias('true', 'True');

  /**
   * Assert given object is exactly `false`.
   *
   * @name false
   * @memberOf Assertion
   * @category assertion bool
   * @alias Assertion#False
   * @example
   *
   * (true).should.not.be.false();
   * false.should.be.false();
   */
  Assertion.add('false', function() {
    this.is.exactly(false);
  });

  Assertion.alias('false', 'False');

  /**
   * Assert given object is thuthy according javascript type conversions.
   *
   * @name ok
   * @memberOf Assertion
   * @category assertion bool
   * @example
   *
   * (true).should.be.ok();
   * ''.should.not.be.ok();
   * should(null).not.be.ok();
   * should(void 0).not.be.ok();
   *
   * (10).should.be.ok();
   * (0).should.not.be.ok();
   */
  Assertion.add('ok', function() {
    this.params = { operator: 'to be truthy' };

    this.assert(this.obj);
  });
};

},{}],19:[function(require,module,exports){
module.exports = function(should, Assertion) {
  /**
   * Simple chaining. It actually do nothing.
   *
   * @memberOf Assertion
   * @name be
   * @property {should.Assertion} be
   * @alias Assertion#an
   * @alias Assertion#of
   * @alias Assertion#a
   * @alias Assertion#and
   * @alias Assertion#have
   * @alias Assertion#has
   * @alias Assertion#with
   * @alias Assertion#is
   * @alias Assertion#which
   * @alias Assertion#the
   * @alias Assertion#it
   * @category assertion chaining
   */
  ['an', 'of', 'a', 'and', 'be', 'has', 'have', 'with', 'is', 'which', 'the', 'it'].forEach(function(name) {
    Assertion.addChain(name);
  });
};

},{}],20:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var util = require('../util');
var eql = require('should-equal');

module.exports = function(should, Assertion) {
  var i = should.format;

  /**
   * Assert that given object contain something that equal to `other`. It uses `should-equal` for equality checks.
   * If given object is array it search that one of elements was equal to `other`.
   * If given object is string it checks if `other` is a substring - expected that `other` is a string.
   * If given object is Object it checks that `other` is a subobject - expected that `other` is a object.
   *
   * @name containEql
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [1, 2, 3].should.containEql(1);
   * [{ a: 1 }, 'a', 10].should.containEql({ a: 1 });
   *
   * 'abc'.should.containEql('b');
   * 'ab1c'.should.containEql(1);
   *
   * ({ a: 10, c: { d: 10 }}).should.containEql({ a: 10 });
   * ({ a: 10, c: { d: 10 }}).should.containEql({ c: { d: 10 }});
   * ({ a: 10, c: { d: 10 }}).should.containEql({ b: 10 });
   * // throws AssertionError: expected { a: 10, c: { d: 10 } } to contain { b: 10 }
   * //            expected { a: 10, c: { d: 10 } } to have property b
   */
  Assertion.add('containEql', function(other) {
    this.params = {operator: 'to contain ' + i(other)};

    this.is.not.null().and.not.undefined();

    var obj = this.obj;

    if(typeof obj == 'string') {
      this.assert(obj.indexOf(String(other)) >= 0);
    } else if(util.isIndexable(obj)) {
      this.assert(util.some(obj, function(v) {
        return eql(v, other).result;
      }));
    } else {
      this.have.properties(other);
    }
  });

  /**
   * Assert that given object is contain equally structured object on the same depth level.
   * If given object is an array and `other` is an array it checks that the eql elements is going in the same sequence in given array (recursive)
   * If given object is an object it checks that the same keys contain deep equal values (recursive)
   * On other cases it try to check with `.eql`
   *
   * @name containDeepOrdered
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [ 1, 2, 3].should.containDeepOrdered([1, 2]);
   * [ 1, 2, [ 1, 2, 3 ]].should.containDeepOrdered([ 1, [ 2, 3 ]]);
   *
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({a: 10});
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {c: 10}});
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {d: [1, 3]}});
   */
  Assertion.add('containDeepOrdered', function(other) {
    this.params = {operator: 'to contain ' + i(other)};

    var obj = this.obj;
    if(typeof obj == 'string') {// expect other to be string
      this.is.equal(String(other));
    } else if(util.isIndexable(obj) && util.isIndexable(other)) {
      for(var objIdx = 0, otherIdx = 0, objLength = util.length(obj), otherLength = util.length(other); objIdx < objLength && otherIdx < otherLength; objIdx++) {
        try {
          should(obj[objIdx]).containDeepOrdered(other[otherIdx]);
          otherIdx++;
        } catch(e) {
          if(e instanceof should.AssertionError) {
            continue;
          }
          throw e;
        }
      }

      this.assert(otherIdx === otherLength);
    } else if(obj != null && other != null && typeof obj == 'object' && typeof other == 'object') {// object contains object case
      util.forEach(other, function(value, key) {
        should(obj[key]).containDeepOrdered(value);
      });

      // if both objects is empty means we finish traversing - and we need to compare for hidden values
      if(util.isEmptyObject(other)) {
        this.eql(other);
      }
    } else {
      this.eql(other);
    }
  });

  /**
   * The same like `Assertion#containDeepOrdered` but all checks on arrays without order.
   *
   * @name containDeep
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [ 1, 2, 3].should.containDeep([2, 1]);
   * [ 1, 2, [ 1, 2, 3 ]].should.containDeep([ 1, [ 3, 1 ]]);
   */
  Assertion.add('containDeep', function(other) {
    this.params = {operator: 'to contain ' + i(other)};

    var obj = this.obj;
    if(typeof obj == 'string') {// expect other to be string
      this.is.equal(String(other));
    } else if(util.isIndexable(obj) && util.isIndexable(other)) {
      var usedKeys = {};
      util.forEach(other, function(otherItem) {
        this.assert(util.some(obj, function(item, index) {
          if(index in usedKeys) return false;

          try {
            should(item).containDeep(otherItem);
            usedKeys[index] = true;
            return true;
          } catch(e) {
            if(e instanceof should.AssertionError) {
              return false;
            }
            throw e;
          }
        }));
      }, this);
    } else if(obj != null && other != null && typeof obj == 'object' && typeof other == 'object') {// object contains object case
      util.forEach(other, function(value, key) {
        should(obj[key]).containDeep(value);
      });

      // if both objects is empty means we finish traversing - and we need to compare for hidden values
      if(util.isEmptyObject(other)) {
        this.eql(other);
      }
    } else {
      this.eql(other);
    }
  });

};

},{"../util":29,"should-equal":7}],21:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var eql = require('should-equal');
var type = require('should-type');
var util = require('../util');

function formatEqlResult(r, a, b) {
  return ((r.path.length > 0 ? 'at ' + r.path.map(util.formatProp).join(' -> ') : '') +
  (r.a === a ? '' : ', A has ' + util.format(r.a)) +
  (r.b === b ? '' : ' and B has ' + util.format(r.b)) +
  (r.showReason ? ' because ' + r.reason : '')).trim();
}

module.exports = function(should, Assertion) {

  /**
   * Deep object equality comparison. For full spec see [`should-equal tests`](https://github.com/shouldjs/equal/blob/master/test.js).
   *
   * @name eql
   * @memberOf Assertion
   * @category assertion equality
   * @alias Assertion#deepEqual
   * @param {*} val Expected value
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.eql(10);
   * ('10').should.not.be.eql(10);
   * (-0).should.not.be.eql(+0);
   *
   * NaN.should.be.eql(NaN);
   *
   * ({ a: 10}).should.be.eql({ a: 10 });
   * [ 'a' ].should.not.be.eql({ '0': 'a' });
   */
  Assertion.add('eql', function(val, description) {
    this.params = {operator: 'to equal', expected: val, message: description};

    var result = eql(this.obj, val, should.config);
    this.params.details = result.result ? '' : formatEqlResult(result, this.obj, val);

    this.params.showDiff = eql(type(this.obj), type(val)).result;

    this.assert(result.result);
  });

  /**
   * Exact comparison using ===.
   *
   * @name equal
   * @memberOf Assertion
   * @category assertion equality
   * @alias Assertion#exactly
   * @param {*} val Expected value
   * @param {string} [description] Optional message
   * @example
   *
   * 10.should.be.equal(10);
   * 'a'.should.be.exactly('a');
   *
   * should(null).be.exactly(null);
   */
  Assertion.add('equal', function(val, description) {
    this.params = {operator: 'to be', expected: val, message: description};

    this.params.showDiff = eql(type(this.obj), type(val)).result;

    this.assert(val === this.obj);
  });

  Assertion.alias('equal', 'exactly');
  Assertion.alias('eql', 'deepEqual');

  function addOneOf(name, message, method) {
    Assertion.add(name, function(vals) {
      if(arguments.length !== 1) {
        vals = Array.prototype.slice.call(arguments);
      } else {
        should(vals).be.Array();
      }

      this.params = {operator: message, expected: vals};

      var obj = this.obj;
      var found = false;

      util.forEach(vals, function(val) {
        try {
          should(val)[method](obj);
          found = true;
          return false;
        } catch(e) {
          if(e instanceof should.AssertionError) {
            return;//do nothing
          }
          throw e;
        }
      });

      this.assert(found);
    });
  }

  /**
   * Exact comparison using === to be one of supplied objects.
   *
   * @name equalOneOf
   * @memberOf Assertion
   * @category assertion equality
   * @param {Array|*} vals Expected values
   * @example
   *
   * 'ab'.should.be.equalOneOf('a', 10, 'ab');
   * 'ab'.should.be.equalOneOf(['a', 10, 'ab']);
   */
  addOneOf('equalOneOf', 'to be equals one of', 'equal');

  /**
   * Exact comparison using .eql to be one of supplied objects.
   *
   * @name oneOf
   * @memberOf Assertion
   * @category assertion equality
   * @param {Array|*} vals Expected values
   * @example
   *
   * ({a: 10}).should.be.oneOf('a', 10, 'ab', {a: 10});
   * ({a: 10}).should.be.oneOf(['a', 10, 'ab', {a: 10}]);
   */
  addOneOf('oneOf', 'to be one of', 'eql');

};

},{"../util":29,"should-equal":7,"should-type":10}],22:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */
var util = require('../util');

module.exports = function(should, Assertion) {
  var i = should.format;

  /**
   * Assert given function throws error with such message.
   *
   * @name throw
   * @memberOf Assertion
   * @category assertion errors
   * @alias Assertion#throwError
   * @param {string|RegExp|Function|Object|GeneratorFunction|GeneratorObject} [message] Message to match or properties
   * @param {Object} [properties] Optional properties that will be matched to thrown error
   * @example
   *
   * (function(){ throw new Error('fail') }).should.throw();
   * (function(){ throw new Error('fail') }).should.throw('fail');
   * (function(){ throw new Error('fail') }).should.throw(/fail/);
   *
   * (function(){ throw new Error('fail') }).should.throw(Error);
   * var error = new Error();
   * error.a = 10;
   * (function(){ throw error; }).should.throw(Error, { a: 10 });
   * (function(){ throw error; }).should.throw({ a: 10 });
   * (function*() {
   *   yield throwError();
   * }).should.throw();
   */
  Assertion.add('throw', function(message, properties) {
    var fn = this.obj
      , err = {}
      , errorInfo = ''
      , thrown = false;

    if(util.isGeneratorFunction(fn)) {
      return should(fn()).throw(message, properties);
    } else if(util.isGeneratorObject(fn)) {
      return should(fn.next.bind(fn)).throw(message, properties);
    }

    this.is.a.Function();

    var errorMatched = true;

    try {
      fn();
    } catch(e) {
      thrown = true;
      err = e;
    }

    if(thrown) {
      if(message) {
        if('string' == typeof message) {
          errorMatched = message == err.message;
        } else if(message instanceof RegExp) {
          errorMatched = message.test(err.message);
        } else if('function' == typeof message) {
          errorMatched = err instanceof message;
        } else if(null != message) {
          try {
            should(err).match(message);
          } catch(e) {
            if(e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }

        if(!errorMatched) {
          if('string' == typeof message || message instanceof RegExp) {
            errorInfo = " with a message matching " + i(message) + ", but got '" + err.message + "'";
          } else if('function' == typeof message) {
            errorInfo = " of type " + util.functionName(message) + ", but got " + util.functionName(err.constructor);
          }
        } else if('function' == typeof message && properties) {
          try {
            should(err).match(properties);
          } catch(e) {
            if(e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }
      } else {
        errorInfo = " (got " + i(err) + ")";
      }
    }

    this.params = { operator: 'to throw exception' + errorInfo };

    this.assert(thrown);
    this.assert(errorMatched);
  });

  Assertion.alias('throw', 'throwError');
};

},{"../util":29}],23:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var util = require('../util');
var eql = require('should-equal');

module.exports = function(should, Assertion) {
  var i = should.format;

  /**
   * Asserts if given object match `other` object, using some assumptions:
   * First object matched if they are equal,
   * If `other` is a regexp and given object is a string check on matching with regexp
   * If `other` is a regexp and given object is an array check if all elements matched regexp
   * If `other` is a regexp and given object is an object check values on matching regexp
   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
   * If `other` is an object check if the same keys matched with above rules
   * All other cases failed.
   * 
   * Usually it is right idea to add pre type assertions, like `.String()` or `.Object()` to be sure assertions will do what you are expecting.
   * Object iteration happen by keys (properties with enumerable: true), thus some objects can cause small pain. Typical example is js 
   * Error - it by default has 2 properties `name` and `message`, but they both non-enumerable. In this case make sure you specify checking props (see examples).
   * 
   * @name match
   * @memberOf Assertion
   * @category assertion matching
   * @param {*} other Object to match
   * @param {string} [description] Optional message
   * @example
   * 'foobar'.should.match(/^foo/);
   * 'foobar'.should.not.match(/^bar/);
   *
   * ({ a: 'foo', c: 'barfoo' }).should.match(/foo$/);
   *
   * ['a', 'b', 'c'].should.match(/[a-z]/);
   *
   * (5).should.not.match(function(n) {
   *   return n < 0;
   * });
   * (5).should.not.match(function(it) {
   *    it.should.be.an.Array();
   * });
   * ({ a: 10, b: 'abc', c: { d: 10 }, d: 0 }).should
   * .match({ a: 10, b: /c$/, c: function(it) {
   *    return it.should.have.property('d', 10);
   * }});
   *
   * [10, 'abc', { d: 10 }, 0].should
   * .match({ '0': 10, '1': /c$/, '2': function(it) {
   *    return it.should.have.property('d', 10);
   * }});
   * 
   * var myString = 'abc';
   * 
   * myString.should.be.a.String().and.match(/abc/);
   * 
   * myString = {};
   * 
   * myString.should.match(/abc/); //yes this will pass
   * //better to do
   * myString.should.be.an.Object().and.not.empty().and.match(/abc/);//fixed
   * 
   * (new Error('boom')).should.match(/abc/);//passed because no keys
   * (new Error('boom')).should.not.match({ message: /abc/ });//check specified property
   */
  Assertion.add('match', function(other, description) {
    this.params = {operator: 'to match ' + i(other), message: description};

    if(!eql(this.obj, other).result) {
      if(other instanceof RegExp) { // something - regex

        if(typeof this.obj == 'string') {

          this.assert(other.exec(this.obj));
        } else if(util.isIndexable(this.obj)) {
          util.forEach(this.obj, function(item) {
            this.assert(other.exec(item));// should we try to convert to String and exec?
          }, this);
        } else if(null != this.obj && typeof this.obj == 'object') {

          var notMatchedProps = [], matchedProps = [];
          util.forEach(this.obj, function(value, name) {
            if(other.exec(value)) matchedProps.push(util.formatProp(name));
            else notMatchedProps.push(util.formatProp(name) + ' (' + i(value) + ')');
          }, this);

          if(notMatchedProps.length)
            this.params.operator += '\n    not matched properties: ' + notMatchedProps.join(', ');
          if(matchedProps.length)
            this.params.operator += '\n    matched properties: ' + matchedProps.join(', ');

          this.assert(notMatchedProps.length === 0);
        } // should we try to convert to String and exec?
      } else if(typeof other == 'function') {
        var res;

        res = other(this.obj);

        //if(res instanceof Assertion) {
        //  this.params.operator += '\n    ' + res.getMessage();
        //}

        //if we throw exception ok - it is used .should inside
        if(typeof res == 'boolean') {
          this.assert(res); // if it is just boolean function assert on it
        }
      } else if(other != null && typeof other == 'object') { // try to match properties (for Object and Array)
        notMatchedProps = [];
        matchedProps = [];

        util.forEach(other, function(value, key) {
          try {
            should(this.obj).have.property(key).which.match(value);
            matchedProps.push(util.formatProp(key));
          } catch(e) {
            if(e instanceof should.AssertionError) {
              notMatchedProps.push(util.formatProp(key) + ' (' + i(this.obj[key]) + ')');
            } else {
              throw e;
            }
          }
        }, this);

        if(notMatchedProps.length)
          this.params.operator += '\n    not matched properties: ' + notMatchedProps.join(', ');
        if(matchedProps.length)
          this.params.operator += '\n    matched properties: ' + matchedProps.join(', ');

        this.assert(notMatchedProps.length === 0);
      } else {
        this.assert(false);
      }
    }
  });

  /**
   * Asserts if given object values or array elements all match `other` object, using some assumptions:
   * First object matched if they are equal,
   * If `other` is a regexp - matching with regexp
   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
   * All other cases check if this `other` equal to each element
   *
   * @name matchEach
   * @memberOf Assertion
   * @category assertion matching
   * @alias Assertion#matchSome
   * @param {*} other Object to match
   * @param {string} [description] Optional message
   * @example
   * [ 'a', 'b', 'c'].should.matchEach(/\w+/);
   * [ 'a', 'a', 'a'].should.matchEach('a');
   *
   * [ 'a', 'a', 'a'].should.matchEach(function(value) { value.should.be.eql('a') });
   *
   * { a: 'a', b: 'a', c: 'a' }.should.matchEach(function(value) { value.should.be.eql('a') });
   */
  Assertion.add('matchEach', function(other, description) {
    this.params = {operator: 'to match each ' + i(other), message: description};

    util.forEach(this.obj, function(value) {
      should(value).match(other);
    }, this);
  });

  /**
  * Asserts if any of given object values or array elements match `other` object, using some assumptions:
  * First object matched if they are equal,
  * If `other` is a regexp - matching with regexp
  * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
  * All other cases check if this `other` equal to each element
  *
  * @name matchAny
  * @memberOf Assertion
  * @category assertion matching
  * @param {*} other Object to match
  * @alias Assertion#matchEvery
  * @param {string} [description] Optional message
  * @example
  * [ 'a', 'b', 'c'].should.matchAny(/\w+/);
  * [ 'a', 'b', 'c'].should.matchAny('a');
  *
  * [ 'a', 'b', 'c'].should.matchAny(function(value) { value.should.be.eql('a') });
  *
  * { a: 'a', b: 'b', c: 'c' }.should.matchAny(function(value) { value.should.be.eql('a') });
  */
  Assertion.add('matchAny', function(other, description) {
    this.params = {operator: 'to match any ' + i(other), message: description};

    this.assert(util.some(this.obj, function(value) {
      try {
        should(value).match(other);
        return true;
      } catch(e) {
        if(e instanceof should.AssertionError) {
          // Caught an AssertionError, return false to the iterator
          return false;
        }
        throw e;
      }
    }));
  });

  Assertion.alias('matchAny', 'matchSome');
  Assertion.alias('matchEach', 'matchEvery');
};

},{"../util":29,"should-equal":7}],24:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

module.exports = function(should, Assertion) {

  /**
   * Assert given object is NaN
   * @name NaN
   * @memberOf Assertion
   * @category assertion numbers
   * @example
   *
   * (10).should.not.be.NaN();
   * NaN.should.be.NaN();
   */
  Assertion.add('NaN', function() {
    this.params = { operator: 'to be NaN' };

    this.assert(this.obj !== this.obj);
  });

  /**
   * Assert given object is not finite (positive or negative)
   *
   * @name Infinity
   * @memberOf Assertion
   * @category assertion numbers
   * @example
   *
   * (10).should.not.be.Infinity();
   * NaN.should.not.be.Infinity();
   */
  Assertion.add('Infinity', function() {
    this.params = { operator: 'to be Infinity' };

    this.is.a.Number()
      .and.not.a.NaN()
      .and.assert(!isFinite(this.obj));
  });

  /**
   * Assert given number between `start` and `finish` or equal one of them.
   *
   * @name within
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} start Start number
   * @param {number} finish Finish number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.within(0, 20);
   */
  Assertion.add('within', function(start, finish, description) {
    this.params = { operator: 'to be within ' + start + '..' + finish, message: description };

    this.assert(this.obj >= start && this.obj <= finish);
  });

  /**
   * Assert given number near some other `value` within `delta`
   *
   * @name approximately
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} value Center number
   * @param {number} delta Radius
   * @param {string} [description] Optional message
   * @example
   *
   * (9.99).should.be.approximately(10, 0.1);
   */
  Assertion.add('approximately', function(value, delta, description) {
    this.params = { operator: 'to be approximately ' + value + ' ±' + delta, message: description };

    this.assert(Math.abs(this.obj - value) <= delta);
  });

  /**
   * Assert given number above `n`.
   *
   * @name above
   * @alias Assertion#greaterThan
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.above(0);
   */
  Assertion.add('above', function(n, description) {
    this.params = { operator: 'to be above ' + n, message: description };

    this.assert(this.obj > n);
  });

  /**
   * Assert given number below `n`.
   *
   * @name below
   * @alias Assertion#lessThan
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (0).should.be.below(10);
   */
  Assertion.add('below', function(n, description) {
    this.params = { operator: 'to be below ' + n, message: description };

    this.assert(this.obj < n);
  });

  Assertion.alias('above', 'greaterThan');
  Assertion.alias('below', 'lessThan');

  /**
   * Assert given number above `n`.
   *
   * @name aboveOrEqual
   * @alias Assertion#greaterThanOrEqual
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.aboveOrEqual(0);
   * (10).should.be.aboveOrEqual(10);
   */
  Assertion.add('aboveOrEqual', function(n, description) {
    this.params = { operator: 'to be above or equal' + n, message: description };

    this.assert(this.obj >= n);
  });

  /**
   * Assert given number below `n`.
   *
   * @name belowOrEqual
   * @alias Assertion#lessThanOrEqual
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (0).should.be.belowOrEqual(10);
   * (0).should.be.belowOrEqual(0);
   */
  Assertion.add('belowOrEqual', function(n, description) {
    this.params = { operator: 'to be below or equal' + n, message: description };

    this.assert(this.obj <= n);
  });

  Assertion.alias('aboveOrEqual', 'greaterThanOrEqual');
  Assertion.alias('belowOrEqual', 'lessThanOrEqual');

};

},{}],25:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var util = require('../util');
var eql = require('should-equal');

var aSlice = Array.prototype.slice;

module.exports = function(should, Assertion) {
  var i = should.format;
  /**
   * Asserts given object has some descriptor. **On success it change given object to be value of property**.
   *
   * @name propertyWithDescriptor
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {Object} desc Descriptor like used in Object.defineProperty (not required to add all properties)
   * @example
   *
   * ({ a: 10 }).should.have.propertyWithDescriptor('a', { enumerable: true });
   */
  Assertion.add('propertyWithDescriptor', function(name, desc) {
    this.params = {actual: this.obj, operator: 'to have own property with descriptor ' + i(desc)};
    var obj = this.obj;
    this.have.ownProperty(name);
    should(Object.getOwnPropertyDescriptor(Object(obj), name)).have.properties(desc);
  });

  function processPropsArgs() {
    var args = {};
    if(arguments.length > 1) {
      args.names = aSlice.call(arguments);
    } else {
      var arg = arguments[0];
      if(typeof arg === 'string') {
        args.names = [arg];
      } else if(util.isIndexable(arg)) {
        args.names = arg;
      } else {
        args.names = Object.keys(arg);
        args.values = arg;
      }
    }
    return args;
  }


  /**
   * Asserts given object has enumerable property with optionally value. **On success it change given object to be value of property**.
   *
   * @name enumerable
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {*} [val] Optional property value to check
   * @example
   *
   * ({ a: 10 }).should.have.enumerable('a');
   */
  Assertion.add('enumerable', function(name, val) {
    name = util.convertPropertyName(name);

    this.params = {
      operator: "to have enumerable property " + util.formatProp(name) + (arguments.length > 1 ? " equal to " + i(val): "")
    };

    var desc = { enumerable: true };
    if(arguments.length > 1) desc.value = val;
    this.have.propertyWithDescriptor(name, desc);
  });

  /**
   * Asserts given object has enumerable properties
   *
   * @name enumerables
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string|Object} names Names of property
   * @example
   *
   * ({ a: 10, b: 10 }).should.have.enumerables('a');
   */
  Assertion.add('enumerables', function(names) {
    var args = processPropsArgs.apply(null, arguments);

    this.params = {
      operator: "to have enumerables " + args.names.map(util.formatProp)
    };

    var obj = this.obj;
    args.names.forEach(function(name) {
      should(obj).have.enumerable(name);
    });
  });

  /**
   * Asserts given object has property with optionally value. **On success it change given object to be value of property**.
   *
   * @name property
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {*} [val] Optional property value to check
   * @example
   *
   * ({ a: 10 }).should.have.property('a');
   */
  Assertion.add('property', function(name, val) {
    name = util.convertPropertyName(name);
    if(arguments.length > 1) {
      var p = {};
      p[name] = val;
      this.have.properties(p);
    } else {
      this.have.properties(name);
    }
    this.obj = this.obj[name];
  });

  /**
   * Asserts given object has properties. On this method affect .any modifier, which allow to check not all properties.
   *
   * @name properties
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string|Object} names Names of property
   * @example
   *
   * ({ a: 10 }).should.have.properties('a');
   * ({ a: 10, b: 20 }).should.have.properties([ 'a' ]);
   * ({ a: 10, b: 20 }).should.have.properties({ b: 20 });
   */
  Assertion.add('properties', function(names) {
    var values = {};
    if(arguments.length > 1) {
      names = aSlice.call(arguments);
    } else if(!Array.isArray(names)) {
      if(typeof names == 'string' || typeof names == 'symbol') {
        names = [names];
      } else {
        values = names;
        names = Object.keys(names);
      }
    }

    var obj = Object(this.obj), missingProperties = [];

    //just enumerate properties and check if they all present
    names.forEach(function(name) {
      if(!(name in obj)) missingProperties.push(util.formatProp(name));
    });

    var props = missingProperties;
    if(props.length === 0) {
      props = names.map(util.formatProp);
    } else if(this.anyOne) {
      props = names.filter(function(name) {
        return missingProperties.indexOf(util.formatProp(name)) < 0;
      }).map(util.formatProp);
    }

    var operator = (props.length === 1 ?
        'to have property ' : 'to have ' + (this.anyOne ? 'any of ' : '') + 'properties ') + props.join(', ');

    this.params = {obj: this.obj, operator: operator};

    //check that all properties presented
    //or if we request one of them that at least one them presented
    this.assert(missingProperties.length === 0 || (this.anyOne && missingProperties.length != names.length));

    // check if values in object matched expected
    var valueCheckNames = Object.keys(values);
    if(valueCheckNames.length) {
      var wrongValues = [];
      props = [];

      // now check values, as there we have all properties
      valueCheckNames.forEach(function(name) {
        var value = values[name];
        if(!eql(obj[name], value).result) {
          wrongValues.push(util.formatProp(name) + ' of ' + i(value) + ' (got ' + i(obj[name]) + ')');
        } else {
          props.push(util.formatProp(name) + ' of ' + i(value));
        }
      });

      if((wrongValues.length !== 0 && !this.anyOne) || (this.anyOne && props.length === 0)) {
        props = wrongValues;
      }

      operator = (props.length === 1 ?
        'to have property ' : 'to have ' + (this.anyOne ? 'any of ' : '') + 'properties ') + props.join(', ');

      this.params = {obj: this.obj, operator: operator};

      //if there is no not matched values
      //or there is at least one matched
      this.assert(wrongValues.length === 0 || (this.anyOne && wrongValues.length != valueCheckNames.length));
    }
  });

  /**
   * Asserts given object has property `length` with given value `n`
   *
   * @name length
   * @alias Assertion#lengthOf
   * @memberOf Assertion
   * @category assertion property
   * @param {number} n Expected length
   * @param {string} [description] Optional message
   * @example
   *
   * [1, 2].should.have.length(2);
   */
  Assertion.add('length', function(n, description) {
    this.have.property('length', n, description);
  });

  Assertion.alias('length', 'lengthOf');

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  /**
   * Asserts given object has own property. **On success it change given object to be value of property**.
   *
   * @name ownProperty
   * @alias Assertion#hasOwnProperty
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {string} [description] Optional message
   * @example
   *
   * ({ a: 10 }).should.have.ownProperty('a');
   */
  Assertion.add('ownProperty', function(name, description) {
    name = util.convertPropertyName(name);
    this.params = {
      actual: this.obj,
      operator: 'to have own property ' + util.formatProp(name),
      message: description
    };

    this.assert(hasOwnProperty.call(this.obj, name));

    this.obj = this.obj[name];
  });

  Assertion.alias('ownProperty', 'hasOwnProperty');

  /**
   * Asserts given object is empty. For strings, arrays and arguments it checks .length property, for objects it checks keys.
   *
   * @name empty
   * @memberOf Assertion
   * @category assertion property
   * @example
   *
   * ''.should.be.empty();
   * [].should.be.empty();
   * ({}).should.be.empty();
   */
  Assertion.add('empty', function() {
    this.params = {operator: 'to be empty'};

    if(util.length(this.obj) !== void 0) {
      should(this.obj).have.property('length', 0);
    } else {
      var obj = Object(this.obj); // wrap to reference for booleans and numbers
      for(var prop in obj) {
        should(this.obj).not.have.ownProperty(prop);
      }
    }
  }, true);

  /**
   * Asserts given object has exact keys. Compared to `properties`, `keys` does not accept Object as a argument.
   *
   * @name keys
   * @alias Assertion#key
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string} [keys] Keys to check
   * @example
   *
   * ({ a: 10 }).should.have.keys('a');
   * ({ a: 10, b: 20 }).should.have.keys('a', 'b');
   * ({ a: 10, b: 20 }).should.have.keys([ 'a', 'b' ]);
   * ({}).should.have.keys();
   */
  Assertion.add('keys', function(keys) {
    if(arguments.length > 1) keys = aSlice.call(arguments);
    else if(arguments.length === 1 && typeof keys === 'string') keys = [keys];
    else if(arguments.length === 0) keys = [];

    keys = keys.map(String);

    var obj = Object(this.obj);

    // first check if some keys are missing
    var missingKeys = [];
    keys.forEach(function(key) {
      if(!hasOwnProperty.call(this.obj, key))
        missingKeys.push(util.formatProp(key));
    }, this);

    // second check for extra keys
    var extraKeys = [];
    Object.keys(obj).forEach(function(key) {
      if(keys.indexOf(key) < 0) {
        extraKeys.push(util.formatProp(key));
      }
    });

    var verb = keys.length === 0 ? 'to be empty' :
    'to have ' + (keys.length === 1 ? 'key ' : 'keys ');

    this.params = {operator: verb + keys.map(util.formatProp).join(', ')};

    if(missingKeys.length > 0)
      this.params.operator += '\n\tmissing keys: ' + missingKeys.join(', ');

    if(extraKeys.length > 0)
      this.params.operator += '\n\textra keys: ' + extraKeys.join(', ');

    this.assert(missingKeys.length === 0 && extraKeys.length === 0);
  });

  Assertion.alias("keys", "key");

  /**
   * Asserts given object has nested property in depth by path. **On success it change given object to be value of final property**.
   *
   * @name propertyByPath
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string} properties Properties path to search
   * @example
   *
   * ({ a: {b: 10}}).should.have.propertyByPath('a', 'b').eql(10);
   */
  Assertion.add('propertyByPath', function(properties) {
    if(arguments.length > 1) properties = aSlice.call(arguments);
    else if(arguments.length === 1 && typeof properties == 'string') properties = [properties];
    else if(arguments.length === 0) properties = [];

    var allProps = properties.map(util.formatProp);

    properties = properties.map(String);

    var obj = should(Object(this.obj));

    var foundProperties = [];

    var currentProperty;
    while(currentProperty = properties.shift()) {
      this.params = {operator: 'to have property by path ' + allProps.join(', ') + ' - failed on ' + util.formatProp(currentProperty)};
      obj = obj.have.property(currentProperty);
      foundProperties.push(currentProperty);
    }

    this.params = {obj: this.obj, operator: 'to have property by path ' + allProps.join(', ')};

    this.obj = obj.obj;
  });
};

},{"../util":29,"should-equal":7}],26:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

module.exports = function(should, Assertion) {
  /**
   * Assert given string starts with prefix
   * @name startWith
   * @memberOf Assertion
   * @category assertion strings
   * @param {string} str Prefix
   * @param {string} [description] Optional message
   * @example
   *
   * 'abc'.should.startWith('a');
   */
  Assertion.add('startWith', function(str, description) {
    this.params = { operator: 'to start with ' + should.format(str), message: description };

    this.assert(0 === this.obj.indexOf(str));
  });

  /**
   * Assert given string starts with prefix
   * @name endWith
   * @memberOf Assertion
   * @category assertion strings
   * @param {string} str Prefix
   * @param {string} [description] Optional message
   * @example
   *
   * 'abca'.should.endWith('a');
   */
  Assertion.add('endWith', function(str, description) {
    this.params = { operator: 'to end with ' + should.format(str), message: description };

    this.assert(this.obj.indexOf(str, this.obj.length - str.length) >= 0);
  });
};

},{}],27:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var util = require('../util');

module.exports = function(should, Assertion) {
  /**
   * Assert given object is number
   * @name Number
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Number', function() {
    this.params = {operator: 'to be a number'};

    this.have.type('number');
  });

  /**
   * Assert given object is arguments
   * @name arguments
   * @alias Assertion#Arguments
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('arguments', function() {
    this.params = {operator: 'to be arguments'};

    this.have.class('Arguments');
  });

  Assertion.alias('arguments', 'Arguments');

  /**
   * Assert given object has some type using `typeof`
   * @name type
   * @memberOf Assertion
   * @param {string} type Type name
   * @param {string} [description] Optional message
   * @category assertion types
   */
  Assertion.add('type', function(type, description) {
    this.params = {operator: 'to have type ' + type, message: description};

    should(typeof this.obj).be.exactly(type);
  });

  /**
   * Assert given object is instance of `constructor`
   * @name instanceof
   * @alias Assertion#instanceOf
   * @memberOf Assertion
   * @param {Function} constructor Constructor function
   * @param {string} [description] Optional message
   * @category assertion types
   */
  Assertion.add('instanceof', function(constructor, description) {
    this.params = {operator: 'to be an instance of ' + util.functionName(constructor), message: description};

    this.assert(Object(this.obj) instanceof constructor);
  });

  Assertion.alias('instanceof', 'instanceOf');

  /**
   * Assert given object is function
   * @name Function
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Function', function() {
    this.params = {operator: 'to be a function'};

    this.have.type('function');
  });

  /**
   * Assert given object is object
   * @name Object
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Object', function() {
    this.params = {operator: 'to be an object'};

    this.is.not.null().and.have.type('object');
  });

  /**
   * Assert given object is string
   * @name String
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('String', function() {
    this.params = {operator: 'to be a string'};

    this.have.type('string');
  });

  /**
   * Assert given object is array
   * @name Array
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Array', function() {
    this.params = {operator: 'to be an array'};

    this.have.class('Array');
  });

  /**
   * Assert given object is boolean
   * @name Boolean
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Boolean', function() {
    this.params = {operator: 'to be a boolean'};

    this.have.type('boolean');
  });

  /**
   * Assert given object is error
   * @name Error
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('Error', function() {
    this.params = {operator: 'to be an error'};

    this.have.instanceOf(Error);
  });

  /**
   * Assert given object is null
   * @name null
   * @alias Assertion#Null
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('null', function() {
    this.params = {operator: 'to be null'};

    this.assert(this.obj === null);
  });

  Assertion.alias('null', 'Null');

  /**
   * Assert given object has some internal [[Class]], via Object.prototype.toString call
   * @name class
   * @alias Assertion#Class
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('class', function(cls) {
    this.params = {operator: 'to have [[Class]] ' + cls};

    this.assert(Object.prototype.toString.call(this.obj) === '[object ' + cls + ']');
  });

  Assertion.alias('class', 'Class');

  /**
   * Assert given object is undefined
   * @name undefined
   * @alias Assertion#Undefined
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add('undefined', function() {
    this.params = {operator: 'to be undefined'};

    this.assert(this.obj === void 0);
  });

  Assertion.alias('undefined', 'Undefined');

  /**
   * Assert given object supports es6 iterable protocol (just check
   * that object has property Symbol.iterator, which is a function)
   * @name iterable
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add('iterable', function() {
    this.params = {operator: 'to be iterable'};

    should(this.obj).have.property(Symbol.iterator).which.is.a.Function();
  });

  /**
   * Assert given object supports es6 iterator protocol (just check
   * that object has property next, which is a function)
   * @name iterator
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add('iterator', function() {
    this.params = {operator: 'to be iterator'};

    should(this.obj).have.property('next').which.is.a.Function();
  });

  /**
   * Assert given object is a generator object
   * @name generator
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add('generator', function() {
    this.params = {operator: 'to be generator'};

    should(this.obj).be.iterable
      .and.iterator
      .and.it.is.equal(this.obj[Symbol.iterator]());
  });
};

},{"../util":29}],28:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */


var util = require('./util');

/**
 * Our function should
 *
 * @param {*} obj Object to assert
 * @returns {should.Assertion} Returns new Assertion for beginning assertion chain
 * @example
 *
 * var should = require('should');
 * should('abc').be.a.String();
 */
var should = function should(obj) {
  return (new should.Assertion(obj));
};

should.AssertionError = require('./assertion-error');
should.Assertion = require('./assertion');

should.format = util.format;
should.type = require('should-type');
should.util = util;

/**
 * Object with configuration.
 * It contains such properties:
 * * `checkProtoEql` boolean - Affect if `.eql` will check objects prototypes
 * Also it can contain options for should-format.
 *
 * @type {Object}
 * @memberOf should
 * @static
 * @example
 *
 * var a = { a: 10 }, b = Object.create(null);
 * b.a = 10;
 *
 * a.should.be.eql(b);
 * //not throws
 *
 * should.config.checkProtoEql = true;
 * a.should.be.eql(b);
 * //throws AssertionError: expected { a: 10 } to equal { a: 10 } (because A and B have different prototypes)
 */
should.config = require('./config');

//Expose should to external world.
exports = module.exports = should;

/**
 * Allow to extend given prototype with should property using given name. This getter will **unwrap** all standard wrappers like `Number`, `Boolean`, `String`.
 * Using `should(obj)` is the equivalent of using `obj.should` with known issues (like nulls and method calls etc).
 *
 * @param {string} [propertyName] Name of property to add. Default is `'should'`.
 * @param {Object} [proto] Prototype to extend with. Default is `Object.prototype`.
 * @memberOf should
 * @returns {{ name: string, descriptor: Object, proto: Object }} Descriptor enough to return all back
 * @static
 * @example
 *
 * var prev = should.extend('must', Object.prototype);
 *
 * 'abc'.must.startWith('a');
 *
 * var should = should.noConflict(prev);
 * should.not.exist(Object.prototype.must);
 */
should.extend = function(propertyName, proto) {
  propertyName = propertyName || 'should';
  proto = proto || Object.prototype;

  var prevDescriptor = Object.getOwnPropertyDescriptor(proto, propertyName);

  Object.defineProperty(proto, propertyName, {
    set: function() {
    },
    get: function() {
      return should(util.isWrapperType(this) ? this.valueOf() : this);
    },
    configurable: true
  });

  return { name: propertyName, descriptor: prevDescriptor, proto: proto };
};

/**
 * Delete previous extension. If `desc` missing it will remove default extension.
 *
 * @param {{ name: string, descriptor: Object, proto: Object }} [desc] Returned from `should.extend` object
 * @memberOf should
 * @returns {Function} Returns should function
 * @static
 * @example
 *
 * var should = require('should').noConflict();
 *
 * should(Object.prototype).not.have.property('should');
 *
 * var prev = should.extend('must', Object.prototype);
 * 'abc'.must.startWith('a');
 * should.noConflict(prev);
 *
 * should(Object.prototype).not.have.property('must');
 */
should.noConflict = function(desc) {
  desc = desc || should._prevShould;

  if(desc) {
    delete desc.proto[desc.name];

    if(desc.descriptor) {
      Object.defineProperty(desc.proto, desc.name, desc.descriptor);
    }
  }
  return should;
};

/**
 * Simple utility function for a bit more easier should assertion extension
 * @param {Function} f So called plugin function. It should accept 2 arguments: `should` function and `Assertion` constructor
 * @memberOf should
 * @returns {Function} Returns `should` function
 * @static
 * @example
 *
 * should.use(function(should, Assertion) {
 *   Assertion.add('asset', function() {
 *      this.params = { operator: 'to be asset' };
 *
 *      this.obj.should.have.property('id').which.is.a.Number();
 *      this.obj.should.have.property('path');
 *  })
 * })
 */
should.use = function(f) {
  f(should, should.Assertion);
  return this;
};

should
  .use(require('./ext/assert'))
  .use(require('./ext/chain'))
  .use(require('./ext/bool'))
  .use(require('./ext/number'))
  .use(require('./ext/eql'))
  .use(require('./ext/type'))
  .use(require('./ext/string'))
  .use(require('./ext/property'))
  .use(require('./ext/error'))
  .use(require('./ext/match'))
  .use(require('./ext/contain'));

},{"./assertion":14,"./assertion-error":13,"./config":15,"./ext/assert":17,"./ext/bool":18,"./ext/chain":19,"./ext/contain":20,"./ext/eql":21,"./ext/error":22,"./ext/match":23,"./ext/number":24,"./ext/property":25,"./ext/string":26,"./ext/type":27,"./util":29,"should-type":10}],29:[function(require,module,exports){
/*
 * Should
 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var type = require('should-type');
var config = require('./config');

/**
 * Check if given obj just a primitive type wrapper
 * @param {Object} obj
 * @returns {boolean}
 * @private
 */
exports.isWrapperType = function(obj) {
  return obj instanceof Number || obj instanceof String || obj instanceof Boolean;
};

exports.merge = function(a, b) {
  if(a && b) {
    for(var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

var hasOwnProperty = Object.prototype.hasOwnProperty;

exports.forEach = function forEach(obj, f, context) {
  if(exports.isGeneratorFunction(obj)) {
    return forEach(obj(), f, context);
  } else if (exports.isGeneratorObject(obj)) {
    var value = obj.next();
    while(!value.done) {
      if(f.call(context, value.value, 'value', obj) === false)
        return;
      value = obj.next();
    }
  } else {
    for(var prop in obj) {
      if(hasOwnProperty.call(obj, prop)) {
        if(f.call(context, obj[prop], prop, obj) === false)
          return;
      }
    }
  }
};

exports.some = function(obj, f, context) {
  var res = false;
  exports.forEach(obj, function(value, key) {
    if(f.call(context, value, key, obj)) {
      res = true;
      return false;
    }
  }, context);
  return res;
};

exports.isEmptyObject = function(obj) {
  for(var prop in obj) {
    if(hasOwnProperty.call(obj, prop)) {
      return false;
    }
  }
  return true;
};

exports.isIndexable = function(obj) {
  var t = type(obj);
  return (t.type === type.OBJECT && t.cls === type.ARRAY) ||
   (t.type === type.OBJECT && t.cls === type.BUFFER) ||
   (t.type === type.OBJECT && t.cls === type.ARGUMENTS) ||
   (t.type === type.OBJECT && t.cls === type.ARRAY_BUFFER) ||
   (t.type === type.OBJECT && t.cls === type.TYPED_ARRAY) ||
   (t.type === type.OBJECT && t.cls === type.DATA_VIEW) ||
   (t.type === type.OBJECT && t.cls === type.STRING) ||
   (t.type === type.STRING);
};

exports.length = function(obj) {
  var t = type(obj);
  switch(t.type) {
    case type.STRING:
      return obj.length;
    case type.OBJECT:
      switch(t.cls) {
        case type.ARRAY_BUFFER:
        case type.TYPED_ARRAY:
        case type.DATA_VIEW:
          return obj.byteLength;

        case type.ARRAY:
        case type.BUFFER:
        case type.ARGUMENTS:
        case type.FUNCTION:
          return obj.length;
      }
  }
};

exports.convertPropertyName = function(name) {
  if(typeof name == 'symbol') {
    return name;
  } else {
    return String(name);
  }
};

exports.isGeneratorObject = function(obj) {
  if(!obj) return false;

  return typeof obj.next == 'function' &&
          typeof obj[Symbol.iterator] == 'function' &&
          obj[Symbol.iterator]() === obj;
};

//TODO find better way
exports.isGeneratorFunction = function(f) {
  if(typeof f != 'function') return false;

  return /^function\s*\*\s*/.test(f.toString());
};

exports.format = function(value, opts) {
  return config.getFormatter(opts).format(value);
};

exports.functionName = require('should-format').Formatter.functionName;

exports.formatProp = function(value) {
  return config.getFormatter().formatPropertyName(String(value));
};

},{"./config":15,"should-format":8,"should-type":10}],30:[function(require,module,exports){
window.Should = require('should');
require('@mparticle/web-sdk');

window.mParticle.addForwarder = function(forwarder) {
    window.mParticle.forwarder = new forwarder.constructor();
};

require('../../dist/CriteoEventForwarder.common.js');
require('../mockhttprequest');
require('../tests.js');

},{"../../dist/CriteoEventForwarder.common.js":1,"../mockhttprequest":31,"../tests.js":32,"@mparticle/web-sdk":2,"should":12}],31:[function(require,module,exports){
/* eslint-disable no-undef*/

/*
 * Mock XMLHttpRequest (see http://www.w3.org/TR/XMLHttpRequest)
 *
 * Written by Philipp von Weitershausen <philipp@weitershausen.de>
 * Released under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * For test interaction it exposes the following attributes:
 *
 * - method, url, urlParts, async, user, password
 * - requestText
 *
 * as well as the following methods:
 *
 * - getRequestHeader(header)
 * - setResponseHeader(header, value)
 * - receive(status, data)
 * - err(exception)
 * - authenticate(user, password)
 *
 */
function MockHttpRequest () {
    // These are internal flags and data structures
    this.error = false;
    this.sent = false;
    this.requestHeaders = {};
    this.responseHeaders = {};
}
MockHttpRequest.prototype = {
    withCredentials: true,

    statusReasons: {
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Moved Temporarily',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        307: 'Temporary Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Time-out',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Large',
        415: 'Unsupported Media Type',
        416: 'Requested range not satisfiable',
        417: 'Expectation Failed',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Time-out',
        505: 'HTTP Version not supported',
        507: 'Insufficient Storage'
    },

    /*** State ***/

    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    readyState: 0,


    /*** Request ***/

    open: function (method, url, async, user, password) {
        if (typeof method !== 'string') {
            throw 'INVALID_METHOD';
        }
        switch (method.toUpperCase()) {
            case 'CONNECT':
            case 'TRACE':
            case 'TRACK':
                throw 'SECURITY_ERR';

            case 'DELETE':
            case 'GET':
            case 'HEAD':
            case 'OPTIONS':
            case 'POST':
            case 'PUT':
                method = method.toUpperCase();
        }
        this.method = method;

        if (typeof url !== 'string') {
            throw 'INVALID_URL';
        }
        this.url = url;
        this.urlParts = this.parseUri(url);

        if (async === undefined) {
            async = true;
        }
        this.async = async;
        this.user = user;
        this.password = password;

        this.readyState = this.OPENED;
        this.onreadystatechange();
    },

    setRequestHeader: function (header, value) {
        header = header.toLowerCase();

        switch (header) {
            case 'accept-charset':
            case 'accept-encoding':
            case 'connection':
            case 'content-length':
            case 'cookie':
            case 'cookie2':
            case 'content-transfer-encoding':
            case 'date':
            case 'expect':
            case 'host':
            case 'keep-alive':
            case 'referer':
            case 'te':
            case 'trailer':
            case 'transfer-encoding':
            case 'upgrade':
            case 'user-agent':
            case 'via':
                return;
        }
        if ((header.substr(0, 6) === 'proxy-')
            || (header.substr(0, 4) === 'sec-')) {
            return;
        }

        // it's the first call on this header field
        if (this.requestHeaders[header] === undefined)
            {this.requestHeaders[header] = value;}
        else {
            var prev = this.requestHeaders[header];
            this.requestHeaders[header] = prev + ', ' + value;
        }

    },

    send: function (data) {
        if ((this.readyState !== this.OPENED)
            || this.sent) {
            throw 'INVALID_STATE_ERR';
        }
        if ((this.method === 'GET') || (this.method === 'HEAD')) {
            data = null;
        }

        //TODO set Content-Type header?
        this.error = false;
        this.sent = true;
        this.onreadystatechange();

        // fake send
        this.requestText = data;
        this.onsend();
    },

    abort: function () {
        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        delete this.requestText;
        this.onreadystatechange();
        this.onabort();
        this.readyState = this.UNSENT;
    },


    /*** Response ***/

    status: 0,
    statusText: '',

    getResponseHeader: function (header) {
        if ((this.readyState === this.UNSENT)
            || (this.readyState === this.OPENED)
            || this.error) {
            return null;
        }
        return this.responseHeaders[header.toLowerCase()];
    },

    getAllResponseHeaders: function () {
        var r = '';
        for (var header in this.responseHeaders) {
            if ((header === 'set-cookie') || (header === 'set-cookie2')) {
                continue;
            }
            //TODO title case header
            r += header + ': ' + this.responseHeaders[header] + '\r\n';
        }
        return r;
    },

    responseText: '',
    responseXML: undefined, //TODO


    /*** See http://www.w3.org/TR/progress-events/ ***/

    onload: function () {
        // Instances should override this.
    },

    onprogress: function () {
        // Instances should override this.
    },

    onerror: function () {
        // Instances should override this.
    },

    onabort: function () {
        // Instances should override this.
    },

    onreadystatechange: function () {
        // Instances should override this.
    },


    /*** Properties and methods for test interaction ***/

    onsend: function () {
        // Instances should override this.
    },

    getRequestHeader: function (header) {
        return this.requestHeaders[header.toLowerCase()];
    },

    setResponseHeader: function (header, value) {
        this.responseHeaders[header.toLowerCase()] = value;
    },

    makeXMLResponse: function (data) {
        var xmlDoc;
        // according to specs from point 3.7.5:
        // "1. If the response entity body is null terminate these steps
        //     and return null.
        //  2. If final MIME type is not null, text/xml, application/xml,
        //     and does not end in +xml terminate these steps and return null.
        var mimetype = this.getResponseHeader('Content-Type');
        mimetype = mimetype && mimetype.split(';', 1)[0];
        if ((mimetype == null) || (mimetype == 'text/xml') ||
           (mimetype == 'application/xml') ||
           (mimetype && mimetype.substring(mimetype.length - 4) == '+xml')) {
            // Attempt to produce an xml response
            // and it will fail if not a good xml
            try {
                if (window.DOMParser) {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(data, 'text/xml');
                } else { // Internet Explorer
                    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
                    xmlDoc.async = 'false';
                    xmlDoc.loadXML(data);
                }
            } catch (e) {
                // according to specs from point 3.7.5:
                // "3. Let document be a cookie-free Document object that
                // represents the result of parsing the response entity body
                // into a document tree following the rules from the XML
                //  specifications. If this fails (unsupported character
                // encoding, namespace well-formedness error etc.), terminate
                // these steps return null."
                xmlDoc = null;
            }
            // parse errors also yield a null.
            if ((xmlDoc && xmlDoc.parseError && xmlDoc.parseError.errorCode != 0)
                || (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == 'parsererror')
                || (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == 'html'
                    && xmlDoc.documentElement.firstChild && xmlDoc.documentElement.firstChild.nodeName == 'body'
                    && xmlDoc.documentElement.firstChild.firstChild && xmlDoc.documentElement.firstChild.firstChild.nodeName == 'parsererror')) {
                xmlDoc = null;
            }
        } else {
            // mimetype is specified, but not xml-ish
            xmlDoc = null;
        }
        return xmlDoc;
    },

    // Call this to simulate a server response
    receive: function (status, data) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw 'INVALID_STATE_ERR';
        }

        this.status = status;
        this.statusText = status + ' ' + this.statusReasons[status];
        this.readyState = this.HEADERS_RECEIVED;
        this.onprogress();
        this.onreadystatechange();

        this.responseText = data;
        this.responseXML = this.makeXMLResponse(data);

        this.readyState = this.LOADING;
        this.onprogress();
        this.onreadystatechange();

        this.readyState = this.DONE;
        this.onreadystatechange();
        this.onprogress();
        this.onload();
    },

    // Call this to simulate a request error (e.g. NETWORK_ERR)
    err: function (exception) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw 'INVALID_STATE_ERR';
        }

        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        this.readyState = this.DONE;
        if (!this.async) {
            throw exception;
        }
        this.onreadystatechange();
        this.onerror();
    },

    // Convenience method to verify HTTP credentials
    authenticate: function (user, password) {
        if (this.user) {
            return (user === this.user) && (password === this.password);
        }

        if (this.urlParts.user) {
            return ((user === this.urlParts.user)
                    && (password === this.urlParts.password));
        }

        // Basic auth.  Requires existence of the 'atob' function.
        var auth = this.getRequestHeader('Authorization');
        if (auth === undefined) {
            return false;
        }
        if (auth.substr(0, 6) !== 'Basic ') {
            return false;
        }
        if (typeof atob !== 'function') {
            return false;
        }
        auth = atob(auth.substr(6));
        var pieces = auth.split(':');
        var requser = pieces.shift();
        var reqpass = pieces.join(':');
        return (user === requser) && (password === reqpass);
    },

    // Parse RFC 3986 compliant URIs.
    // Based on parseUri by Steven Levithan <stevenlevithan.com>
    // See http://blog.stevenlevithan.com/archives/parseuri
    parseUri: function (str) {
        var pattern = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var key = ['source', 'protocol', 'authority', 'userInfo', 'user',
            'password', 'host', 'port', 'relative', 'path',
            'directory', 'file', 'query', 'anchor'];
        var querypattern = /(?:^|&)([^&=]*)=?([^&]*)/g;

        var match = pattern.exec(str);
        var uri = {};
        var i = 14;
        while (i--) {
            uri[key[i]] = match[i] || '';
        }

        uri.queryKey = {};
        uri[key[12]].replace(querypattern, function ($0, $1, $2) {
            if ($1) {
                uri.queryKey[$1] = $2;
            }
        });

        return uri;
    }
};


/*
 * A small mock "server" that intercepts XMLHttpRequest calls and
 * diverts them to your handler.
 *
 * Usage:
 *
 * 1. Initialize with either
 *       var server = new MockHttpServer(your_request_handler);
 *    or
 *       var server = new MockHttpServer();
 *       server.handle = function (request) { ... };
 *
 * 2. Call server.start() to start intercepting all XMLHttpRequests.
 *
 * 3. Do your tests.
 *
 * 4. Call server.stop() to tear down.
 *
 * 5. Profit!
 */
function MockHttpServer (handler) {
    if (handler) {
        this.handle = handler;
    }
}
MockHttpServer.prototype = {
    requests: [],
    start: function () {
        var self = this;

        function Request () {
            this.onsend = function () {
                self.requests.push(this);
                self.handle(this);
            };
            MockHttpRequest.apply(this, arguments);
        }
        Request.prototype = MockHttpRequest.prototype;

        window.OriginalHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = Request;
    },

    stop: function () {
        window.XMLHttpRequest = window.OriginalHttpRequest;
    },

    handle: function () {
        // Instances should override this.
    }
};

},{}],32:[function(require,module,exports){
/* eslint-disable no-undef*/
describe('Criteo Integration', function () {
    var expandCommerceEvent = function(event) {
            return [{
                EventName: event.EventName,
                EventDataType: event.EventDataType,
                EventAttributes: event.EventAttributes
            }];
        },
        MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        },
        EventType = {
            Unknown: 0,
            Navigation: 1,
            Location: 2,
            Search: 3,
            Transaction: 4,
            UserContent: 5,
            UserPreference: 6,
            Social: 7,
            Other: 8,
            Media: 9,
            ProductPurchase: 16,
            getName: function () {
                return 'blahblah';
            }
        },
        CommerceEventType = {
            ProductAddToCart: 10,
            ProductRemoveFromCart: 11,
            ProductCheckout: 12,
            ProductCheckoutOption: 13,
            ProductClick: 14,
            ProductViewDetail: 15,
            ProductPurchase: 16,
            ProductRefund: 17,
            PromotionView: 18,
            PromotionClick: 19,
            ProductAddToWishlist: 20,
            ProductRemoveFromWishlist: 21,
            ProductImpression: 22
        },
        ProductActionType = {
            Unknown: 0,
            AddToCart: 1,
            RemoveFromCart: 2,
            Checkout: 3,
            CheckoutOption: 4,
            Click: 5,
            ViewDetail: 6,
            Purchase: 7,
            Refund: 8,
            AddToWishlist: 9,
            RemoveFromWishlist: 10
        },
        IdentityType = {
            Other: 0,
            CustomerId: 1,
            Facebook: 2,
            Twitter: 3,
            Google: 4,
            Microsoft: 5,
            Yahoo: 6,
            Email: 7,
            Alias: 8,
            FacebookCustomAudienceId: 9,
            getName: function () {return 'CustomerID';}
        },
        PromotionActionType = {
            Unknown: 0,
            PromotionView: 1,
            PromotionClick: 2
        },
        ReportingService = function () {
            var self = this;

            this.id = null;
            this.event = null;

            this.cb = function (forwarder, event) {
                self.id = forwarder.id;
                self.event = event;
            };

            this.reset = function () {
                this.id = null;
                this.event = null;
            };
        },
        reportService = new ReportingService();

    before(function () {
        mParticle.EventType = EventType;
        mParticle.ProductActionType = ProductActionType;
        mParticle.PromotionType = PromotionActionType;
        mParticle.IdentityType = IdentityType;
        mParticle.CommerceEventType = CommerceEventType;
        mParticle.eCommerce = {};
        mParticle.eCommerce.expandCommerceEvent = expandCommerceEvent;
    });

    beforeEach(function() {
        window.criteo_q = [];
        mParticle.forwarder.init({
            apiKey: 'abcde'
        }, reportService, true);
    });

    it('should log view basket event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewBasket');
        criteo_q[2].item[0].id.should.equal('12345');
        criteo_q[2].item[0].price.should.equal(400);
        criteo_q[2].item[0].quantity.should.equal(1);
        criteo_q[2].item[1].id.should.equal('23456');
        criteo_q[2].item[1].price.should.equal(500);
        criteo_q[2].item[1].quantity.should.equal(2);

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        done();
    });

    it('should log view product event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductViewDetail,
            EventName: 'Test Product Detail',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewItem');
        criteo_q[2].item[0].should.equal('12345');
        criteo_q[2].item[1].should.equal('23456');

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        done();
    });

    it('should log view product list event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductImpression,
            EventName: 'Test Product Detail',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductImpressions: [
                { ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ] },
                { ProductList: [
                    {
                        Sku: '34567',
                        Price: 100,
                        Quantity: 1
                    },
                    {
                        Sku: '45678',
                        Price: 500,
                        Quantity: 2
                    }
                ] }
            ]
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewList');
        criteo_q[2].item[0].should.equal('12345');
        criteo_q[2].item[1].should.equal('23456');
        criteo_q[2].item[2].should.equal('34567');
        criteo_q[2].item[3].should.equal('45678');

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        done();
    });

    it('should log track transaction event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductPurchase,
            EventName: 'Test Product Detail',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                TransactionId: 'id123',
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('trackTransaction');
        criteo_q[2].item[0].id.should.equal('12345');
        criteo_q[2].item[0].price.should.equal(400);
        criteo_q[2].item[0].quantity.should.equal(1);
        criteo_q[2].item[1].id.should.equal('23456');
        criteo_q[2].item[1].price.should.equal(500);
        criteo_q[2].item[1].quantity.should.equal(2);

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        done();
    });

    it('should log view home event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'homepage',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            CustomFlags: {
                CRITEO_VIEW_HOMEPAGE: true
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewHome');

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        done();
    });

    it('should not log a non-homepage event', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'test event',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            }
        });

        criteo_q.length.should.equal(0);

        done();
    });

    it('should set setSiteType of m or t when these are set as event attributes', function(done) {
        mParticle.forwarder.init({
            apiKey: 'abcde'
        }, reportService, true, null, null, null, null, null, {CRITEO_SITETYPE: 'm'});

        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'homepage',
            CustomFlags: {
                CRITEO_VIEW_HOMEPAGE: true
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('m');

        criteo_q[2].event.should.equal('viewHome');

        criteo_q = [];

        mParticle.forwarder.init({
            apiKey: 'abcde'
        }, reportService, true, null, null, null, null, null, {CRITEO_SITETYPE: 't'});
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'homepage',
            CustomFlags: {
                CRITEO_VIEW_HOMEPAGE: true
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('t');

        criteo_q[2].event.should.equal('viewHome');

        done();
    });

    it('should set customer id and customer emails', function(done) {
        mParticle.forwarder.setUserIdentity('customerid', mParticle.IdentityType.CustomerId);
        mParticle.forwarder.setUserIdentity('email@test.com', mParticle.IdentityType.Email);
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('setEmail');
        criteo_q[2].email.should.equal('email@test.com');

        criteo_q[3].event.should.equal('setCustomerId');
        criteo_q[3].id.should.equal('customerid');

        criteo_q[4].event.should.equal('viewBasket');
        criteo_q[4].item[0].id.should.equal('12345');
        criteo_q[4].item[0].price.should.equal(400);
        criteo_q[4].item[0].quantity.should.equal(1);
        criteo_q[4].item[1].id.should.equal('23456');
        criteo_q[4].item[1].price.should.equal(500);
        criteo_q[4].item[1].quantity.should.equal(2);

        criteo_q[5].event.should.equal('setData');
        criteo_q[5].category.should.equal('category');
        criteo_q[5].label.should.equal('label');
        criteo_q[5].value.should.equal(200);

        done();
    });

    it('should set customer id only', function(done) {
        mParticle.forwarder.setUserIdentity('customerid', mParticle.IdentityType.CustomerId);

        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('setCustomerId');
        criteo_q[2].id.should.equal('customerid');

        criteo_q[3].event.should.equal('viewBasket');
        criteo_q[3].item[0].id.should.equal('12345');
        criteo_q[3].item[0].price.should.equal(400);
        criteo_q[3].item[0].quantity.should.equal(1);
        criteo_q[3].item[1].id.should.equal('23456');
        criteo_q[3].item[1].price.should.equal(500);
        criteo_q[3].item[1].quantity.should.equal(2);

        criteo_q[4].event.should.equal('setData');
        criteo_q[4].category.should.equal('category');
        criteo_q[4].label.should.equal('label');
        criteo_q[4].value.should.equal(200);

        done();
    });

    it('should set customer email only and have subsequent requests continue to have email', function(done) {
        mParticle.forwarder.setUserIdentity('email@test.com', mParticle.IdentityType.Email);

        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('setEmail');
        criteo_q[2].email.should.equal('email@test.com');

        criteo_q[3].event.should.equal('viewBasket');
        criteo_q[3].item[0].id.should.equal('12345');
        criteo_q[3].item[0].price.should.equal(400);
        criteo_q[3].item[0].quantity.should.equal(1);
        criteo_q[3].item[1].id.should.equal('23456');
        criteo_q[3].item[1].price.should.equal(500);
        criteo_q[3].item[1].quantity.should.equal(2);

        criteo_q[4].event.should.equal('setData');
        criteo_q[4].category.should.equal('category');
        criteo_q[4].label.should.equal('label');
        criteo_q[4].value.should.equal(200);

        criteo_q = [];

        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('setEmail');
        criteo_q[2].email.should.equal('email@test.com');

        criteo_q[3].event.should.equal('viewBasket');
        criteo_q[3].item[0].id.should.equal('12345');
        criteo_q[3].item[0].price.should.equal(400);
        criteo_q[3].item[0].quantity.should.equal(1);
        criteo_q[3].item[1].id.should.equal('23456');
        criteo_q[3].item[1].price.should.equal(500);
        criteo_q[3].item[1].quantity.should.equal(2);

        criteo_q[4].event.should.equal('setData');
        criteo_q[4].category.should.equal('category');
        criteo_q[4].label.should.equal('label');
        criteo_q[4].value.should.equal(200);

        done();
    });

    it('should reset setData if previous event had data and next event does not', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            EventAttributes: {
                label: 'label',
                value: 200,
                category: 'category'
            },
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewBasket');
        criteo_q[2].item[0].id.should.equal('12345');
        criteo_q[2].item[0].price.should.equal(400);
        criteo_q[2].item[0].quantity.should.equal(1);
        criteo_q[2].item[1].id.should.equal('23456');
        criteo_q[2].item[1].price.should.equal(500);
        criteo_q[2].item[1].quantity.should.equal(2);

        criteo_q[3].event.should.equal('setData');
        criteo_q[3].category.should.equal('category');
        criteo_q[3].label.should.equal('label');
        criteo_q[3].value.should.equal(200);

        criteo_q = [];

        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            EventCategory: mParticle.CommerceEventType.ProductAddToCart,
            EventName: 'Test Add To Cart',
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    },
                    {
                        Sku: '23456',
                        Price: 500,
                        Quantity: 2
                    }
                ]
            }
        });

        criteo_q[0].event.should.equal('setAccount');
        criteo_q[0].account.should.equal('abcde');

        criteo_q[1].event.should.equal('setSiteType');
        criteo_q[1].type.should.equal('d');

        criteo_q[2].event.should.equal('viewBasket');
        criteo_q[2].item[0].id.should.equal('12345');
        criteo_q[2].item[0].price.should.equal(400);
        criteo_q[2].item[0].quantity.should.equal(1);
        criteo_q[2].item[1].id.should.equal('23456');
        criteo_q[2].item[1].price.should.equal(500);
        criteo_q[2].item[1].quantity.should.equal(2);

        Should(criteo_q[3]).not.be.ok();

        done();
    });
});

},{}]},{},[30]);
