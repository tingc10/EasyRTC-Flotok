/*********** GLOBAL ****************/
//var callAllUsers = true;
var usersEntering = [];
var sequenceCompare = [];
var userEnterAnimating = false;
// var userEnterEvent = document.createEvent("Event");
// userEnterEvent.initEvent("userEnterEvent", true, true);
// userEnterEvent.animating = false;
// document.addEventListener("userEnterEvent", animateEnterRoom,false);
/*********** Objects *************/


/*********** Functions for Making Calls ****************/

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
        "height" : "200px",
        "left" : "-31px",
        "top" : "-31px"
      }, 1000, function(){
        // give ample time to take a good snapshot before connecting with others
        setTimeout(function(){
          takeSnapshot(false, null);
          easyrtc.connect("VirtualOffice", connectSuccess, connectFailure);

        },1000);
      });

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
	var videoContainer = document.createElement('div');
    videoContainer.className = "remote-user video-container";


    $(videoContainer).append("<div class='display-name'>" +
                             easyrtc.idToName(callerEasyrtcid)
                             + "</div><i class='fa fa-volume-off'></i>" +
                             "<i class='fa fa-microphone-slash'></i>");
    // create video element
    var video = document.createElement('video');
    video.id = callerEasyrtcid;
    var callerContainer = document.getElementById('caller-container');
    videoContainer.appendChild(video);
    callerContainer.appendChild(videoContainer);
    usersEntering.push(videoContainer);
    // make sure to pull the current remote
    // user up front to provide continuous drag
    $(videoContainer).draggable({
        start : function(){
            $(".video-container").css("z-index", "1");
            $(this).css("z-index", "2");
        }
    });
	
	
	// turn off their audio stream
    var remoteAudioStream = stream.getAudioTracks()[0];
    remoteAudioStream.enabled = false;
    // turn off their video strea
    var remoteVideoStream = stream.getVideoTracks()[0];
    remoteVideoStream.enabled = false;
    
    // send snapshot to user
    takeSnapshot(false, callerEasyrtcid);

    // check if user is in do not disturb mode
    if($("#self").parent().hasClass("busy")){
        toggleDoNotDisturb(true);
    }
	easyrtc.setVideoObjectSrc(video, stream);
	animateEnterRoom();
//    setupDOMElement(callerEasyrtcid, stream);
//    initUser(callerEasyrtcid, stream);

});



