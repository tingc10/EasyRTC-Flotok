window.requestAnimFrame = (function(callback) {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
          function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
})();

function Bubble(element) {
  this.startTime = 0;
  this.x = 0;
  this.y = 0;
  this.saveX = 0;
  this.recordFreeze = true;
  this.element = element;			// DOM element (.video-container)
  this.linearSpeed = 0;
  this.shouldFloat = true;
  this.snapshots = [];
  this.animation = new TimelineMax();

}
var animateBubbles = true;


Bubble.prototype.enterRoom = function() {
  var $element = $(this.element);
  var randX = animateBubbles ? Math.random() * ($html.width() - this.element.offsetWidth) : 0;
  var randY = animateBubbles ? Math.random() * ($html.height() - $element.height()) : 0;
 	var self = this;
  expandAt(this.element, randX, randY, function(){
  	self.initFloat(randX, randY);
  }, null);

  

}

Bubble.prototype.initFloat = function(x, y){
	// TODO: Initializes position, speed and start time of bubble
	//				If x and y have inital positions, set that to the bubble property,
	//				else set x and y randomly
  var visibleWidth = $html.width()-this.element.offsetWidth;
  this.x = x !== null ? x : Math.random()*visibleWidth;
  this.y = y !== null ? y : $html.height();
  //generates random linear speed from 20-30
  this.linearSpeed = parseInt((Math.random()*10)+20);	
  this.startTime = (new Date()).getTime();
  this.animateBubble();
}

Bubble.prototype.animateBubble = function(){
	// TODO: checks if the float animation has gone to the top, then resets the float
  
  if(animateBubbles && this.shouldFloat){
  	var complete = this.floatUp();
    if(complete){
      this.initFloat(null, null);
    } else {
    	var self = this;
      requestAnimFrame(function(){
        self.animateBubble();
      });
    }
  }
  
};



Bubble.prototype.floatUp = function(){
  // TODO: updates the .status-indicator position: NOT THE VIDEOCONTAINER
  // update
  var time = (new Date()).getTime() - this.startTime;
  var newY = ((this.linearSpeed)/30).toFixed(2);
  var $statusIndicator = $(this.element.parentNode);

  // check to make sure the bubble isnt off the screen yet 
  if((this.y - newY) > -1*$statusIndicator.height()) {
    var amplitude = 20;

    this.y -= newY;
    
    
    // in ms
    var period = 3000;
    var nextX = amplitude * Math.sin(time * 2 * Math.PI / period) + this.x;
    $statusIndicator.css({
    	"left": nextX,
    	top: this.y
    });

    return false;
    
  } else {

    return true;
  }

};

Bubble.prototype.updateSnapshot = function(dataURL) {

  this.snapshots.push(dataURL);
  
}

