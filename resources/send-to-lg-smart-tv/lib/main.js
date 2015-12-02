/*
Copyright (c) 2015 MarshakDeveloper and !Joy!
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//Includes
var Request = require("sdk/request").Request;
var prefs = require("sdk/simple-prefs").prefs;
var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");
var _ = require("sdk/l10n").get;
var cm = require("sdk/context-menu");
var addonUri = require("sdk/self").uri;
var tabs = require("sdk/tabs");
var store = require("sdk/simple-storage");
var panel;
var manager;
var topmenu;
var separator;
var DeviceIP;
var DeviceLabel;
var DevicePlatform;
var DeviceKey;
var YTworkers = [];
var RTworkers = [];

function getYoutuParams(html) {
    var URL = "url=";
    var QUALITY = "quality=";
    var FALLBACK_HOST = "fallback_host=";
    var TYPE = "type=";
    var ITAG = "itag=";
    var SIG = "sig=";
    var S = "s=";

    try {
        var innerHTML = html;
    } catch (ex) {
        return false;
    } // in case document is not fully loaded ---
    //  var urls = innerHTML.match(/"url_encoded_fmt_stream_map":"([^"]*)"/)[1];
    var title = " | YouTube | " + decodeURIComponent(innerHTML.match(
        /&title=([^&]*)&/)[1]).replace(/\+/g, " ");
    var urls = innerHTML.match(/url_encoded_fmt_stream_map=([^&]*)&/)[1];
    urls = urls.split("%2C");
    //   urls = urls.split(",");
    var videoParams = new Array();
    var s = false;
    for (var i in urls) {
        urls[i] = unescape(urls[i]);
        // var params = urls[i].split("\\u0026");
        var params = urls[i].split("&");
        for (var j in params) {
            if (params[j].indexOf(URL) != -1) {
                var url = params[j].split(URL)[1];
            }
            if (params[j].indexOf(QUALITY) != -1) {
                var quality = params[j].split(QUALITY)[1];
            }
            if (params[j].indexOf(FALLBACK_HOST) != -1) {
                var fallbackHost = params[j].split(FALLBACK_HOST)[1];
            }
            if (params[j].indexOf(TYPE) != -1) {
                var fileType = params[j].split(TYPE)[1];
            }
            if (params[j].indexOf(ITAG) != -1) {
                var itag = parseInt(params[j].split(ITAG)[1]);
            }
            if (params[j].indexOf(SIG) != -1) {
                var sig = params[j].split(SIG)[1];
            }
            if (params[j].indexOf(S) != -1 && params[j].substring(0, 2) == S) {
                s = params[j].split(S)[1];
            }
        }
        if (sig && url.indexOf("signature") == -1) {
            url += "&signature=" + sig;
        }

        videoParams.push({
            url: url, // "\u0026" is an "&"
            quality: quality, // example, "large", "medium"
            fallbackHost: fallbackHost, // example, "tc.v22.cache4.c.youtube.com"
            id: i,
            itag: itag,
            s: s,
            title: title
        });
    }
    return videoParams
}
//Update? Just see if we can find the deprecated config entries//Update if
function checkUpdate() {
    if (!store.storage.servers || store.storage.servers.length === 0) {
        store.storage.servers = [];
    }
}

//Launch configuration manager
function launchConfigTab() {
    for (let tab of tabs) {
        if (tab.url ===
            "resource://send-to-lg-smart-tv-at-jetpack/send-to-lg-smart-tv/data/preferences.html"
        ) {
            tab.activate();
            return;
        }
    }
    tabs.open({
        url: data.url('preferences.html')
    });
}
//Save the servers
function saveServers(servers) {
    store.storage.servers = [];
    servers.forEach(function(server) {
        store.storage.servers.push({
            label: server.label,
            host: server.host,
            platform: server.platform,
            key: server.key
        });
    });
    refreshMenus();
}
//Sends the current options in the settings page
function getCurrServ(worker) {
    worker.port.emit('init', {
        servers: getServers(),
        YTresolution: prefs.ytresolution,
        textbtnDEL: _("Delete"),
        textbtnEDIT: _("Edit")
    });
}
//Refresh context menus with new servers
function refreshMenus() {
    //Remove all old items from the menu
    if (topmenu.items) {
        topmenu.items.forEach(function(it) {
            it.destroy();
        });
    }
    topmenu.destroy();
    if (store.storage.servers.length > 1) {
        setUpTopMenu(initSubMenus());
    } else {
        SingleContextMenu();
    }
}
//Set up the top context menu with submenus
function setUpTopMenu(mitems) {
    topmenu = cm.Menu({
        label: "Send to LG smartTV",
        //Now not supporting. Add in future if will support   a[href*=".jpg"],a[href*=".png"],a[href*=".gif"],a[href*=".jpeg"],a[href*=".tiff"],
        context: cm.SelectorContext(
            'a[href*="rutube.ru/video"]:not([href*="person"]),a[style*="rutube.ru"][href^="/video"]:not([href*="person"]),a[href*="youtu"],a[href^="/watch"],a[href^="/get"],a[href*=".mp4"],a[href*=".mkv"],a[href*=".avi"],a[href*=".flv"],a[href*=".wmv"],a[href*=".asf"],a[href*=".mp3"],a[href*=".flac"],a[href*=".mka"],a[href*=".mov"],a[href*=".m4a"],a[href*=".aac"],a[href*=".ogg"],a[href*=".pls"],a[href*=".mpg"],a[href*=".m3u"],a[href*=".ts"]'
        ),
        image: data.url('lg_logo.ico'),
        contentScript: 'self.on("click", function (node, data) {' +
            ' self.postMessage({url:node.href,pathname:node.pathname,server:data});' +
            '});',
        items: mitems[0],
        onMessage: function(data) {
            if (data.server != undefined) {
                var servANDlable = data.server.split('separator_string');
                DeviceIP = servANDlable[0];
                DeviceLabel = servANDlable[1];
                DevicePlatform = servANDlable[2];
                DeviceKey = servANDlable[3];
                parseUrl(data.url, data.pathname);
            }
        }
    });
    separator = cm.Separator();
    topmenu.addItem(separator);
    manager = cm.Item({
        label: _("Manage Send to LG smartTV"),
        contentScript: 'self.on("click", self.postMessage)',
        onMessage: launchConfigTab
    });
    topmenu.addItem(manager);
}
//Create submenus
function initSubMenus() {
    //Parse all servers
    var servers = getServers();
    var items = [];
    servers.forEach(function(server) {
        var it = cm.Item({
            label: server.label,
            data: server.host + 'separator_string' + server.label +
                'separator_string' + server.platform +
                'separator_string' + server.key
        });
        items.push(it);
    });
    return [items];
}
//Get all servers from the config
function getServers() {
    if (!store.storage.servers)
        store.storage.servers = [];
    return store.storage.servers;
}
// Create sigle context menu
function SingleContextMenu() {
    var servers = getServers();
    if (servers[0] !== undefined) {
        DeviceIP = servers[0].host;
        DevicePlatform = servers[0].platform;
        DeviceKey = servers[0].key;
        DeviceLabel = "";
    } else {
        DeviceIP = "";
        DeviceKey = "";
        DevicePlatform = "";
    }
    topmenu = cm.Item({
        label: "Send to LG smart TV",
        //Now not supporting. Add in future if will support   a[href*=".jpg"],a[href*=".png"],a[href*=".gif"],a[href*=".jpeg"],a[href*=".tiff"],
        context: cm.SelectorContext(
            'a[href*="rutube.ru/video"]:not([href*="person"]),a[style*="rutube.ru"][href^="/video"]:not([href*="person"]),a[href*="youtu"],a[href^="/watch"],a[href^="/get"],a[href*=".mp4"],a[href*=".mkv"],a[href*=".avi"],a[href*=".flv"],a[href*=".wmv"],a[href*=".asf"],a[href*=".mp3"],a[href*=".flac"],a[href*=".mka"],a[href*=".mov"],a[href*=".m4a"],a[href*=".aac"],a[href*=".ogg"],a[href*=".pls"],a[href*=".mpg"],a[href*=".m3u"],a[href*=".ts"]'
        ),
        image: data.url('lg_logo.ico'),
        contentScript: 'self.on("click", function (node, data) {' +
            ' self.postMessage({url:node.href,pathname:node.pathname});' +
            '});',
        onMessage: function(data) {
            parseUrl(data.url, data.pathname);
        }
    });
}
//Request for get key and check key, from preference page.
function getKeyAndChekKeyFromPreferences(worker, data) {
    //console.log("Создали и отправили запрос", data.Label, data.IP, data.Platform, data.Key, data.Command);
    Request({
        url: "http://" + data.IP + ":8080/udap/api/pairing",
        headers: {
            "User-Agent": "UDAP/2.0",
            "Connection": "Close",
            "Cache-Control": "no-cache"
        },
        content: (data.Command === "ShowKey") ?
            "<?xml version=\"1.0\" encoding=\"utf-8\"?><envelope>" +
            "<api type=\"pairing\"><name>showKey</name></api></envelope>" : "<?xml version=\"1.0\" encoding=\"utf-8\"?><envelope>" +
            "<api type=\"pairing\"><name>hello</name><value>" + data.Key +
            "</value><port>8080</port></api></envelope>",
        contentType: "text/xml; charset=utf-8",
        onComplete: function(resp) {
            //console.log(resp.status + resp.statusText);
            for (var headerName in resp.headers) {
                //console.log(headerName + " : " + resp.headers[headerName]);
            }
            if (resp.status == 200) {
                var designation = (data.Command === "ShowKey") ? _(
                        "Authorization key should be displayed on the TV screen. Enter it in the \"LG Smart TV KEY\" with no spaces."
                    ) :
                    _(
                        "Authorization key is valid. You can add this TV to the list."
                    );
                displayMessage(_(handlingServerTVresponses(resp.status,
                    data.Command)), designation, "", 'ok');
            } else {
                if (resp.status) {
                    displayMessage(_("Error"), _(handlingServerTVresponses(
                        resp.status, data.Command)), "", 'error');
                } else {
                    displayMessage(_("Network error"), _(
                        handlingServerTVresponses(resp.status, data.Command)
                    ), "", 'error');
                }
            }
            worker.port.emit('keymessage', {});
        }
    }).post();
}

exports.onUnload = function(reason) {
    if (reason === "disable") {
        for (let tab of tabs) {
            if (tab.url ===
                "resource://send-to-lg-smart-tv-at-jetpack/send-to-lg-smart-tv/data/preferences.html"
            ) {
                tab.close();
                return;
            }
        }
    }
}

exports.main = function(options) {
    checkUpdate();
    if (store.storage.servers.length > 1) {
        setUpTopMenu(initSubMenus());
    } else SingleContextMenu();

    pageMod.PageMod({
        include: "*.youtube.com",
        contentScriptFile: data.url("youtube.js"),
        attachTo: ["existing", "top"],
        onAttach: function(worker) {
            worker.port.emit('injectSendButton', {
                image: data.url('LGyouT.png'),
                servers: getServers()
            });
            worker.port.on("openurl", function(data) {
                DeviceIP = data.server;
                DeviceLabel = data.label;
                DeviceKey = data.key;
                DevicePlatform = data.platform;
                YouTubeSearchLink(data.url);
            });
            //Keep a list of the active workers to be able to notify them in case the configuration changes
            YTworkers.push(worker);
            worker.on('detach', function() {
                var index = YTworkers.indexOf(this);
                if (index != -1) {
                    YTworkers.splice(index, 1);
                }
            });
        }
    });
    pageMod.PageMod({
        include: "*.rutube.ru",
        contentScriptFile: data.url("rutube.js"),
        attachTo: ["existing", "top"],
        onAttach: function(worker) {
            worker.port.emit('injectSendButton', {
                image: data.url('LG_rutoo.png'),
                servers: getServers()
            });
            worker.port.on("openurl", function(data) {
                DeviceIP = data.server;
                DeviceLabel = data.label;
                DeviceKey = data.key;
                DevicePlatform = data.platform;
                RuTubeSearchLink(data.url);
            });
            //Keep a list of the active workers to be able to notify them in case the configuration changes
            RTworkers.push(worker);
            worker.on('detach', function() {
                var index = RTworkers.indexOf(this);
                if (index != -1) {
                    RTworkers.splice(index, 1);
                }
            });
        }
    });
    pageMod.PageMod({
        include: data.url('preferences.html'),
        contentScriptFile: [data.url("jquery-2.1.1.min.js"), data.url(
            'preferences.js')],
        onAttach: function(worker) {
            worker.port.on("updateservers", function(servers,
                YoutubeResolutios) {
                //Update the server configuration
                prefs.ytresolution = YoutubeResolutios;
                saveServers(servers);
                //Poke the YouTube workers that the configuration changed
                if (YTworkers.length > 0) {
                    YTworkers.forEach(function(ytworker, i) {
                        try {
                            ytworker.port.emit('refreshButton', {
                                image: data.url('LGyouT.png'),
                                servers: getServers()
                            });
                        } catch (e) {
                            console.log("YT " + e);
                        }
                    });
                }
                //Poke the RuTube workers that the configuration changed
                if (RTworkers.length > 0) {
                    RTworkers.forEach(function(rtworker, i) {
                        try {
                            rtworker.port.emit('refreshButton', {
                                image: data.url('LG_rutoo.png'),
                                servers: getServers()
                            });
                        } catch (e) {
                            console.log("RT " + e);
                        }
                    });
                }
            });
            //Now sends the current options in the settings page
            getCurrServ(worker);
            worker.port.on("getkey", function(data) {
                getKeyAndChekKeyFromPreferences(worker, data);
            });
        }
    });
    //console.log("Причина запуска", options.loadReason);
    if (options.loadReason === "upgrade" || options.loadReason === "downgrade") {
        for (let tab of tabs) {
            if (tab.url ===
                "resource://send-to-lg-smart-tv-at-jetpack/send-to-lg-smart-tv/data/preferences.html"
            ) {
                tab.reload();
            }
        }
    }
};

function displayMessage(title, message, message2, type) {
    var futer = _(
        "If you enjoy this add-on, you can support its continued development by making a small contribution."
    );
    if (message2 !== '') {
        message2 = '"' + message2 + '"';
    }
    if (panel) {
        panel.show();
        panel.port.emit("showtext", {
            'title': title,
            'message': message,
            'devicelabel': message2,
            'futer': futer,
            'type': type
        });
    } else {
        panel = require("sdk/panel").Panel({
            width: 300,
            height: 200,
            contentURL: data.url('dialog.html'),
            contentScriptFile: data.url("listener.js"),
            onHide: function() {
                panel.destroy();
                panel = null;
            },
            onShow: function() {
                panel.port.emit("showtext", {
                    'title': title,
                    'message': message,
                    'devicelabel': message2,
                    'futer': futer,
                    'type': type
                });
            }
        }).show();
    }
}

function parseUrl(url, pathname) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
        YouTubeSearchLink(url);
        return;
    }
    var regExp2 = /^.*(youtube.com\/watch.*[\?\&]v=)([^#\&\?]*).*/;
    var match = url.match(regExp2);
    if (match && match[2].length == 11) {
        YouTubeSearchLink(url);
        return;
    }
    var regExp3 = /rutube.ru\/video\/([^\/].*)\//;
    var match = url.match(regExp3);
    if (match && match[1].length == 32) {
        RuTubeSearchLink(url);
        return;
    }
    var ext = pathname.split('.').pop();
    sendToLGsmartTV(url);
    return;
}

