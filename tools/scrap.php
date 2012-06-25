#!/usr/bin/env php
<?php
/*
 gets the list of most popular US extensions in chrome web store in json format
 usage: php scrap.php > addons.json

@author Krzysztof Kotowicz kkotowicz<at>gmail<dot>com
@see http://blog.kotowicz.net

*/
$url = 'https://chrome.google.com/webstore/ajax/item?hl=en&gl=US&pv=1328752380&token={{OFFSET}}%2C1358b325420&count=200&marquee=true&category=popular&sortBy=0&rt=j';

$how_many = 1000;
$per_page = 200;
$ext = array();

for ($i = 0; $i < $how_many; $i += $per_page) {
    $new_url = str_replace('{{OFFSET}}', $i, $url);
    $ch = curl_init($new_url);
     
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, '');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
     
    $response = curl_exec($ch);
    curl_close($ch);
    
    process($response, $ext);
    fwrite(STDERR,'.');
}

function process($xt, &$ext) {
$matches = array();
preg_match_all('#"([a-z]{32})","(.*?)"#', $xt, $matches, PREG_SET_ORDER);

foreach ($matches as $match) {
    $ext[$match[1]] = $match[2];
}
}

echo json_encode($ext);