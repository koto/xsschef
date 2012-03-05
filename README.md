XSS ChEF - Chrome Extension Exploitation Framework
======

by [Krzysztof Kotowicz](http://blog.kotowicz.net)
v.0.1

About
-----
This is a Chrome Extension Exploitation Framework - think [BeEF](http://www.bindshell.net/tools/beef.html) for Chrome extensions.
Whenever you encounter a XSS vulnerability in Chrome extension, ChEF will ease the exploitation.

What can you actually do (when having appropriate permissions)?
    
  - Monitor open tabs of victims
  - Execute JS on every tab (global XSS)
  - Extract HTML, read/write cookies (also httpOnly), localStorage
  - Stay persistent until whole browser is closed (or even futher if you can persist in extensions' localStorage)
  - Make screenshot of victims window
  - Further exploit e.g. via attaching BeEF hooks, keyloggers etc.

Installation & usage
------------
### Setup CHeF server (on attacker's machine)

ChEF comes in two different flavours: *PHP/XHR* and *node.js/websocket* version. PHP requires only a PHP and a HTTP server (Apache/nginx) for hosting attacker command & control center, but the communication with hooked browsers has certain latency as it is based on XMLHttpRequest polling.

To install PHP version just download the files somewhere within your document root.

Node.js version requires a [node.js](http://nodejs.org/) installation and is much faster as it is based on [WebSockets](http://dev.w3.org/html5/websockets/) protocol.

Installation:

    $ npm install websocket
    $ npm install node-static
    $ node server.js [chosen-tcp-port]
    
### Launch CHeF console (on attacker's machine)
  - PHP: http://127.0.0.1/console.php
  - node.js: http://127.0.0.1:8080/

### Hook Chrome extension (on victim's)
First, you have to find a XSS vulnerability in a Google Chrome addon. I won't help you here.
This is similar to looking for XSS in webpages, but totally different, as there are way more DOM based XSSes than reflected ones and the debugging is different.

Once you found a vulnarable extension, inject it with CheF hook script. See 'hook' menu item in console UI for the hook code.

### Exploit ###
Once code has been injected and run, a notification should be sent to console, so you can choose the hook by clicking on a 'choose hooked browser' icon on the left and start exploiting.