function extractVideoID(url) {
    var regExp =
        /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[7].length == 11) {
        return match[7];
    }
}

function YouTubeSearchLink(link) {
    var videoId = extractVideoID(link);
    link = 'http://www.youtube.com/get_video_info?&video_id=' + videoId +
        '&asv=3&el=detailpage&hl=en_US';
    Request({
        url: link,
        anonymous: true,
        //headers: {"User-Agent": "None"}, // "User-Agent": "None" for youtube server, that he thought that I do not know what is SSL
        onComplete: function(resp) {
            var videos = getYoutuParams(resp.text);
            var url = "";
            var ytresolution;
            if (prefs.ytresolution == '1080p') {
                ytresolution = 37;
            }
            if (prefs.ytresolution == '720p') {
                ytresolution = 22;
            }
            if (prefs.ytresolution == '360p') {
                ytresolution = 18;
            }

            var needVideo = null;
            videos.forEach(function(video) {
                if (video.itag == ytresolution) {
                    needVideo = video;
                }
            });
            if (!needVideo) {
                videos.forEach(function(video) {
                    if (video.itag == 22) {
                        needVideo = video;
                    }
                });
            }
            if (!needVideo) {
                videos.forEach(function(video) {
                    if (video.itag == 18) {
                        needVideo = video;
                    }
                });
            }

            url = needVideo.url;
            if (url == "") {
                displayMessage(_("Error"), _("No supported formats: "), '',
                    'error');
            } else {
                url = decodeURIComponent(url);
                url = url.replace(/&/g, "%26");
                if (needVideo.s) {
                  // Instead of "any the site" must be a real address
                    var forDecodeUrl = "http://any the site/echo?message=" + needVideo.s;
                    Request({
                        url: forDecodeUrl,
                        onComplete: function(resp) {
                            if (resp.status == 200) {
                                url += "%26signature=" + resp.text;
                                sendToLGsmartTV(url, needVideo.title);
                            } else {
                                displayMessage(_("Error"), _(
                                        "Server decrypt signature return ERROR "
                                    ) + resp.status + ': ' + resp.statusText,
                                    '', 'error');
                            }
                        }
                    }).get();
                } else {
                    sendToLGsmartTV(url, needVideo.title);
                }
            }
        }
    }).get();
}

