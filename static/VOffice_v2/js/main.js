/*********** GLOBAL ****************/
//var callAllUsers = true;


// var usersEntering = []; // queue of users entering the room, gets popped off as user animates
var sequenceCompare = []; // array storing particular sequence number of occupant with id
var userEnterAnimating = false;
var userStatuses = {};

// var userEnterEvent = document.createEvent("Event");
// userEnterEvent.initEvent("userEnterEvent", true, true);
// userEnterEvent.animating = false;
// document.addEventListener("userEnterEvent", animateEnterRoom,false);
/*********** Objects *************/

// var tmpAudiocheck;
/*********** Functions for Making Calls ****************/
// function that is called after the user inputs their display name
// initializes local media stream then sets connection with server
function initCall() {
  easyrtc.setRoomOccupantListener(roomListener);
  var connectSuccess = function(myId) {
    console.log("My easyrtcid is " + myId);

    setInterval(function(){
      takeSnapshot(true, null);
    }, 5000);
  };
  var connectFailure = function(errMsg){
    console.log("Connection Error: " + errMsg);
  };
  // initMediaSource called when user allows camera accessibility
  easyrtc.initMediaSource(function(){
    // success callback
    var selfVideo = document.getElementById('self');
    easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
    $("#self").on('loadedmetadata',function(){
      console.log("local loaded");
      // show video
      $("#self").parent().animate({
        "margin" : "0",
        "width" : "200px",
        "height" : "200px"
      }, 1000, function(){
        // give ample time to take a good snapshot before connecting with others
        // one time delay
        setTimeout(function(){
          takeSnapshot(false, null);
          easyrtc.connect("VirtualOffice", connectSuccess, connectFailure);

        },1000);
      });
      // display white board
      // centerInElement($("body"),$("#whiteboard"),true,true);
      // $("#whiteboard").css("display", "block");
    });
  });
}

// callback for whenever there is a new occupant
function roomListener(roomName, otherPeers) {
    // requests sequence number from server, stores the sequence number
	// when connecting to easyrtcid user. each client sends their sequence numbers
	// to each other and decides whose is smaller. The larger number does nothing
	// while the one with the smaller number performs the call
	sequenceCompare = [];
	for(var easyrtcid in otherPeers) {
		console.log(easyrtcid + " entered the room with connection " +
				   easyrtc.getConnectStatus(easyrtcid));

		if(easyrtc.getConnectStatus(easyrtcid) == easyrtc.NOT_CONNECTED){
			getSequenceNum(easyrtcid);
		}

	}

}

// requests for sequence number and handles next action
function getSequenceNum(easyrtcid) {
	easyrtc.sendServerMessage('getSequenceNum', null,
		function(msgType, msgData ){
			if(msgData == null){
				getSequenceNum(easyrtcid);
				return;
			}
			// msgData is the sequence number
			console.log("sequence number received with " + msgData +
					   " when evaluating " + easyrtcid);
			sequenceCompare[easyrtcid] = parseInt(msgData);
			// send your sequence number to compare
			easyrtc.sendData(easyrtcid, "decideCaller", msgData);
		},
		function(errorCode, errorText){
		   console.log("error was " + errorText);
		}
	);
}

// gets new Element ID from server to assign order
function getElementID() {
  easyrtc.sendServerMessage('getElementID', null,
    function(msgType, msgData ){
      console.log("message return success");
      if(msgData == null){
        getElementID();
        return;
      }
      currentObject.id = msgData;

      var data = {
        element   : elementToJSON(currentObject),
        elementID : msgData,
        canvasID  : "whiteboard"
      }
      broadcastObject(data, "drawElement");
    },
    function(errorCode, errorText){
       console.log("error was " + errorText);
    }
  );
}


function performCall(easyrtcid) {
	
	if(easyrtc.getConnectStatus(easyrtcid) == easyrtc.NOT_CONNECTED){
		console.log("performing call to " + 
				easyrtc.idToName(easyrtcid));
		easyrtc.call(
		 easyrtcid,
		 // successCallback
		 function(easyrtcid) {
		  console.log("completed call to " + easyrtcid);
		 },
		 // errorCallback
		 function(errorMessage) {
		  console.log("err:" + errorMessage);
		 },
		 // accepted callback
		 function(accepted, bywho) {
			console.log((accepted?"accepted":"rejected")+ " by " + bywho);
		 }
	  );
	} else {
		console.log("make sure " + easyrtc.idToName(easyrtcid) + " makes the call");
	}
}

