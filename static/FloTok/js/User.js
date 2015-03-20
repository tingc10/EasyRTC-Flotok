// SUMMARY: Definition for User Class
// DEPENDENCY: 
var callStatus = {
	NONE: 0,
	CALLTO: 1,
	CALLFROM: 2,
	TWOWAY: 3
};
function User(easyrtcid) {
	this.id = easyrtcid;
	this.status = easyrtc.getConnectStatus(easyrtcid);
	this.callStatus = callStatus.NONE;
	this.displayName = easyrtc.idToName(easyrtcid);
	this.bubble = null;			
	// this.fauxBubble = null;		
	this.busy = false;			// mutes all incoming calls except for the outgoing ones
	this.stillInRoom = true;	// used to determine if user left the room
	this.pendingCall = false;		// used to differentiate between drag and call event
	this.selected = false;				// flag to determine if user selected for room
}



User.prototype.updateConnectionStatus = function(){
	// TODO: updates the connection status of user
	this.status = easyrtc.getConnectStatus(this.id);
};

User.prototype.removeFromDOM = function(){
	// TODO: remove fauxbubble and bubbble from DOM
	var $bubbleAndStatus = $(this.bubble.element.parentNode);
	try{
		collapse(this.bubble.element, function(){
			setTimeout(function(){
				$bubbleAndStatus.remove();
				$bubbleAndStatus = null;
			});		
		}, null);
	} catch(err){
		console.log(err);
	}
};



User.prototype.formConnection = function(callback){
	// TODO: initiates connection to User and turns on voice on peer's end
	var peer = this;
	console.log("performing call to " + peer.displayName);
	easyrtc.call(peer.id,
	// successCallback
	function(easyrtcid) {
		// console.log("completed call to " + easyrtcid);
	},
	// errorCallback
	function(errorMessage) {
		// console.log("err:" + errorMessage);
	},callback);  // accepted callback
	
};

User.prototype.endConnection = function(){
	// TODO: end the connection if there's no transmition on either end
	this.callStatus = callStatus.NONE;
	easyrtc.hangup(this.id);
};

User.prototype.toggleVoiceSocket = function(turnOn){
	// TODO: requests your audio stream to go through to this user
	//				determines the call status
	if(turnOn){
		if(this.callStatus == callStatus.NONE){
			this.callStatus = callStatus.CALLTO;
		} else if(this.callStatus == callStatus.CALLFROM){
			this.callStatus = callStatus.TWOWAY;
		} else {
			console.log("call status not set as expected");
		}
		easyrtc.sendData(this.id, "activateVoice",  easyrtc.myEasyrtcid);
	} else {
		if(this.callStatus == callStatus.TWOWAY){
			this.callStatus = callStatus.CALLFROM;
		} else if(this.callStatus == callStatus.CALLTO){
			this.callStatus = callStatus.NONE;
		} else {
			console.log("call status not set as expected");
		}
		easyrtc.sendData(this.id, "stopVoice",  easyrtc.myEasyrtcid);
	}
	this.evalCallState();
};

User.prototype.toggleTransmition = function(){
	// TODO: determines if the call is to be turned on or off,
	//				forms connection if none exists
	this.updateConnectionStatus();
	if(this.callStatus == callStatus.NONE || this.callStatus == callStatus.CALLFROM){
		// Toggle voice transmition from OFF -> ON
		// call user if they are not connected then set their stream
		if(this.status == easyrtc.NOT_CONNECTED){
			var peer = this;
			this.formConnection(function(accepted, bywho){
				console.log((accepted?"accepted":"rejected")+ " by " + bywho);
				peer.toggleVoiceSocket(true);
			});
		} else {
			// enable audio stream, no need for call since user is already connected
			this.toggleVoiceSocket(true);

		}
	} else {
		// Toggle voice transmition from ON -> OFF
		if(this.callStatus == callStatus.TWOWAY){
			this.toggleVoiceSocket(false);
		} else {
			// voice is going out, so turning off should just end connection
			this.endConnection();

		}
	}
};

User.prototype.toggleAudioStream = function(turnOn) {
  // TODO: turnOn or off the audio stream for the user
  //				method called by socket instruction (rather than mouse event)
  var userStream = easyrtc.getRemoteStream(this.id);
  var audioStream = userStream.getAudioTracks()[0];
  
  if(turnOn){
  	if(this.callStatus == callStatus.CALLTO){
  		this.callStatus = callStatus.TWOWAY;
  	} else if(this.callStatus == callStatus.NONE){
  		this.callStatus = callStatus.CALLFROM;
  	}
    audioStream.enabled = !audioStream.enabled;
  } else {
  	if(this.callStatus == callStatus.TWOWAY){
  		this.callStatus = callStatus.CALLTO;
  	} else if(this.callStatus == callStatus.CALLFROM){
  		this.callStatus = callStatus.NONE;
  	}
    audioStream.enabled = turnOn;
  }
  this.shouldToggleVideo();
  this.evalCallState();
}