function RuTubeSearchLink(link) {
    Request({
        url: link,
        onComplete: function(resp) {
            var title = " | RuTube | " + resp.text.match(/<h1>(.*)<\/h1>/)[1];
            var rutubeVideoID = link.match(/rutube.ru\/video\/([^\/].*)\//)[1];
            link = "http://rutube.ru/api/play/options/" + rutubeVideoID +
                "/?format=json";
            Request({
                url: link,
                onComplete: function(resp) {
                    getRutubeParams(resp.text, title);
                }
            }).get();
        }
    }).get();
}

function getRutubeParams(html, title) {
    try {
        var innerHTML = html;
    } catch (ex) {
        return false;
    } // in case document is not fully loaded ---
    if (innerHTML.search(/\"m3u8\"\: \"([^\"]*)\"/) == -1) {
        displayMessage(_("Error"), _(
            "This video can not be sent to LG Smart TV. Most likely, the copyright holder of this video, banned the show in your region."
        ), '', 'error');
        return;
    }
    var urls = innerHTML.match(/\"m3u8\"\: \"([^\"]*)\"/)[1];
    Request({
        url: urls,
        overrideMimeType: "text/plain; charset=latin1",
        onComplete: function(resp) {
            var playlistRes = resp.text;
            playlistRes = playlistRes.replace(/\#EXT([^\n].*)\n/gm, "").replace(
                /\n$/, '').split("\n");
            var videourl = playlistRes[playlistRes.length - 1];
            sendToLGsmartTV(videourl, title);
        }
    }).get();
}

function handlingServerTVresponses(status, operation) {
    if (!status) {
        var message =
            "Smart TV not answer. TV must be enabled and connected to your network. Check your configuration.";
        return message;
    }
    if (operation === "ShowKey") {
        var message = (status == 200) ? "The showKey request is successful." :
            (status == 400) ?
            "The showKey request is transmitted in an incorrect format." :
            (status == 401) ?
            "The showKey request is transmitted but access denied." :
            (status == 500) ?
            "During showKey request handling, an internal handling error occurs in a Host." :
            "Status responses unknown. Status = " + status;
        return message;
    }
    if (operation === "Hello") {
        var message = (status == 200) ? "The hello request is successful." :
            (status == 400) ?
            "The hello request is transmitted in an incorrect format." :
            (status == 401) ? "The pairing key value is not valid." :
            (status == 500) ?
            "During hello request handling, an internal handling error occurs in a Host." :
            (status == 503) ?
            "Maximum number of Controllers that a Host can accommodate has been exceeded." :
            "Status responses unknown. Status = " + status;
        return message;
    }
    if (operation === "Get AUID") {
        var message = (status == 200) ?
            "Send command Get AUID \"Player Send to LG\" is successful.." :
            (status == 400) ? "Bad Request : Wrong format requested." :
            (status == 401) ? "The pairing key value is not valid." :
            (status == 500) ?
            "During hello request handling, an internal handling error occurs in a Host." :
            (status == 503) ?
            "Service Unavailable : There is no corresponding app for the AUID. To use this add-on you need install on TV application \"Player Send to LG\"" :
            "Status responses unknown. Status = " + status;
        return message;
    }
    if (operation === "Get Status") {
        var message = (status == 200) ?
            "Send command Get Status \"Player Send to LG\" is successful.." :
            (status == 400) ? "Bad Request : Wrong format requested." :
            (status == 401) ? "The pairing key value is not valid." :
            (status == 500) ?
            "During hello request handling, an internal handling error occurs in a Host." :
            (status == 503) ?
            "Service Unavailable : There is no corresponding app for the AUID. To use this add-on you need install on TV application \"Player Send to LG\"" :
            "Status responses unknown. Status = " + status;
        return message;
    }
    if (operation === "Run") {
        var message = (status == 200) ?
            "Send command Run \"Player Send to LG\" is successful.." :
            (status == 400) ? "Bad Request : Wrong format requested." :
            (status == 401) ? "The pairing key value is not valid." :
            (status == 500) ?
            "During hello request handling, an internal handling error occurs in a Host." :
            (status == 503) ?
            "Service Unavailable : There is no corresponding app for the AUID. To use this add-on you need install on TV application \"Player Send to LG\"" :
            "Status responses unknown. Status = " + status;
        return message;
    }
    if (operation === "Send Play") {
        var message = (status == 200) ? "Send Message \"Play\" is successful.." :
            (status == 400) ? "Bad Request : Wrong format requested." :
            (status == 401) ? "The pairing key value is not valid." :
            (status == 500) ?
            "During hello request handling, an internal handling error occurs in a Host." :
            (status == 503) ?
            "Service Unavailable : There is no corresponding app for the AUID. To use this add-on you need install on TV application \"Player Send to LG\"" :
            "Status responses unknown. Status = " + status;
        return message;
    }
}

function sendToLGsmartTV(fileurl, title) {
    var setInterval = require("sdk/timers").setInterval;
    var clearInterval = require("sdk/timers").clearInterval;
    var setTimeout = require("sdk/timers").setTimeout;
    var operation;

    //console.log("fileurl=   "+fileurl+"    =fileurl");


    try {
        fileurl = decodeURIComponent(fileurl);
    } catch (e) {
        fileurl = unescape(fileurl)
    }

    //console.log("fileurl= "+fileurl);
    //console.log("DeviceLabel= "+DeviceLabel, "DeviceIP= "+DeviceIP, "DeviceKey= "+DeviceKey);
    //console.log("TITLE", title);

    if (fileurl.search(/googlevideo\.com\/videoplayback/) == -1) { //Проверяем не ютобовская ли ссылка
        fileurl = fileurl.replace("https", "http"); // Для контакта с доподнительными плагинами.
    }
    if (DeviceIP == '') {
        displayMessage(_("Error"), _(
            "You have to set up your LG Smart TV address first in the Addon Settings"
        ), '', 'error');
        return false;
    }
    displayMessage(_("Sending"), _("Sending url to LG Smart TV... "),
        DeviceLabel, 'info');
    SendHelloForPairing();

    function SendHelloForPairing() {
        Request({ // Hello
            url: "http://" + DeviceIP + ":8080/udap/api/pairing",
            headers: {
                "User-Agent": "UDAP/2.0",
                "Connection": "Close",
                "Cache-Control": "no-cache"
            },
            content: "<?xml version=\"1.0\" encoding=\"utf-8\"?><envelope>" +
                "<api type=\"pairing\"><name>hello</name><value>" +
                DeviceKey +
                "</value><port>8080</port></api></envelope>",
            contentType: "text/xml; charset=utf-8",
            onComplete: function(resp) {
                operation = "Hello";
                //console.log("Рукопожатие " + resp.status + " " + resp.statusText);
                //console.log(handlingServerTVresponses(resp.status, operation));
                /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                //console.log("Cодержимое ответа", resp.text);
                if (resp.status == 200) {
                    GetAUIDvideoplayer();
                } else {
                    //console.log("ОШИБКА Авторизации (Рукопожатия) Причина: НЕТ статуса 200.");
                    displayMessage(_("Failed Sent to LG Smart TV"), _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'error');
                }
            }
        }).post();
    }

    function GetAUIDvideoplayer() {
        Request({ // Get AUID videoplayer "Player Send to LG"
            url: "http://" + DeviceIP + ":8080/udap/api/apptoapp/data/" +
                encodeURIComponent("Player Send to LG"),
            headers: {
                "User-Agent": "UDAP/2.0",
                "Connection": "Close",
                "Cache-Control": "no-cache"
            },
            contentType: "text/html",
            onComplete: function(resp) {
                operation = "Get AUID";
                //console.log("Запрос AUID " + resp.status + " " + resp.statusText);
                //console.log(handlingServerTVresponses(resp.status, operation));
                /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                //console.log("Cодержимое ответа", resp.text);
                if (resp.status == 200) {
                    var AUID = resp.text;
                    GetStatusvideoplayer(AUID);
                } else {
                    //console.log("ОШИБКА получения AUID <-> Player Send to LG. Причина: НЕТ статуса 200.");
                    displayMessage(_("Failed Sent to LG Smart TV"), _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'error');
                }
            }
        }).get();
    }

    function GetStatusvideoplayer(AUID) {
        Request({ // Get "Player Send to LG" status (NONE (inactive), LOAD (app is loading), RUN (app is running and on focus), RUN_NF (app is running and off focus) and TERM (app is terminating))
            url: "http://" + DeviceIP + ":8080/udap/api/apptoapp/data/" +
                AUID + "/status",
            headers: {
                "User-Agent": "UDAP/2.0",
                "Connection": "Close",
                "Cache-Control": "no-cache"
            },
            contentType: "text/html",
            onComplete: function(resp) {
                operation = "Get Status";
                //console.log("Запрос статуса Player Send to LG " + resp.status + " " + resp.statusText);
                //console.log(handlingServerTVresponses(resp.status, operation));
                /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                //console.log("Cодержимое ответа", resp.text);
                if (resp.status == 200 && resp.text != "RUN") {
                    RunPlayer(AUID);
                } else if (resp.status == 200 && resp.text == "RUN") {
                    PlayPlayer(AUID, operation + " nowrun");
                } else if (resp.status != 200) {
                    //console.log("ОШИБКА получения статуса Player Send to LG. Причина: НЕТ статуса 200.");
                    displayMessage(_("Failed Sent to LG Smart TV"), _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'error');
                }
            }
        }).get();
    }

    function RunPlayer(AUID) {
        Request({ // Run "Player Send to LG"
            url: "http://" + DeviceIP + ":8080/udap/api/apptoapp/command/" +
                AUID + "/run",
            headers: {
                "User-Agent": "UDAP/2.0",
                "Connection": "Close",
                "Cache-Control": "no-cache"
            },
            contentType: "text/html",
            onComplete: function(resp) {
                operation = "Run";
                //console.log("Команда на запуск Player Send to LG " + resp.status + " " + resp.statusText);
                //console.log(handlingServerTVresponses(resp.status, operation));
                /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                //console.log("Cодержимое ответа", resp.text);
                if (resp.status == 200) {
                    GetStatusvideoplayerTimer(AUID);
                } else {
                    //console.log("ОШИБКА запуска Player Send to LG. Причина: НЕТ статуса 200.");
                    displayMessage(_("Failed Sent to LG Smart TV"), _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'error');
                }
            }
        }).post();
    }

    function GetStatusvideoplayerTimer(AUID) {
        var attempt = 1;
        var intervalID = setInterval(function() { // Get "Player Send to LG" status. Repeat 10 times at an interval of 2 sec.
            Request({ // Get "Player Send to LG" status after Run
                url: "http://" + DeviceIP +
                    ":8080/udap/api/apptoapp/data/" + AUID +
                    "/status",
                headers: {
                    "User-Agent": "UDAP/2.0",
                    "Connection": "Close",
                    "Cache-Control": "no-cache"
                },
                contentType: "text/html",
                onComplete: function(resp) {
                    operation = "Get Status";
                    //console.log("Запрос статуса Player Send to LG после запуска " + resp.status + " " + resp.statusText); console.log("Попытка " + attempt);
                    //console.log(handlingServerTVresponses(resp.status, operation));
                    /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                    //console.log("Cодержимое ответа", resp.text);
                    if (resp.status == 200 && resp.text == "RUN" ||
                        attempt++ > 10) {
                        clearInterval(intervalID);
                        PlayPlayer(AUID, operation);
                    } else if (resp.status == 200 && resp.text !=
                        "RUN") {
                        //console.log("ОШИБКА Проверка статуса Player Send to LG после запуска. Ответ телевизора НЕТ RUN. Попытка:" + attempt);
                    } else if (resp.status != 200) {
                        //console.log("ОШИБКА Проверка статуса Player Send to LG после запуска. Ответ телевизора НЕТ статуса 200. Попытка:" + attempt);
                        displayMessage(_(
                            "Failed Sent to LG Smart TV"), _(
                            handlingServerTVresponses(resp.status,
                                operation)), '', 'error');
                    }
                }
            }).get();
        }, 2000);
    }

    function PlayPlayer(AUID, pastOperation) {
        Request({ // Play
            url: "http://" + DeviceIP + ":8080/udap/api/apptoapp/command/" +
                AUID + "/send",
            headers: {
                "User-Agent": "UDAP/2.0",
                "Connection": "Close",
                "Cache-Control": "no-cache"
            },
            content: "{\"target\":\"Player Send to LG\",\"action\":\"play\",\"source\":\"" +
                fileurl + "\",\"title\":\"" + GetTitle(fileurl, title) +
                "\"}",
            contentType: "text/html",
            onComplete: function(resp) {
                operation = "Send Play";
                //(pastOperation === "Get Status nowrun") ?
                //console.log("Команда Play. Player Send to LG был запущен. " + resp.status + " " + resp.statusText):
                //console.log("Команда Play. " + resp.status + " " + resp.statusText);
                //console.log(handlingServerTVresponses(resp.status, operation));
                /*for (var headerName in resp.headers) {console.log(headerName + " : " + resp.headers[headerName]);}*/
                //console.log("Cодержимое ответа", resp.text);
                if (resp.status == 200) {
                    displayMessage(_("Success Sent to LG Smart TV"), _(
                        "LG Smart TV reported:") + _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'ok');
                } else {
                    displayMessage(_("Failed Sent to LG Smart TV"), _(
                        "LG Smart TV reported:") + _(
                        handlingServerTVresponses(resp.status,
                            operation)), '', 'error');
                }
            }
        }).post();
    }

    function GetTitle(fileurl, title) {
        if (title) {
            //console.log("TITLE", title);
            var repltitle = title.replace(/\"/g, "&quot;");
            //console.log("ReplTITLE", repltitle);
            title = repltitle;
            return title;
        }
        if (fileurl.length > 200) {
            var title = fileurl.slice(0, 95) + "....." + fileurl.slice(-95);
        } else {
            title = fileurl;
        }
        return title;
    }

}