/************* Call Request & Call End *******************/
// the function that is called when someone calls you
easyrtc.setStreamAcceptor( function(callerEasyrtcid, stream) {
	
  console.log("setting up bubble for " + easyrtc.idToName(callerEasyrtcid));
	
  // var oscillationWrapper = document.createElement('div');
  var statusIndicator = document.createElement('div');
  var videoContainer = document.createElement('div');
  var displayName = document.createElement('div');
  var volIndicator = document.createElement('i');
  var micIndicator = document.createElement('i');
  var video = document.createElement('video');

  // assigning class names
  // oscillationWrapper.className = "oscillate-wrapper";
  statusIndicator.className = "remote-user status-indicator";
  videoContainer.className = "video-container";
  displayName.className = "display-name";
  volIndicator.className = "fa fa-volume-off";
  micIndicator.className = "fa fa-microphone-slash";
  video.id = callerEasyrtcid;

  // appending elements in between
  // oscillationWrapper.appendChild(statusIndicator);
  statusIndicator.appendChild(videoContainer);
  displayName.innerHTML = easyrtc.idToName(callerEasyrtcid);
  videoContainer.appendChild(displayName);
  videoContainer.appendChild(volIndicator);
  videoContainer.appendChild(micIndicator);
  
  var callerContainer;
  if(animateBubbles)
    callerContainer = document.getElementById('caller-container');
  else
    callerContainer = document.getElementById('dock-container');
  videoContainer.appendChild(video);
  callerContainer.appendChild(statusIndicator);
  // usersEntering.push(videoContainer);
  // make sure to pull the current remote
  // user up front to provide continuous drag
  $(statusIndicator).draggable({
      start : function(){
          // $(".video-container").css("z-index", "1");
          $(this).css("z-index", "2");
      }
  });
	
	
	// turn off their audio stream
  var remoteAudioStream = stream.getAudioTracks()[0];
  remoteAudioStream.enabled = false;
  // turn off their video stream
  var remoteVideoStream = stream.getVideoTracks()[0];
  remoteVideoStream.enabled = false;
  
  // send snapshot to user
  takeSnapshot(false, callerEasyrtcid);

  // check if user is in do not disturb mode
  if($("#self").parent().hasClass("busy")){
      toggleDoNotDisturb(true);
  }
	easyrtc.setVideoObjectSrc(video, stream);
  
  animateEnterRoom(videoContainer);

  updateConnections("default", null);
  
//    setupDOMElement(callerEasyrtcid, stream);
//    initUser(callerEasyrtcid, stream);

});



// function that is called when a user exits the room
easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
  var id = "#" + callerEasyrtcid;
  var domElement = $(id).parent();
  var tmpElement = document.getElementById(callerEasyrtcid).parentNode.parentNode;
  console.log('person leaves ', callerEasyrtcid);
  // drop reference to Bubble object by setting object associated to bubble as null
  allBubbles[callerEasyrtcid] = null;
  updateStatusAnimation(tmpElement, 'stop');
  
  
  animateCollapseBubble($(id).parent(), function(){
    
    easyrtc.setVideoObjectSrc(document.getElementById(callerEasyrtcid), "");
    // setTimeout so animation can complete
    setTimeout(function(){
      $(tmpElement).remove();
      updateConnections("default", null);
    }, 1000);

  });
  

});



/************ SEND/RECEIVE DATA HELPERS ****************/
// function to receive messages
easyrtc.setPeerListener( function(easyrtcid, msgType, msgData, targeting){
  // JSON.stringify(msgData));

	switch(msgType){
		case "activateVoice":
		  toggleAudioStream(msgData, true);
		  break;
		case "stopVoice":
		  toggleAudioStream(msgData, false);
		  break;
		case "toggleStayOn":
		  toggleMaintainAudio(msgData);
		  break;
		case "newSnapshot":
		  updateSnapshot(easyrtcid, msgData);
		  break;
		case "decideCaller":
			console.log("my sequence number is " + 
					  sequenceCompare[easyrtcid] + 
						" and " + easyrtc.idToName(easyrtcid) +
					   " sequence number is " +
					   msgData);
			// check to see if your sequence number is smaller
			// if it is, you make the call
			if(sequenceCompare[easyrtcid] != undefined){
				if(msgData > sequenceCompare[easyrtcid]){
					performCall(easyrtcid);
				}
			} else {
        console.log("no sequence number to compare");
        getSequenceNum(easyrtcid);
      }
			break;
    case "drawElement":
      addToCanvas(msgData.element,msgData.elementID,msgData.canvasID);
      
      break;
	}
});

