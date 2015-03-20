/*
SUMMARY: Provides intializers for making calls, toggling video and audio stream
          - contains broadcast wrapper function
          - contains global variables
DEPENDENCIES: none
*/

/************** GLOBAL VARIABLES **********/
var snapshotInterval = 5000;    // new snapshot in ms
var self = document.getElementById('self'), // self the video element
    selfContainer = self.parentNode,        // self video-container
    snapshotCanvas = document.getElementById("snapshot"), 
    $html = $("html");
// Set the name of the hidden property and the change event for visibility
var hidden, visibilityChange; 
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.mozHidden !== "undefined") {
  hidden = "mozHidden";
  visibilityChange = "mozvisibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}
/*************** CONNECTION HELPERS **************/
angular.module('VirtualOffice', [])
.service('easyrtcNetwork', function($interval, $rootScope){
  var network = this;
  var observerCallbacks = [];
  network.selectingGroup = null;    // stores the current group being created
  network.allGroups = {};
  network.allPeers = {};
  network.peersLength = 0;
  //register an observer
  network.registerObserverCallback = function(callback){
    observerCallbacks.push(callback);
  };
  //call this when you know 'foo' has been changed
  var notifyObservers = function(){
    angular.forEach(observerCallbacks, function(callback){
      callback();
    });
  };
  
  var roomListener = function(roomName, otherPeers) {
    // TODO: callback for any changes to the number of occupants in room
    var user;
    var easyrtcid;
    for(easyrtcid in otherPeers) {
      console.log(easyrtcid + " entered the room with connection " +
        easyrtc.getConnectStatus(easyrtcid));
      
      if((user = network.allPeers[easyrtcid]) === undefined){
        network.allPeers[easyrtcid] = new User(easyrtcid);
        network.peersLength++;
      } else {
        user.stillInRoom = true;
      }
      

    }
    
    // log out anyone who is no longer in the room
    for(easyrtcid in network.allPeers){
      if(easyrtcid == 'length'){
        continue;
      }
      user = network.allPeers[easyrtcid];
      if(!user.stillInRoom){
        console.log(user.displayName + " has left the room");
        user.removeFromDOM();
        delete network.allPeers[easyrtcid];
        network.peersLength--;
      } else {
        
        // must reset the user's stillInRoom flag
        user.stillInRoom = false;
      }
    }
    notifyObservers();

  };

  
  var takeSnapshot = function(){

    var $self = $(self);
    // set snapshot canvas width and height to the same as the video element
    snapshotCanvas.width = $self.width();
    snapshotCanvas.height = $self.height();
    var snapshotContext = snapshotCanvas.getContext("2d");
    
    snapshotContext.drawImage(self, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    // broadcast to everyone who is in the room

    if(network.peersLength > 0){
      var data = snapshotCanvas.toDataURL();
      network.broadcastObject(data, "newSnapshot");
    }
    
  };

  network.initCall = function() {
    easyrtc.setRoomOccupantListener(roomListener);
    var connectSuccess = function(myId) {
      console.log("My easyrtcid is " + myId);
      // begin sending snapshots at 
      $interval(function(){
        takeSnapshot();
      }, snapshotInterval);
    };
    var connectFailure = function(errMsg){
      console.log("Connection Error: " + errMsg);
    };
    
    // initMediaSource called when user allows camera accessibility
    easyrtc.initMediaSource(function(){
      // success callback
      easyrtc.setVideoObjectSrc(self, easyrtc.getLocalStream());
      easyrtc.connect("VirtualOffice", connectSuccess, connectFailure);
      expandAt(selfContainer, 0, 0, null, null);
    });
  };

  network.broadcastObject = function(obj, messageType, callback){
    // TODO: broadcasts the obj with messageType to the default room
    
    var dest = { targetRoom : "default" };
    easyrtc.sendPeerMessage(dest, messageType, obj,
      function(msgType, msgBody){
        // TODO: success callback
        // console.log("sent " + msgType);
        // if(messageType == "newSnapshot") {
        //   // console.log("snapshot broadcasted");
        // } else if(messageType == "drawElement") {
        //   // console.log("canvas element drawn");
        // }
        if(callback !== null && callback !== undefined) callback();
      },
      function(errorCode, errorText){ // error callback
        console.log("error was " + errorText);
      }
    );
  };
  network.groupBroadcast = function(groupID, updateType, data, callback){
    var msgData = {
      id : groupID,
      type : updateType,
      value : data
    };
    network.broadcastObject(msgData, 'groupUpdate', callback);
  };

  network.broadcastCurrentGroup = function(){
    // TODO: broadcasts current group to peers, depending on if the group is private or not
    //        if broadcast successful, it will call all users
    var tmp = network.selectingGroup;
    try{
      var callback = function(){
        network.toggleGroupTransmition(tmp);
      };
      
      network.groupBroadcast(tmp, 'newGroup', network.allGroups[tmp], callback);
    } catch(err){
      console.log("problem broadcasting group");
    }

  };

  network.toggleGroupTransmition = function(groupID){
    // TODO: contact each member in group
    var group = network.allGroups[groupID];
    var turnOn = !group.users[easyrtc.myEasyrtcid],
        updateType = turnOn ? 'userConnect' : 'userDisconnect';
    for(easyrtcid in group.users){
      // don't try to call yourself
      if(easyrtcid == easyrtc.myEasyrtcid) continue;
      var tmp = network.allPeers[easyrtcid];
      tmp.selected = false;
      if(turnOn){
        // toggle transmition of current user if stream not already going out
        if(tmp.callStatus == 0 || tmp.callStatus == 2){
          tmp.toggleTransmition();
        }
      } else {
        // toggle transmition of current user if stream is going out
        if(tmp.callStatus == 1 || tmp.callStatus == 3){
          tmp.toggleTransmition();
        }
      }
    }
    // change the boolean "connected to group" flag to true or false
    group.users[easyrtc.myEasyrtcid] = true;
    network.groupBroadcast(group.getGroupID(),updateType, easyrtc.myEasyrtcid);
  };

  network.toggleUserSelection = function(easyrtcid){
    // TODO: selects or deselects user to be added to group
    //        returns true if user is selecting peers for group
    if(network.selectingGroup != null){
      if(network.allGroups[network.selectingGroup].users[easyrtcid] !== undefined && 
        network.allGroups[network.selectingGroup].users[easyrtcid] !== null){
        // deselect user from group formation
        network.allPeers[easyrtcid].selected = false;
        delete network.allGroups[network.selectingGroup].removeFromGroup(easyrtcid);

      } else {
        // add user to group
        network.allPeers[easyrtcid].selected = true;
        network.allGroups[network.selectingGroup].addToGroup(easyrtcid);
      }
      return true;
    }
    return false;
  };

  easyrtc.setPeerListener(function(easyrtcid, msgType, msgData, targeting){
    // JSON.stringify(msgData));

    switch(msgType){
      case "activateVoice":
        network.allPeers[easyrtcid].toggleAudioStream(true);
        break;
      case "stopVoice":
        network.allPeers[easyrtcid].toggleAudioStream(false);
        break;
      case "newSnapshot":
        
        if(!document[hidden]){
          try{
            network.allPeers[easyrtcid].bubble.updateSnapshot(msgData);

          } catch(err){
            console.log(err);
          }
        }
        break;
      
      case "groupUpdate":
        network.updateGroups(msgData);
        break;
    }
    
    notifyObservers();
  });
  easyrtc.setStreamAcceptor(function(callerEasyrtcid, stream) {
    // TODO: callback when there is a stream connection from callerEasyrtcid
    var tmp = network.allPeers[callerEasyrtcid];
    // turn off their audio stream
    var remoteAudioStream = stream.getAudioTracks()[0];
    remoteAudioStream.enabled = false;
    // turn off their video stream
    var remoteVideoStream = stream.getVideoTracks()[0];
    remoteVideoStream.enabled = false;
    var video = document.getElementById(callerEasyrtcid);
    easyrtc.setVideoObjectSrc(video, stream);
    notifyObservers();
  });
  easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
    // TODO: callback for when a connection is closed from callerEasyrtcid
    var tmp = network.allPeers[callerEasyrtcid];
    // change the callstatus to NONE
    tmp.callStatus = 0;
    tmp.evalCallState();
    easyrtc.setVideoObjectSrc(document.getElementById(callerEasyrtcid), "");
    // notifyObservers();
  });


  network.updateGroups = function(updateData){
    // TODO: makes updates to a group based on updateType
    var groupID = updateData.id,
        updateType = updateData.type,
        data = updateData.value;
    switch(updateType){
      case 'newGroup':
        // data here is the Group object itself
        network.allGroups[groupID] = data;
        break;
      case 'newUser':
        // data is the new user that gets added the to users object
        // the connected value is initiated to false
        network.allGroups[groupID].users[data] = false;
        break;
      case 'deleteGroup':
        // remove the group object from the allGroups object
        delete network.allGroups[groupID];
        break;
      case 'userConnect':
        // data is the user who connected
        network.allGroups[groupID].users[data] = true;
        break;
      case 'userDisconnect':
        network.allGroups[groupID].users[data] = false;
        break;
      default:
        break;
    }
  };
});