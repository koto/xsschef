#!/usr/bin/env php
<?php
/*
downloads & unpacks addons listed in standard input JSON feed
Usage: 

 php download.php < addons.json
 php download.php <addon-guid> <addon-name>

Req: openssl extension, unzip command line

@author Krzysztof Kotowicz kkotowicz<at>gmail<dot>com
@see http://blog.kotowicz.net

 */

$output_dir = 'addons';
$skip_existing = true;

// command line support
if (count($argv) == 3) {
    $addons = array($argv[1] => $argv[2]);
    $skip_existing = false;
} else {
    $f = file_get_contents('php://stdin');
    $addons = json_decode($f);
}



while (list($k, $v) = each($addons)) {
    download($k, $v);
}

function download($id, $name) {
    global $output_dir, $skip_existing;
    $safename = preg_replace('/[^a-zA-Z0-9_-]/', '', $name);
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
	$dir = $output_dir . DIRECTORY_SEPARATOR . $safename . '-' . $id;
	if (is_dir($dir) && $skip_existing) {
	    echo "Skipping $name\n";
	    return;
	}

    echo "Downloading $name...\n";
    $crx = file_get_contents('https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D'.$id.'%26lang%3Dpl%26uc');
    if ($crx) {
	$dir = $output_dir . DIRECTORY_SEPARATOR . $safename . '-' . $id;
	if (!is_dir($dir)) {
	    mkdir($dir, 0700, true);
	}
	
	file_put_contents($dir . DIRECTORY_SEPARATOR . $id. '.crx', $crx);
	echo "Saving " . strlen($crx) . " bytes to $dir\n";
	echo "Unpacking...";
	shell_exec("unzip -o $dir/$id.crx -d $dir");
    }
}
