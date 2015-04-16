window.requestAnimFrame = (function(callback) {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
          function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
})();

var videoOffsetHeight;

function Bubble(element) {
  this.startTime = 0;
  this.x = 0;
  this.y = 0;
  this.statusIndicator = element[0].querySelector('.status-indicator');			// jquery lite element
  this.videoContainer = element[0].querySelector('.video-container');
  this.ring = element[0].querySelector('.ring');
  this.linearSpeed = 0;
  this.shouldFloat = true;
  this.animation = new TimelineMax({paused: true});
  this.pinned = false;
}
var animateBubbles = true;
var $html = $("html");

Bubble.prototype.enterRoom = function(scope) {
  // var $element = $(this.videoContainer);
  
  var randX = animateBubbles ? Math.random() * ($html.width() - videoOffsetHeight) : 0;
  var randY = animateBubbles ? Math.random() * ($html.height() - videoOffsetHeight) : 0;
 	var self = this;
 	var animateCallback = function(){
 		scope.$apply(function(){
 		 	self.initFloat(randX, randY);
 		 	
 		});
 	};
  this.expandAt(randX, randY, animateCallback, null);
  this.playAnimationQueue();

  

}

Bubble.prototype.initFloat = function(x, y){
	// TODO: Initializes position, speed and start time of bubble
	//				If x and y have inital positions, set that to the bubble property,
	//				else set x and y randomly
  var visibleWidth = $html.width()-videoOffsetHeight;
  this.x = x !== null ? x : Math.random()*visibleWidth;
  this.y = y !== null ? y : $html.height();
  //generates random linear speed from 10-20, 30 would be fastest
  this.linearSpeed = parseInt((Math.random()*10)+10);	
  this.startTime = (new Date()).getTime();
  this.animateFloat();
}

Bubble.prototype.haltFloat = function(shouldStop, x, y){
	// TODO: sets the shouldFloat variable,
	//				x and y define a specific start location
	this.shouldFloat = !shouldStop;
	if(!shouldStop){
		// need to begin floating, decide where to start the float from
		if(x != null && y != null){
			this.initFloat(x,y);
		}	else if(this.x == null && this.y == null) {
			// if no recorded x or y values, then generate new ones
			this.initFloat();
		} else {
			// resume float with values it stopped at
			this.x = $(this.statusIndicator).offset().left;
			this.y = $(this.statusIndicator).offset().top;
			this.initFloat(this.x, this.y);
		}
	}
};

Bubble.prototype.animateFloat = function(){
	// TODO: checks if the float animation has gone to the top, then resets the float
  
  if(animateBubbles && this.shouldFloat){
  	var complete = this.floatUp();
    if(complete){
      this.initFloat(null, null);
    } else {
    	var self = this;
      requestAnimFrame(function(){
        self.animateFloat();
      });
    }
  }
  
};



Bubble.prototype.floatUp = function(){
  // TODO: updates the .status-indicator position: NOT THE VIDEOCONTAINER
  // update
  var time = (new Date()).getTime() - this.startTime;
  var newY = ((this.linearSpeed)/30).toFixed(2);
  

  // check to make sure the bubble isnt off the screen yet 
  if((this.y - newY) > -1*videoOffsetHeight) {
    var amplitude = 15;
    this.y -= newY;
    var period = 3000;		// in ms
    var nextX = amplitude * Math.sin(time * 2 * Math.PI / period) + this.x;
    TweenLite.set(this.statusIndicator, {left: nextX, top: this.y});

    return false;
    
  } else {
    return true;
  }
};

Bubble.prototype.togglePin = function(pin, scope){
	// TODO: toggles pinning; if pin -> halt then pin, else if unpin, animate then float
	if(this.pinned == pin){
		// if already pinned, no need to pin and vice versa
		return;
	}	
	
	var bubble = this;
	if(pin){
		
		this.pinned = true;
		this.x = null;
		this.y = null;
		this.collapseExpandAtCenter();
		
	} else {
		var x = Math.random() * ($html.width() - videoOffsetHeight);
  	var y = Math.random() * ($html.height() - videoOffsetHeight);
		var pinCallback = function(){
			scope.$apply(function(){
				bubble.haltFloat(false, x, y);
			});
		}
		this.pinned = false;
  	this.collapseExpandAtLocation(x, y, pinCallback, null);
		
	}
};