/************ Helper Functions ******************/
// visual webkit event listener to completely hide display when transition end
$("#username-container")[0].addEventListener(
  'webkitTransitionEnd',
  function(){
    $("#username-container").css('display', 'none');
  }, false
);



// initialize new bubble representation of user
function initUser(easyrtcid, stream){
    animateEnterRoom();

    // turn off their audio stream
    var remoteAudioStream = stream.getAudioTracks()[0];
    remoteAudioStream.enabled = false;
    // turn off their video strea
    var remoteVideoStream = stream.getVideoTracks()[0];
    remoteVideoStream.enabled = false;
    // send snapshot to user
    takeSnapshot(false, easyrtcid);

    // check if user is in do not disturb mode
    if($("#self").parent().hasClass("busy")){
        toggleDoNotDisturb(true);
    }
};

// query for client display name
function getUserName(){
  // centerInElement($("body"),$("#username-container"),true,true);
  $("#username-input").keypress(function(e){
    if(e.which == 13){
      if(!easyrtc.setUsername($(this).val())){
        alert("Please enter your display name");
        return;
      }
      $("#username-container").css('opacity','0');
      $("#self").parent().find(".display-name").html($(this).val());

      $("#tool-container").css('display', 'block');
      initCall();

    }
  });
}

// collapses all bubbles and pins them to the right hand side
// exceptUsers is an array of users NOT to pin.
// will also NOT pin own user's bubble
function pinBubbles(exceptUsers){
  animateBubbles = false;
  $("#dock-container").css('display', "block");
  updateConnections("default", function(easyrtcid, occupantIndex){
    var id = "#" + easyrtcid;
    var domElement = $(id).parent();
    console.log(exceptUsers);
    if(exceptUsers[easyrtcid] != undefined){
      return;
    }
    // console.log(domElement, "interacting with bubble element");
    animateCollapseBubble(domElement, function(){
      // var offsetLeft = $("html").width() - (180);
      var offsetLeft = 0;
      var offsetTop = 0;
      $("#tool-container").animate({'right' : '160px'});
      $("#dock-container").animate({'opacity' : '1'});
      // move domElement into dock container
      setTimeout(function(){
        domElement.appendTo("#dock-container");
        
        animateExpandBubble(domElement, [offsetLeft, offsetTop], null);

      }, 1000);
    });
  });
}

// removes all bubbles from the dock and reanimates the bubbles
function unpinBubbles(exceptUsers){
  animateBubbles = true;
  updateConnections("default", function(easyrtcid, occupantIndex){
    var id = "#" + easyrtcid;
    var domElement = $(id).parent();
    // if(exceptUsers[easyrtcid] == undefined){
    //   return;
    // }
    // console.log(domElement, "interacting with bubble element");
    animateCollapseBubble(domElement, function(){
      // var offsetLeft = $("html").width() - (180);
      var offsetLeft = Math.random()*($("html").width-200);
      var offsetTop = Math.random()*($("html").width-200);
      $("#tool-container").animate({'right' : '10px'});
      $("#dock-container").animate({'opacity' : '0'});
      $("#dock-container").css('display', "none");
      setTimeout(function(){
        domElement.appendTo("#caller-container");

        animateExpandBubble(domElement, [offsetLeft, offsetTop], null);
        animateBubble(allBubbles[easyrtcid]);

      }, 1000);
    });
  });

}

