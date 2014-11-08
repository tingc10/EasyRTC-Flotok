// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
// web socket external module
var io      = require("socket.io");
var easyrtc = require("easyrtc");           // EasyRTC external module
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/static/"));

// Start Express http server on port 8080
var webServer = http.createServer(httpApp).listen(8080);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level":1, 'destroy buffer size': Infinity});
//var socketServer = io.listen(webServer, {"log level":1});


// Start EasyRTC server
var rtc = easyrtc.listen(httpApp, socketServer);

var sequenceNum = 0;

var onEasyrtcMsg = function(connectionObj, msg, socketCallback, next){
//    console.log("Message Received from client.");
	if(msg.msgType == "getSequenceNum") {
		socketCallback({msgType:'returnSessionNum', msgData:sequenceNum}); //nice
		sequenceNum++;
        next(null);
		return;
	}
    easyrtc.events.emitDefault("easyrtcMsg", connectionObj, msg, socketCallback, next);
};

easyrtc.events.on("easyrtcMsg", onEasyrtcMsg);

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};