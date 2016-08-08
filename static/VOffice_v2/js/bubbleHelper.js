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

// stores bubble object in associative array by easyrtcid
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
    // make sure media is not passing through
    // console.log(this.element);
    if(this.shouldStopFloating()){
      this.x = this.element.offset().left;
      this.y = this.element.offset().top;
      this.startTime = (new Date()).getTime();
      
    } else {
      this.y -= newY;
      this.element.css("top", this.y);
      
      // in ms
      var period = 3000;
      var nextX = amplitude * Math.sin(time * 2 * Math.PI / period) + this.x;
      this.element.css("left", nextX);
      this.recordFreeze = true;
    }
    return false;
    
  } else {

    return true;
  }

};

// checks to see if the element has any classes that should cause the
// float to stop.
Bubble.prototype.shouldStopFloating = function(){
  return (this.element.hasClass("sending") ||
        this.element.hasClass("receiving") ||
        this.element.hasClass("connected") ||
        this.element.children(".video-container").find(".fa-volume-up").length != 0 ||
        this.element.children(".video-container").find(".fa-microphone").length != 0);
}

// must be called for forEach where this is the bubble object
function animateBubble(self){
  var complete = self.floatUp();
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
function animateEnterRoom(domElement) {
  // if(!userEnterAnimating){
  //   userEnterAnimating = true;
  // } else {
  //   // console.log(usersEntering.length);
  //   return;
  // }
  // pop one element off dom array
  // var domElement = usersEntering.shift();
  // get offset for center of screen of browser
  // var offset = centerOffset([$("html").width(),$("html").height()], [200,200], true, true);
  var curDOMWidth = 200;
  var curDOMHeight = 200;
  var randX = animateBubbles ? Math.random() * ($("html").width() - curDOMWidth) : 0;
  var randY = animateBubbles ? Math.random() * ($("html").height() - curDOMHeight) : 0;
  // console.log(randX, randY);
  $(domElement).parent(".status-indicator").css({
    left: randX,
    top: randY
  });
  animateExpandBubble(domElement, function(){
    
    beginBubbleAnimation(null, $(domElement).parent(".status-indicator"));
    // userEnterAnimating = false;

    // if(usersEntering.length > 0) {
    //   window.setTimeout(animateEnterRoom,3000);
    // }
  });
  

}

function updateStatusAnimation(domElement, type) {
  $(domElement).removeClass("receiving sending connected");
  
  var animation;
  switch(type){
    case 'receive-call':
      $(domElement).addClass("receiving");
      animation = "receive-call 1.5s ease-out infinite";
      break;
    case 'send-call':
      $(domElement).addClass("sending");
      animation = "send-call 1.5s ease-out infinite";
      break;
    case 'est-2way':
      $(domElement).addClass("connected");
      animation = "connected 1.5s ease 1 normal forwards";
      break;
    case 'stop':
      $(domElement).css({
        "-webkit-animation" : "none"
      });
      break;
    default:
      console.log("no status update");
      break;
  }
  console.log(animation);
  $(domElement).css({
    "-webkit-animation" : animation
  });

}

// function stopStatusAnimation(domElement) {
//   $(domElement).removeClass("receiving sending connected");
//   $(domElement).css({
//     "-webkit-animation" : "none"
//   });
// }

// offset is the location the domElement will appear
function animateExpandBubble(domElement, callback){
  console.log('expanding bubble');

  
  if(callback){
    $(domElement).on('webkitTransitionEnd', function(event) { 
      callback();
      $(this).off('webkitTransitionEnd');
    });
  }
  
  $(domElement).css({
    "margin" : "0",
    "width" : "200px",
    "height" : "200px"
  });
  
};

function animateCollapseBubble(domElement, callback){
  // stop() used to speed up animation delay
  if(callback){
    $(domElement).on('webkitTransitionEnd', function(event) { 
      callback();
      $(this).off('webkitTransitionEnd');
    });
  }
  
  $(domElement).css({
    "margin" : "100px",
    "width" : "0",
    "height" : "0"
  });

  
}

function toggleVideoSize(easyrtcid, turnOn){
  var userDiv = "#" + easyrtcid;
  var videoContainer = $(userDiv).parent();
  var statusIndicator = $(userDiv).parents("status-indicator");
  toggleVideoStream(easyrtcid, turnOn);
  if(turnOn){
    
    videoContainer.css({
      "width": "600px",
      "height": "600px",
      "border-radius": "10px"
    });
    $(videoContainer).children("video").css("z-index", 5);

    statusIndicator.css("border-radius", "10px");
  } else {
    videoContainer.css({
      "width": "200px",
      "height": "200px",
      "border-radius": "50%"

    });
    $(videoContainer).children("video").css("z-index", 0);
    statusIndicator.css("border-radius", "50%");

  }
}

function scrollOnHover(event){
  var heightPage = $("html").height();
  var maxScroll = $("#dock-container")[0].scrollHeight - $("#dock-container").outerHeight();
  var halfPage = heightPage/2;
  // find the location in terms of percent relative to half the pagen
  var moduloY = event.pageY % halfPage;
  var maxSpeed = 30;
  var speed = (event.pageY < halfPage) ? maxSpeed*(halfPage-moduloY)/halfPage : maxSpeed*(moduloY)/halfPage;
  // if cursor is in top half of page, then scroll up
  var scrollTo;
  if(event.pageY < halfPage){
    scrollTo = $("#dock-container").scrollTop() - speed;
    
    $("#dock-container").stop();
    if(scrollTo > 0) {
      $("#dock-container").animate({
        scrollTop:scrollTo
      }, 50);
    } else {
      $("#dock-container").animate({
        scrollTop:0
      }, 50);
    }
  } else {
    scrollTo = $("#dock-container").scrollTop() + speed;
    if(scrollTo < maxScroll) {
      $("#dock-container").animate({
        scrollTop:scrollTo
      }, 50);
    } else {
      $("#dock-container").animate({
        scrollTop:maxScroll
      }, 50);
    }
  }
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

var scrollInterval;
// scrolls the container at different speeds depending on position of mouse
// scrolls faster closer to the edge of the page
$("#dock-container").mouseover(function(event){
  $(this).mousemove(function(event){
    clearInterval(scrollInterval);
    scrollInterval = setInterval(function(){
      scrollOnHover(event);
    }, 100);
  });
  
  
  
}).mouseleave(function(event){
  console.log("stop interval");
  clearInterval(scrollInterval); 
});