// toggles client with easyrtcid's audio stream on or off
function toggleAudioStream(easyrtcid, turnOn) {
  var userDiv = "#" + easyrtcid;
  // make sure the peer's audio stays on
  var statusIndicator = $(userDiv).parents(".status-indicator");
  var videoContainer = $(userDiv).parent();
  if(videoContainer.hasClass("stayOn")){
    return;
  }
  var muted = videoContainer.hasClass("mute");
  var userStream = easyrtc.getRemoteStream(easyrtcid);
  var audioStream = userStream.getAudioTracks()[0];
  if(!muted){
    // if the turnOn parameter is left blank, simply toggle
    if(turnOn == null || turnOn == undefined){
      audioStream.enabled = !audioStream.enabled;
    } else {
      audioStream.enabled = turnOn;
    }
  } else {
    audioStream.enabled = false;
  }
  // audioStream.enabled = turnOn;
  // tmpAudiocheck = audioStream.enabled;


  // change if audioStream is enabled
  if(audioStream.enabled){
    // if you are already sending voice to the person, then the call is established
    if(statusIndicator.hasClass('sending')) {
      updateStatusAnimation(statusIndicator, 'est-2way');
      toggleVideoSize(easyrtcid, turnOn);
      
    } else {
      updateStatusAnimation(statusIndicator, 'receive-call');
    }
    console.log(statusIndicator);
    $(videoContainer).find('.fa-volume-off').removeClass().addClass('fa fa-volume-up');
  } else {
    
    if(statusIndicator.hasClass('connected')){
      updateStatusAnimation(statusIndicator, 'send-call');
    } else {
      updateStatusAnimation(statusIndicator, 'stop');

    }
    toggleVideoSize(easyrtcid, turnOn);
    // stopStatusAnimation(statusIndicator);
    $(videoContainer).find('.fa-volume-up').removeClass().addClass('fa fa-volume-off');
    
  }
}

// toggles client with easyrtcid's video stream on or off
function toggleVideoStream(easyrtcid, turnOn) {
  var userDiv = "#" + easyrtcid;
  // make sure the peer's audio stays on
  var videoContainer = $(userDiv).parent();

  var userStream = easyrtc.getRemoteStream(easyrtcid);
  var videoStream = userStream.getVideoTracks()[0];

  if(turnOn == null || turnOn == undefined){
    videoStream.enabled = !videoStream.enabled;
  } else {
    videoStream.enabled = turnOn;
  }

}

// function to ignore hover-to-talk and just keep mic on
function toggleMaintainAudio(easyrtcid) {
  var userDiv = "#" + easyrtcid;
  var videoContainer = $(userDiv).parent();
  if(videoContainer.hasClass("stayOn")){
    $(videoContainer).removeClass("stayOn");
  } else {
    $(videoContainer).addClass("stayOn");
  }
}

// function to set do not disturb
function toggleDoNotDisturb(turnOn) {
  $(".remote-user").each(function(){
    if(turnOn){
      // listen
      if($(this).hasClass("keep-mic")){
        return;
      }
      $(this).addClass("mute");
    } else {  // allow people to contact you
      $(this).removeClass("mute");
    }

  });
}