Bubble.prototype.animateRadial = function(direction, callback){
  var user = this;
  
  var easeType;
  var $statusIndicator = $(user.element.parentNode);
  var $ringCollection = $statusIndicator.find('.ring');
  var determineAnimation = function(){
  	var expandTime;
  	
  	var $ring1 = $statusIndicator.find('.ring.1'),
	  		$ring2 = $statusIndicator.find('.ring.2'),
	  		$ring3 = $statusIndicator.find('.ring.3');
	  		
    user.animation
    .invalidate()
    .restart()
    .clear();
	  switch(direction){
	    case 'outward':
	    easeType = Circ.easeIn;
	    expandTime = 1;
	      user.animation
	      .fromTo($ring3, expandTime, {
	      	width:0, 
	      	height:0, 
	      	ease:Circ.easeIn
	      }, {
	      	width:'45vmin', 
	      	height:'45vmin',
	      	maxWidth:'225px', 
	      	maxHeight:'225px',
	      	ease:easeType
	      })
	      .fromTo($ring2, expandTime, {
	      	width:0, 
	      	height:0, 
	      	ease:Circ.easeIn
	      }, {
	      	width:'50vmin', 
	      	height:'50vmin',
	      	maxWidth:'250px', 
	      	maxHeight:'250px', 
	      	ease:easeType
	      }, "-=0.75")
	      .fromTo($ring1, expandTime, {
	      	width:0, 
	      	height:0, 
	      	ease:Circ.easeIn
	      }, {
	      	width:'55vmin', 
	      	height:'55vmin',
	      	maxWidth:'275px', 
	      	maxHeight:'275px', 
	      	ease:easeType
	      }, "-=0.75")
	      .staggerTo($ringCollection, 1, {
	      	opacity: 0
	      }, 0.25)
	      .repeat(-1);
	      break;
	    case 'inward':
	    	easeType = Circ.easeIn;
	    	expandTime = 0.25;
	      user.animation
	      .fromTo($ring1, expandTime, {
	      	width:'55vmin', 
	      	height:'55vmin',
	      	maxWidth:'275px', 
	      	maxHeight:'275px', 
	      	opacity: 0
	      }, {
	      	opacity: 0.3,
	      	ease:easeType
	      })
	      .fromTo($ring2, expandTime, {
	      	width:'50vmin', 
	      	height:'50vmin',
	      	maxWidth:'250px', 
	      	maxHeight:'250px', 
	      	opacity: 0
	      }, {
	      	opacity: 0.3,
	      	ease:easeType
	      })
	      .fromTo($ring3, expandTime, {
	      	width:'45vmin', 
	      	height:'45vmin', 
	      	maxWidth:'225px', 
	      	maxHeight:'225px',
	      	opacity: 0
	      }, {
	      	opacity: 0.3,
	      	ease:easeType
	      })
	      .staggerTo($ringCollection, 1, {
	      	width:0, 
	      	height:0, 
	      	ease:Circ.easeIn
	      }, 0.25)
	      .repeat(-1);
	      break;
	    case 'twoway':
	      // two way call established
	      easeType = Circ.easeIn;
	      user.animation
	      .to(user.element,0.5,{
	      	borderRadius:'2vmin', 
	      	ease: easeType
	      })
	      .to($ringCollection,0.75, {
	      	borderRadius:'2vmin', 
	      	width:'43vmin', 
	      	height:'43vmin',
	      	maxWidth: '210px',
	      	maxHeight: '210px',
	      	opacity: 0.2
	      })
	      .repeat(0);
	      break;
	    default:
	      // return to original state (no call)
	      easeType = Circ.easeIn;
	      user.animation
	      .to(user.element,0.5, {
		    	borderRadius:'50%', 
		    	ease:easeType
		    })
		    .to($ringCollection,0.5,{
		    	width: 0,
		    	height: 0,
		    	borderRadius:'50%',
		    	ease: easeType,
		    	onComplete: callback != null && callback != undefined ? callback : null
		    }, '-=0.5')
		    .repeat(0);
	      break;
	  }
    user.animation.play();
	};
	  
	  
	  
  if(direction != 'twoway'){
    // return to original settings
    user.animation
    .to(user.element,0.5, {
    	borderRadius:'50%', 
    	ease:easeType
    })
    .to($ringCollection,0.5,{
    	borderRadius:'50%',
    	ease: easeType,
    	opacity: 0.2,
    	onComplete:function(){
      	determineAnimation();
      }
    }, '-=0.5')
    .repeat(0);
    
  } else {
    determineAnimation();
  }
};
  
  


/************* BUBBLE ANIMATION METHODS *****************/
function expandAt(target, x, y, callback, paramArray){
	// TODO: Expand bubble at defined location x and y
	// REQUIREMENT: target must be the video-container
	// we want to move the status-indicator of the video indicator
	TweenMax.set(target.parentNode, {position: 'absolute',left: x, top: y});
	TweenMax.to(target, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});
	
};
function collapse(target, callback, paramArray){
	// TODO: Collapse bubble at current location
	// REQUIREMENT: target must be container of video element (not the status-indicator)
	TweenMax.set(target.parentNode, {position: 'absolute'});
	TweenMax.to(target, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut, onComplete: callback, onCompleteParams: paramArray});

	
};

function collapseExpandAtCenter(target, callback, paramArray){
	// TODO: Collapse then pin to center
	var t1 = new TimelineLite();
	t1.set(target.parentNode,{position: 'absolute'})
	.to(target, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut})
	.set(target.parentNode, {position: 'relative',left: 0, top: 0, margin: '2vmin'})
	.to(target, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});

}

function collapseExpandAtLocation(target, x, y, callback, paramArray){
	// TODO: collapse at current location, expand in random location
	var t1 = new TimelineLite();
	
	t1.to(target, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut})
	.set(target.parentNode, {position: 'absolute',left: x, top: y, margin: 0})
	.to(target, 1, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut,onComplete: callback, onCompleteParams: paramArray});
}

