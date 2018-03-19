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

(function (window) {
    var name = 'Criteo',
        MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        };

    var constructor = function () {
        var self = this,
            reportingService,
            // each of the following Criteo Event Types are set and then an
            // array of them are processed in processQueuedCriteoEvent
            setAccountEvent = { event: 'setAccount' },
            setSiteTypeEvent = { event: 'setSiteType' },
            setEmailEvent = { event: 'setEmail' },
            setCustomerIdEvent = { event: 'setCustomerId' },
            setDataEvent = { event: 'setData' };

        self.name = name;

        function initForwarder(forwarderSettings, service, testMode) {
            if (!testMode) {
                reportingService = service;
                settings = forwarderSettings;
                try {
                    if (!testMode) {
                        var criteoScript = document.createElement('script');
                        window.criteo_q = window.criteo_q || [];
                        criteoScript.type = 'text/javascript';
                        criteoScript.async = true;
                        criteoScript.src = 'https://static.criteo.net/js/ld/ld.js';
                        (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(criteoScript);
                    }

                }
                catch (e) {
                    return 'Failed to initialize: ' + e;
                }
            } else {
                setAccountEvent = { event: 'setAccount' };
                setSiteTypeEvent = { event: 'setSiteType' };
                setEmailEvent = { event: 'setEmail' };
                setCustomerIdEvent = { event: 'setCustomerId' };
                setDataEvent = { event: 'setData' };
            }

            setAccountEvent.account = forwarderSettings.apiKey;
            return 'Criteo successfully loaded';
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
                    if (event.EventName === 'homepage') {
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

        function modifySetSiteTypeEvent(event) {
            if (event.EventAttributes && event.EventAttributes['siteType']) {
                setSiteTypeEvent.type = event.EventAttributes['siteType'];
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

            console.log(criteoEvent);

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

    if (!window || !window.mParticle || !window.mParticle.addForwarder) {
        return;
    }

    window.mParticle.addForwarder({
        name: name,
        constructor: constructor
    });
})(window);