// take snapshot and send to everyone or
// to one specific user provided their easyrtcid
function takeSnapshot(shouldSendAll, easyrtcid){
  var snapshotCanvas = document.getElementById("snapshot");
  snapshotCanvas.width = $("#self").width();
  snapshotCanvas.height = $("#self").height();
  var snapshotContext = snapshotCanvas.getContext("2d");
  var videoInput = document.getElementById("self");
  // if no selected user, take local snapshot
  if(easyrtcid == null){
    snapshotContext.drawImage(videoInput, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
  }

  if(shouldSendAll || easyrtcid != null){
    var data = snapshotCanvas.toDataURL();
    
    if(easyrtcid != null){
      easyrtc.sendData(easyrtcid, "newSnapshot", data);
    } else {

      broadcastObject(data, "newSnapshot");
    }
  }

}

function updateSnapshot(sender, dataURL) {
  var id = "#" + sender;
  var videoContainer = $(id).parent();
  var snapshot = videoContainer.find(".snapshot");
  if(snapshot){
    snapshot.css("z-index", "2");
  }
  videoContainer.append("<img class='snapshot' src='" +
    dataURL + "'></img>");
  if(snapshot) {
    snapshot.animate({
      "opacity" : "0"
    }, 1000, function(){
      $(this).remove();
    });
  }
}
/********************************* FAUX BUBBLE & DOCK ***********************************/
function createFauxBubble(easyrtcid) {
  // TODO: create a representative bubble that is docked
  var statusDock = document.getElementById('dock');
  var fauxBubble = document.createElement('div');
  var initials = document.createElement('div');
  fauxBubble.setAttribute("data-easyrtcid", easyrtcid);
  fauxBubble.className = "faux-bubble";
  var displayName = easyrtc.idToName(easyrtcid);
  var matches = displayName.match(/\b(\w)/g);
  var acronym = matches.join('');
  $(initials).append(acronym);
  fauxBubble.appendChild(initials);
  statusDock.appendChild(fauxBubble);
  return fauxBubble;
}

function getFauxBubble(easyrtcid){
  // TODO: retrieves faux bubble dom object
  var fauxBubble = $("#dock").find("[data-easyrtcid='" + easyrtcid + "']");
  if(fauxBubble.length == 0){
    return null;
  }
  return fauxBubble[0];
}

function removeFauxBubble(easyrtcid){
  // TODO: removes the faux bubble from the dock
  var fauxBubble = getFauxBubble(easyrtcid);
  $(fauxBubble).remove();
}

function bringUpBubble(easyrtcid){
  // TODO: brings up the bubble to the center
  
  var videoContainer = $("#"+easyrtcid).parents(".video-container");
  var self = videoContainer.parent(".remote-user");
  $(videoContainer).find(".fa-microphone-slash").removeClass().addClass("fa fa-microphone");
  // send call and start speaking
  animateCollapseBubble(videoContainer,function(){
    // setTimeout(function(){
      $(self).css({
        "left" : 0,
        "top" : 0,
        "position" : "relative"
      });
      animateExpandBubble(videoContainer, null);
      
    // }, 1000);
    
  });

}


function updateUserOnDock(easyrtcid){
  // TODO: check the dock to see if fauxbubble is represented
  //        then update connections status
  var fauxBubble = getFauxBubble(easyrtcid);
  if(fauxBubble == null){
    fauxBubble = createFauxBubble(easyrtcid);
  }
  userStatuses[easyrtcid] = easyrtc.getConnectStatus(easyrtcid);
  if(userStatuses[easyrtcid] == easyrtc.NOT_CONNECTED){
    removeFauxBubble(easyrtcid);
  }
  $(fauxBubble).removeClass().addClass(userStatuses[easyrtcid] + " faux-bubble");

}

function updateDock(){
  for(var easyrtcid in userStatuses){
    updateUserOnDock(easyrtcid);
  }
}

// checks connection status of everyone in roomName
// performs callback function on each of the users
// callback function takes 2 parameters, easyrtcid of user and order of occupant
function updateConnections(roomName, callback){
  var occupantsInRoom = easyrtc.getRoomOccupantsAsArray(roomName);
  var occupantIndex = 0;
  if(occupantsInRoom == null){
    console.log("Invalid room");
    return;
  }
  for(var i = 0; i < occupantsInRoom.length; i++){
    // skip checking connection if occupant is self
    if(occupantsInRoom[i] == easyrtc.myEasyrtcid){
      continue;
    }
    // console.log(occupantsInRoom[i], "connection status",easyrtc.getConnectStatus(occupantsInRoom[i]));
    updateUserOnDock(occupantsInRoom[i]);
    if(callback){
      callback(occupantsInRoom[i], occupantIndex);
    }
    occupantIndex++;
  }
  updateDock();
}



/****************** Event Listeners ********************/
// emits a message to the targeted user to listen to what you have to say
$(document).on('mouseenter','.remote-user', function(){
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  $(this).find(".fa-microphone-slash").removeClass().addClass("fa fa-microphone");
  
  // easyrtc.sendData(easyrtcid, "activateVoice",  easyrtc.myEasyrtcid);
});

// emits a message to the targeted user to stop broadcasting what you have to say
$(document).on('mouseleave','.remote-user', function(){
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  if(!$(this).hasClass('keep-mic'))
    $(this).find(".fa-microphone").removeClass().addClass("fa fa-microphone-slash");
  $(this).css({'position': 'absolute'});
  // easyrtc.sendData(easyrtcid, "stopVoice",  easyrtc.myEasyrtcid);

});

$(document).on('mouseenter','.faux-bubble', function(){
  // TODO: bringup bubble
  var easyrtcid = this.getAttribute('data-easyrtcid');
  bringUpBubble(easyrtcid);
});

$(document).on('mouseleave','.faux-bubble', function(){
  var easyrtcid = this.getAttribute('data-easyrtcid');
  var videoContainer = $("#"+easyrtcid).parents(".video-container");
  var self = videoContainer.parent(".remote-user");
  $(self).find(".fa-microphone").removeClass().addClass("fa fa-microphone-slash");

  self.css('position', 'absolute');
});

// focus in on user
$(document).on('click','.remote-user', function(){
  var self = this;
  var videoContainer = $(self).find('.video-container');
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  // stopStatusAnimation(self);

  // focusOnUser(this);
  console.log($(self).hasClass('sending'));
  if($(self).hasClass('sending') || $(self).hasClass('connected')){   // already connected in some form
    var wasConnected = $(self).hasClass("connected");
    updateStatusAnimation(self, 'stop');

    easyrtc.sendData(easyrtcid, "stopVoice",  easyrtc.myEasyrtcid);

    //disconnect connection
    animateCollapseBubble(videoContainer, function(){
      // alert("transition complete");
      

      // setTimeout(function(){
        var randX = animateBubbles ? Math.random() * ($("html").width() - 200) : 0;
        var randY = animateBubbles ? Math.random() * ($("html").height() - 200) : 0;
        $(self).css({
          "position" : "absolute",
          "left" : randX,
          "top" : randY

        });
        animateExpandBubble(videoContainer, null);
        if(wasConnected){
          updateStatusAnimation(self, 'receive-call');
          toggleVideoSize(easyrtcid, false);
        }
      // }, 500);    
    });
  } else {
    var isReceiving = $(self).hasClass("receiving");
    updateStatusAnimation(self, 'stop');
    easyrtc.sendData(easyrtcid, "activateVoice",  easyrtc.myEasyrtcid);
    
    // send call and start speaking
    animateCollapseBubble(videoContainer,function(){
      // alert("transition complete");
      // $(self).appendTo("#focused-users");
      
      
      
      // setTimeout(function(){
        $(self).css({
          "left" : 0,
          "top" : 0,
          "position" : "relative"
        });
        animateExpandBubble(videoContainer, null);
        
        if(isReceiving){
          updateStatusAnimation(self,'est-2way');
          toggleVideoSize(easyrtcid, true);
        } else {
          updateStatusAnimation(self,'send-call');
        }
        
      // }, 1000);
      
    });
    
  }
    
});

// set do not disturb
$("#self").parent().click(function(){
  if($(this).hasClass("busy")){
    $(this).removeClass("busy");
    $("#self ~ .fa").css("color", "rgba(255, 255, 255, 0.498039)");
    toggleDoNotDisturb(false);
  } else {
    $(this).addClass("busy");
    toggleDoNotDisturb(true);
    $("#self ~ .fa").css("color", "rgba(255, 0, 0, 0.498039)");

  }
});

// $('#focused-users').bind("DOMSubtreeModified",function(){
//   if($(this).children().length == 0) {
//     $(this).css({
//       "z-index" : 0
//     });
//   } else {
//     $(this).css({
//       "z-index" : 30
//     });
//   }
// });

/****************** Document Loaded ********************/
$(function(){
  // easyrtc.enableAudio(false);
  var localUser = getUserName();
  $(".status-indicator").draggable({
    start: function(){
      // $(".statusIndicator").css("z-index", "1");
      $(this).css("z-index", "2");
    }
  });
  $("#username-input").focus();
  
  // init color picker
  $("#stroke-color, #fill-color").spectrum({
    showAlpha: true,
    clickoutFiresChange: true,
    showInitial: true,
    change: function(color){
      if($(this).attr('id') == "stroke-color"){
        strokeColor = "rgba(" + color.toRgb().r + "," + color.toRgb().g
          + "," + color.toRgb().b + "," + color.toRgb().a + ")";
      } else {
        fillColor = "rgba(" + color.toRgb().r + "," + color.toRgb().g
          + "," + color.toRgb().b + "," + color.toRgb().a + ")";
      }
    }
  });

  // set initial color 
  var tmpColor = $("#stroke-color").spectrum("get");
  strokeColor = "rgba(" + tmpColor.toRgb().r + "," + tmpColor.toRgb().g
          + "," + tmpColor.toRgb().b + "," + tmpColor.toRgb().a + ")";
  $("#fill-color").spectrum("set", "rgba(0,0,0,0)");
  fillColor = "rgba(0,0,0,0)";
});
