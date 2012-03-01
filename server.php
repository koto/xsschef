<?php
/*
server passing messages
ch - channel (req)


*/
header('Access-Control-Allow-Origin: *');
ini_set('session.use_cookies', false);
ini_set('display_errors', true);
session_id('dummy'); // use PHP sessions for persistent storage
session_start();


if ($_SERVER['REQUEST_METHOD'] == 'POST' && !empty($_GET['ch'])) {
    // push to channel
    if (empty($_SESSION[$_GET['ch']])) {
        $_SESSION[$_GET['ch']] = array();
    }
    $p = file_get_contents('php://input');
    $_SESSION[$_GET['ch']][] = json_decode($p);
    
    echo json_encode(count($_SESSION[$_GET['ch']]));
} else if (!empty($_GET['ch'])) {

    if (!empty($_GET['delete'])) { // fix memory errors
        $_SESSION = array();
        die();
    }
    
    // pull from channel
    if (empty($_SESSION[$_GET['ch']])) {
        echo json_encode(array());
    } else {
        echo json_encode($_SESSION[$_GET['ch']]);
        unset($_SESSION[$_GET['ch']]);
    }
} else { // echo available not-empty channels
    // get channel list
    echo json_encode(array_keys($_SESSION));
}