// function that is called when a user exits the room
easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
  var id = "#" + callerEasyrtcid;
  $(id).parent().animate({
    "margin" : "100px",
    "width" : "0",
    "height" : "0"
  }, 1000,function(){
    easyrtc.setVideoObjectSrc(document.getElementById(callerEasyrtcid), "");
    document.getElementById(callerEasyrtcid).parentNode.remove();
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
			}
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


function setupDOMElement(easyrtcid, stream){
	var videoContainer = document.createElement('div');
    videoContainer.className = "remote-user video-container";


    $(videoContainer).append("<div class='display-name'>" +
                             easyrtc.idToName(easyrtcid)
                             + "</div><i class='fa fa-volume-off'></i>" +
                             "<i class='fa fa-microphone-slash'></i>");
    // create video element
    var video = document.createElement('video');
    video.id = easyrtcid;
    var callerContainer = document.getElementById('caller-container');
    videoContainer.appendChild(video);
    callerContainer.appendChild(videoContainer);
    usersEntering.push(videoContainer);
    // make sure to pull the current remote
    // user up front to provide continuous drag
    $(videoContainer).draggable({
        start : function(){
            $(".video-container").css("z-index", "1");
            $(this).css("z-index", "2");
        }
    });
	easyrtc.setVideoObjectSrc(video, stream);

}
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


function getUserName(){
  centerInElement($("body"),$("#username-container"),true,true);
  $("#username-input").keypress(function(e){
    if(e.which == 13){
      if(!easyrtc.setUsername($(this).val())){
        alert("Please enter your display name");
        return;
      }
      $("#username-container").css('opacity','0');
      $("#self").parent().find(".display-name").html($(this).val());

      $("#tool-container").css('display', 'block');
      initCall()

    }
  });
}

// toggles client with easyrtcid's audio stream on or off
function toggleAudioStream(easyrtcid, turnOn) {
  var userDiv = "#" + easyrtcid;
  // make sure the peer's audio stays on
  var videoContainer = $(userDiv).parent();
  if(videoContainer.hasClass("stayOn")){
    return;
  }
  var muted = videoContainer.hasClass("mute");
  var userStream = easyrtc.getRemoteStream(easyrtcid);
  var audioStream = userStream.getAudioTracks()[0];
  if(!muted){
    if(turnOn == null || turnOn == undefined){
      audioStream.enabled = !audioStream.enabled;
    } else {
      audioStream.enabled = turnOn;
    }
  } else {
    audioStream.enabled = false;
  }
  // change if audioStream is enabled
  if(audioStream.enabled){
    $(videoContainer).find('.fa-volume-off').removeClass().addClass('fa fa-volume-up');
  } else {
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
    var dest = {};
    if(easyrtcid != null){
      easyrtc.sendData(easyrtcid, "newSnapshot", data);
    } else {
      dest.targetRoom = "default";
      easyrtc.sendPeerMessage(dest, "newSnapshot", data,
        function(msgType, msgBody){ // success callback
          // console.log("sent " + msgType);
        },
        function(errorCode, errorText){ // error callback
          console.log("error was " + errorText);
        }
      );
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


/****************** Event Listeners ********************/
// emits a message to the targeted user to listen to what you have to say
$(document).on('mouseenter','.remote-user', function(){
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  $(this).find(".fa-microphone-slash").removeClass().addClass("fa fa-microphone");
  easyrtc.sendData(easyrtcid, "activateVoice",  easyrtc.myEasyrtcid);
});

// emits a message to the targeted user to stop broadcasting what you have to say
$(document).on('mouseleave','.remote-user', function(){
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  if(!$(this).hasClass('keep-mic'))
    $(this).find(".fa-microphone").removeClass().addClass("fa fa-microphone-slash");
  easyrtc.sendData(easyrtcid, "stopVoice",  easyrtc.myEasyrtcid);

});

// focus in on user
$(document).on('click','.remote-user', function(){
  var video = $(this).find("video");
  var easyrtcid = video.attr("id");
  // bring the clicked buble to the top
  $(".video-container").css("z-index", "1");
  $(this).css("z-index", "2");
  if($(this).hasClass('keep-mic')) {
    // end focus on remote user
    $(this).removeClass('keep-mic');
    // toggleDoNotDisturb(false);
    if($("#self").parent().hasClass("busy")){
      $(this).addClass("mute");
    }
    $(this).animate({
      "width" : "200px",
      "height"  : "200px",
      "margin-right" : "0px",
      "margin-bottom" : "0px"
    }, 0, function(){
      $(this).find('video').css("z-index", "0");
      $(this).find(".snapshot").animate({
        "opacity" : "1"
      }, 1000, function(){
        toggleVideoStream(easyrtcid, false);

      });
    });


  } else {
    // start focus on remote user
    $(this).addClass('keep-mic');
    if($(this).hasClass("mute")){
      $(this).removeClass("mute");
    }
    // toggleDoNotDisturb(true);
    toggleVideoStream(easyrtcid, true);
    var videoContainer = this;
    $(this).find(".snapshot").animate({
      "opacity" : "0"
    }, 500, function(){
      $(videoContainer).find('video').css("z-index", "3");
      $(videoContainer).css({
        "width" : "500px",
        "height"  : "500px",
        "margin-right" : "300px",
        "margin-bottom" : "3000px"

      }).animate({
        "left" : "125px",
        "top" : "125px"
      },1000);
    });

  }
  easyrtc.sendData(easyrtcid, "toggleStayOn",  easyrtc.myEasyrtcid);
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



/****************** Handshake *******************/

/****************** Document Loaded ********************/
$(function(){
  // easyrtc.enableAudio(false);
  var localUser = getUserName();
  $(".video-container").draggable({start: function(){
    $(".video-container").css("z-index", "1");
    $(this).css("z-index", "2");
  }});
  $("#username-input").focus();

});