User.prototype.haltFloat = function(shouldStop, x, y){
	// TODO: sets the shouldFloat variable
	this.bubble.shouldFloat = !shouldStop;
	if(!shouldStop){
		if(x != null && y != null){
			this.bubble.initFloat(x,y);
		}	else if(this.bubble.x == null && this.bubble.y == null) {
			this.bubble.initFloat();
		} else {
			// resume float with values it stopped at
			var $statusIndicator = $(this.bubble.element.parentNode);
			this.bubble.x = $statusIndicator.offset().left;
			this.bubble.y = $statusIndicator.offset().top;
			this.bubble.initFloat(this.bubble.x, this.bubble.y);
		}
	}

};

User.prototype.toggleVideoStream = function(turnOn){
	// TODO: turn on or off the video stream for the user
	var userStream = easyrtc.getRemoteStream(this.id);
  var videoStream = userStream.getVideoTracks()[0];
  videoStream.enabled = turnOn;
  
};

User.prototype.shouldToggleVideo = function(){
	// TODO: determines if video should be turned on or off based on callstate
	if(this.callStatus == callStatus.TWOWAY || this.callStatus == callStatus.CALLFROM){
		// turn on whenever you have a call from someone
		this.toggleVideoStream(true);
	} else {
		// turn off otherwise
		this.toggleVideoStream(false);
	}
};

User.prototype.evalCallState = function(callback){
	// TODO: determine animations and style changes associated with call state
	if(this.callStatus != callStatus.NONE){
		// as long as there is any form of transmission, button should be pinned
		this.togglePinBubble(true);
	}
	switch(this.callStatus){
		case callStatus.NONE:
			// return element to bubble shape
			var user = this,
			unPin = function(){
				user.togglePinBubble(false);
			};
			this.bubble.animateRadial('none', unPin);
			
			
			break;
		case callStatus.CALLTO:
			// radial rings outwards
			this.bubble.animateRadial('outward');
			break;
		case callStatus.CALLFROM:
			// radial rings inwards to convey receive
			this.bubble.animateRadial('inward');
			break;
		case callStatus.TWOWAY:
			// squared shape for connected
			this.bubble.animateRadial('twoway');
			break;
	}
};



// User.prototype.animateCallState = function(){
// 	// TODO: determine animations and style changes associated with call state
// 	if(this.callStatus != callStatus.NONE){
// 		// as long as there is any form of transmission, button should be pinned
// 		this.togglePinBubble(true);
// 	}
// 	switch(this.callStatus){
// 		case callStatus.NONE:
// 			// return element to bubble shape
// 			this.togglePinBubble(false);
// 			break;
// 		case callStatus.CALLTO:
// 			// radial rings outwards
// 			break;
// 		case callStatus.CALLFROM:
// 			// radial rings inwards to convey receive
// 			break;
// 		case callStatus.TWOWAY:
// 			// squared shape for connected
// 			break;
// 	}
// }

User.prototype.togglePinBubble = function(pin){
	// TODO: toggles pinning; if pin -> halt then pin, else if unpin, animate then float
	var statusIndicatorPosition = $(this.bubble.element.parentNode).css('position');
	var peer = this;
	// var floatOnStatus = function(){
	// 	// TODO: determines if the bubble should float based on the status
	// 	if(peer.callStatus == callStatus.NONE){
	// 		peer.haltFloat(false);
	// 	} else {
	// 		peer.haltFloat(true);
	// 	}
	// };
	
	if(pin){
		
		peer.haltFloat(true);
		if(statusIndicatorPosition == 'absolute'){
			// by setting x and y to null, haltFloat will set new values
			this.bubble.x = null;
			this.bubble.y = null;
			collapseExpandAtCenter(this.bubble.element, null, null);
		} else {
			// already pinned
			TweenMax.set(this.bubble.element.parentNode, {left:0, top:0});
			console.log('already pinned');
		}
	} else {
		if(statusIndicatorPosition == 'relative'){
			var x = Math.random() * ($html.width() - this.bubble.element.offsetWidth);
  		var y = Math.random() * ($html.height() - this.bubble.element.offsetHeight);
			collapseExpandAtLocation(this.bubble.element, x, y, function(){
				peer.haltFloat(false, x, y);
			}, null);
		} else {
			// if already unpinned
			peer.haltFloat(false);
		}
	}
};


