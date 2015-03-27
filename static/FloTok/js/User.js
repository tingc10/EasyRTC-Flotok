// SUMMARY: Definition for User Class
// DEPENDENCY: 

function User(easyrtcid) {
	this.id = easyrtcid;
	// this.status = easyrtc.getConnectStatus(easyrtcid);
	this.callStatus = callStatus.NONE;
	this.displayName = easyrtc.idToName(easyrtcid);
	// this.bubble = null;			
	// this.fauxBubble = null;		
	this.busy = false;			// mutes all incoming calls except for the outgoing ones
	this.stillInRoom = true;	// used to determine if user left the room
	// this.pendingCall = false;		// used to differentiate between drag and call event
	// this.selected = false;				// flag to determine if user selected for room
	// this.snapshots = [];
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
};

User.prototype.toggleTransmition = function(turnOn, scope){
	// TODO: determines if the call is to be turned on or off,
	//				forms connection if none exists
	this.updateConnectionStatus();
	if(turnOn){
		// check if they are
		if(this.callStatus == callStatus.NONE || this.callStatus == callStatus.CALLFROM){
			// Toggle voice transmition from OFF -> ON
			// call user if they are not connected then set their stream
			if(this.status == easyrtc.NOT_CONNECTED){
				var peer = this;
				var networkCallback = function(accepted, bywho){
					scope.$apply(function(){
						console.log((accepted?"accepted":"rejected")+ " by " + bywho);
						peer.toggleVoiceSocket(true);
						peer.evalCallState(scope);

					});
				};
				this.formConnection(networkCallback);
			} else {
				// enable audio stream, no need for call since user is already connected
				this.toggleVoiceSocket(true);
				this.evalCallState(scope);

			}

		} else {
			console.log(this.displayName + " is already called");
			return;
		}
	} else {
		if(this.callStatus == callStatus.TWOWAY || this.callStatus == callStatus.CALLTO){
			if(this.callStatus == callStatus.CALLTO){
				// no two-way, so turning off should just end connection
				this.endConnection();
				// no need for evalCallstate here, allow stream closed to call it
			} else {
				this.toggleVoiceSocket(false);
				this.evalCallState(scope);

			}
		} else {
			console.log("not transmitting to " + this.displayName + " already");
			
			return;
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
}

User.prototype.haltFloat = function(shouldStop, x, y){
	// TODO: sets the shouldFloat variable,
	//				x and y define a specific start location
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

User.prototype.evalCallState = function(scope){
	// TODO: function called when call status changes,
	//				returns the animation to play 
	var animation
	switch(this.callStatus){
		case callStatus.NONE:
			// return element to bubble shape
			animation = "none";
			
			break;
		case callStatus.CALLTO:
			// radial rings outwards
			animation = "outward";

			break;
		case callStatus.CALLFROM:
			// radial rings inwards to convey receive
			animation = "inward";

			break;
		case callStatus.TWOWAY:
			// squared shape for connected
			animation = "twoway";

			break;
	}
	scope.$broadcast(this.id+"newCallState", animation);
};