Bubble.prototype.addToAnimationQueue = function(direction, callback){
  var easeType = Circ.easeOut,
		  expandTime = 2;

  switch(direction){
  	case 'outward':
  		this.animation
  		.fromTo(this.ring, expandTime, {
      	width:0, 
      	height:0, 
      	opacity: 0.5
      }, {
      	width:'50vmin', 
      	height:'50vmin',
      	maxWidth:'250px', 
      	maxHeight:'250px',
      	opacity: 0,
      	ease:easeType,
      	repeat: -1
      });
  		break;
  	case 'inward':
  		this.animation
  		.fromTo(this.ring, expandTime, {
      	width:'50vmin', 
      	height:'50vmin',
      	maxWidth:'250px', 
      	maxHeight:'250px',
      	opacity: 0
      }, {
      	width:0, 
      	height:0, 
      	opacity: 0.5,
      	ease:Circ.easeIn,
      	repeat: -1
      });
  		break;
  	case 'twoway':
  		this.animation
      .to(this.videoContainer,0.5,{
      	borderRadius:'1vmin', 
      	ease: easeType
      })
      .to(this.ring,0.75, {
      	borderRadius:'1vmin', 
      	width:'43vmin', 
      	height:'43vmin',
      	maxWidth: '210px',
      	maxHeight: '210px',
      	opacity: 0.2,
      	repeat: 0
      });
  		break;
  	default:
  		this.animation
      .to(this.videoContainer,0.5, {
	    	borderRadius:'50%', 
	    	ease:easeType
	    })
	    .to(this.ring,0.5,{
	    	width: 0,
	    	height: 0,
	    	borderRadius:'50%',
	    	ease: easeType,
	    	repeat: 0
	    }, '-=0.5');
  		break;
  }

};
  
  


/************* BUBBLE ANIMATION METHODS *****************/
Bubble.prototype.expandAt = function(x, y, callback, paramArray){
	// TODO: Expand bubble at defined location x and y
	// REQUIREMENT: target must be the video-container
	// we want to move the status-indicator of the video indicator
	// REQUIRE: CALLBACKS MUST HAVE SCOPE.$APPLY EMBEDED!!! 
	if(animateBubbles){
    this.animation
    .set(this.statusIndicator, {position: 'absolute',left: x, top: y})
    .to(this.videoContainer, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});
  } else {
    this.animation
    .set(this.statusIndicator, {position: 'relative',left: x, top: y})
    .to(this.videoContainer, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});
  }
  
};
Bubble.prototype.collapse = function(callback, paramArray){
	// TODO: Collapse bubble at current location
	// REQUIREMENT: this.videoContainer must be container of video element (not the status-indicator)
	// REQUIRE: CALLBACKS MUST HAVE SCOPE.$APPLY EMBEDED!!! 
	this.animation
	.set(this.statusIndicator, {position: 'absolute'})
	.to(this.videoContainer, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut, onComplete: callback, onCompleteParams: paramArray});

	
};

Bubble.prototype.collapseExpandAtCenter = function(callback, paramArray){
	// TODO: Collapse then pin to center
	// REQUIRE: CALLBACKS MUST HAVE SCOPE.$APPLY EMBEDED!!! 
	
	this.animation
	.set(this.statusIndicator,{position: 'absolute', zIndex:5})
	.to(this.videoContainer, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut})
	.set(this.statusIndicator, {position: 'relative',left: 0, top: 0, margin: '2vmin'})
	.to(this.videoContainer, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});

}

Bubble.prototype.collapseExpandAtLocation = function(x, y, callback, paramArray){
	// TODO: collapse at current location, expand in random location
	// REQUIRE: CALLBACKS MUST HAVE SCOPE.$APPLY EMBEDED!!! 
	this.animation
	.to(this.videoContainer, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut})
	.set(this.statusIndicator, {position: 'absolute',left: x, top: y, margin: 0, zIndex: 3})
	.to(this.videoContainer, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});
}

Bubble.prototype.playAnimationQueue = function(){
	// TODO: Plays the animation queue after compiling the queue
	// REQUIRE: queue is actually setup
	this.animation.play();
}

Bubble.prototype.resetAnimationQueue = function(){
	// TODO: clears all previous data
	// KNOWN ISSUES: ex) if in the middle of pin animation from status bar,
	//								if the the user makes call, animation will get stuck
	// TEMP FIX: set progress of previous to end before clearing the data,
	//						however this makes the animation jump
	this.animation.progress(1).clear().eventCallback("onComplete", null);
}
