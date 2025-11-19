// Copyright (C) 2025 IXI Labs
// This file is part of Ixian Core - https://github.com/ixian-platform/Spixi-Mini-Apps
//
// Ixian Core is free software: you can redistribute it and/or modify
// it under the terms of the MIT License as published
// by the Open Source Initiative.
//
// Ixian Core is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// MIT License for more details.

// Spixi Mini Mini Apps SDK

var SpixiAppSdk = {
    version: 0.3,
    date: "2025-07-31",
    fireOnLoad: function () { location.href = "ixian:onload"; },
    back: function () { location.href = "ixian:back"; },
    sendNetworkData: function (data) { location.href = "ixian:data" + encodeURIComponent(data); },
    sendNetworkProtocolData: function (protocolId, data) { location.href = "ixian:protocolData" + protocolId + "=" + encodeURIComponent(data); },
    getStorageData: function (key) { location.href = "ixian:getStorageData" + encodeURIComponent(key); },
    setStorageData: function (key, value) { location.href = "ixian:setStorageData" + encodeURIComponent(key) + "=" + encodeURIComponent(value); },
    spixiAction: function (actionData) { location.href = "ixian:action" + encodeURIComponent(actionData); },

    // on* handlers should be overriden by the app
    onInit: function (sessionId, userAddresses) { /* App override */ },
    onStorageData: function (key, value) { /* App override */ },
    onNetworkData: function (senderAddress, data) { /* App override */ },
    onNetworkProtocolData: function (senderAddress, protocolId, data) { /* App override */ },
    onRequestAccept: function (data) { /* App override */ },
    onRequestReject: function (data) { /* App override */ },
    onAppEndSession: function (data) { /* App override */ }
};
