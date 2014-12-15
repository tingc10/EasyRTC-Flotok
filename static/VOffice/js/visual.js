/******************** GLOBAL DECLARATION **********************/
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
  this.element = element;
  this.linearSpeed = 0;
}

var allBubbles = [];
var animateBubbles = true; // boolean to start and stop bubble animation
/******************* BUBBLE IMPLEMENTATION *********************/
// updates the bubble position
Bubble.prototype.floatUp = function(){
  
  // update
  var time = (new Date()).getTime() - this.startTime;
  // console.log(time);
  // pixels / 2seconds
  var newY = ((this.linearSpeed)/30).toFixed(2);
  // check to make sure the bubble isnt off the screen yet 

  if((this.y - newY) > -1*this.element.height()) {
    var amplitude = 20;
    // make sure there media is not passing through
    if(this.element.find(".fa-microphone").length == 0 &&
        this.element.find(".fa-volume-up").length == 0){
      
      this.y -= newY;
      this.element.css("top", this.y);
      
      // in ms
      var period = 3000;
      var nextX = amplitude * Math.sin(time * 2 * Math.PI / period) + this.x;
      this.element.css("left", nextX);
      this.recordFreeze = true;
    } else {
      this.x = this.element.offset().left;
      this.y = this.element.offset().top;
      this.startTime = (new Date()).getTime();
      
    }
    return false;
    
  } else {

    return true;
  }

};

// must be called for forEach where this is the bubble object
function animateBubble(self){
  var complete = self.floatUp()
  if(animateBubbles){
    if(complete){
      beginBubbleAnimation(self, null);
    } else {
      requestAnimFrame(function(){
        animateBubble(self);
      });
    }
  }
  

};

function beginBubbleAnimation(bubble, element){
  if(bubble == null){
    bubble = new Bubble(element);
    var easyrtcid = element.find("video").attr('id');
    // add bubble to associative array
    allBubbles[easyrtcid] = bubble;
    bubble.y = element.offset().top;
    bubble.x = element.offset().left;
    bubble.linearSpeed = 30;
  } else {
    // if not new bubble
    bubble.x = Math.floor(Math.random()*($("html").width()-bubble.element.width()));
    bubble.y = $("body").height();
    //generates random linear speed from 5-10
    bubble.linearSpeed = parseInt((Math.random()*5)+5);
  }
  bubble.startTime = (new Date()).getTime();
  
  
  animateBubble(bubble);
}

/********************** ANIMATION HELPERS ************************/
function animateEnterRoom() {
  if(!userEnterAnimating){
    userEnterAnimating = true;
  } else {
    // console.log(usersEntering.length);
    return;
  }
  // pop one element off dom array
  var domElement = usersEntering.shift();
  // get offset for center of screen of browser
  var offset = centerOffset([$("html").width(),$("html").height()], [200,200], true, true);
  

  animateExpandBubble(domElement, offset, function(){
    beginBubbleAnimation(null, $(domElement));
    userEnterAnimating = false;

    if(usersEntering.length > 0) {
      window.setTimeout(animateEnterRoom,3000);
    }
  });
  

}


// offset is the location the domElement will appear
function animateExpandBubble(domElement, offset, callback){
  $(domElement).css({
    "left"  : offset[0],
    "top" : offset[1] 
  });
  $(domElement).animate({
    "margin" : "0",
    "width" : "200px",
    "height" : "200px"
  }, 1000, callback);
};

function animateCollapseBubble(domElement, callback){
  $(domElement).animate({
    "margin" : "100px",
    "width" : "0",
    "height" : "0"
  }, 1000, callback);
}

/************************** EVENT LISTENERS *******************************/
$("#tool-container").on("mouseover", function(){
  $("#tool-container .border:first-child ~ .border").css({
    "opacity" : "1",
    "margin-top" : "10px"
  });
});

$("#tool-container").on("mouseleave", function(){
  $("#tool-container .border:first-child ~ .border").css({
    "opacity" : "0",
    "margin-top" : "-46px"
  });
});