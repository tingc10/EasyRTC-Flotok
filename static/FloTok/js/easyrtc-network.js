/*
SUMMARY: Provides intializers for making calls, toggling video and audio stream
          - contains broadcast wrapper function
          - contains global variables
DEPENDENCIES: none
*/

var callStatus = {
  NONE: 0,
  CALLTO: 1,
  CALLFROM: 2,
  TWOWAY: 3
};

/************** GLOBAL VARIABLES **********/
// var snapshotInterval = 5000;    // new snapshot in ms
// var self = document.getElementById('self'), // self the video element
//     selfContainer = self.parentNode,        // self video-container
//     snapshotCanvas = document.getElementById("snapshot"), 
//     $html = $("html");
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
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
var isChrome = !!window.chrome && !isOpera;
if(!isChrome){
  alert("This app is built for Google Chrome Browser, please switch for the most optimal experience");
}

function notifyMe(message, userId, scope) {
  // Let's check if the browser supports notifications
  var notification = null;
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
    return;
  }

  // Let's check if the user is okay to get some notification
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    notification = new Notification("Flotok Notification", {body:message});
    
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      // If the user is okay, let's create a notification
      if (permission === "granted") {
        notification = new Notification("Flotok Notification", {body:message}); 
      }
    });
  }
  if(notification != null){
    // close notification after 5 seconds
    setTimeout(function(){
      notification.close();
    }, 5000);
    // if scope sent in, that means give ability to call
    if(userId != null && userId != undefined){
      notification.onclick = function(){
        scope.$apply(function(){
          scope.$broadcast(userId+"performCall");
          window.focus();
        });
      };
    }
  }

  // At last, if the user already denied any notification, and you 
  // want to be respectful there is no need to bother them any more.
}

/*************** CONNECTION HELPERS **************/
angular.module('VirtualOffice', [])
.service('NetworkData', function ($interval){
  // TODO: aggregate global data containing users and groups availabe
  this.peerLength = 0;
  this.roomParticipantsLength = 0;
  this.allGroups = {};
  this.allPeers = {};
  this.roomParticipants = {};
  this.transmitAll = false;
  this.snapshotInterval;
  this.haltInterval;
  this.addPeer = function(easyrtcid){
    this.allPeers[easyrtcid] = new User(easyrtcid);
    this.peerLength++;
  };
  this.removePeer = function(easyrtcid){
    delete this.allPeers[easyrtcid];
    this.peerLength--;
  };

  this.broadcastObject = function(obj, messageType, callback){
    // TODO: broadcasts the obj with messageType to the default room
    
    var dest = { targetRoom : "default" };
    easyrtc.sendPeerMessage(dest, messageType, obj,
      function(msgType, msgBody){
        // TODO: success callback
        // if(messageType == "newSnapshot") {
        //   // console.log("snapshot broadcasted");
        // }
        if(callback !== null && callback !== undefined) callback();
      },
      function(errorCode, errorText){ // error callback
        console.log("error was " + errorText);
      }
    );
  };

  // var network = this;
  // var observerCallbacks = [];
  // network.selectingGroup = null;    // stores the current group being created
  // network.allGroups = {};
  // network.allPeers = {};
  // network.peerLength = 0;
  // //register an observer
  // network.registerObserverCallback = function(callback){
  //   observerCallbacks.push(callback);
  // };
  // //call this when you know 'foo' has been changed
  // var notifyObservers = function(){
  //   angular.forEach(observerCallbacks, function(callback){
  //     callback();
  //   });
  // };
  
  
  // network.groupBroadcast = function(groupID, updateType, data, callback){
  //   var msgData = {
  //     id : groupID,
  //     type : updateType,
  //     value : data
  //   };
  //   network.broadcastObject(msgData, 'groupUpdate', callback);
  // };

  // network.broadcastCurrentGroup = function(){
  //   // TODO: broadcasts current group to peers, depending on if the group is private or not
  //   //        if broadcast successful, it will call all users
  //   var tmp = network.selectingGroup;
  //   try{
  //     var callback = function(){
  //       network.toggleGroupTransmition(tmp);
  //     };
      
  //     network.groupBroadcast(tmp, 'newGroup', network.allGroups[tmp], callback);
  //   } catch(err){
  //     console.log("problem broadcasting group");
  //   }

  // };

  // network.toggleGroupTransmition = function(groupID){
  //   // TODO: contact each member in group
  //   var group = network.allGroups[groupID];
  //   var turnOn = !group.users[easyrtc.myEasyrtcid],
  //       updateType = turnOn ? 'userConnect' : 'userDisconnect';
  //   for(easyrtcid in group.users){
  //     // don't try to call yourself
  //     if(easyrtcid == easyrtc.myEasyrtcid) continue;
  //     var tmp = network.allPeers[easyrtcid];
  //     tmp.selected = false;
  //     if(turnOn){
  //       // toggle transmition of current user if stream not already going out
  //       if(tmp.callStatus == 0 || tmp.callStatus == 2){
  //         tmp.toggleTransmition();
  //       }
  //     } else {
  //       // toggle transmition of current user if stream is going out
  //       if(tmp.callStatus == 1 || tmp.callStatus == 3){
  //         tmp.toggleTransmition();
  //       }
  //     }
  //   }
  //   // change the boolean "connected to group" flag to true or false
  //   group.users[easyrtc.myEasyrtcid] = true;
  //   network.groupBroadcast(group.getGroupID(),updateType, easyrtc.myEasyrtcid);
  // };

  // network.toggleUserSelection = function(easyrtcid){
  //   // TODO: selects or deselects user to be added to group
  //   //        returns true if user is selecting peers for group
  //   if(network.selectingGroup != null){
  //     if(network.allGroups[network.selectingGroup].users[easyrtcid] !== undefined && 
  //       network.allGroups[network.selectingGroup].users[easyrtcid] !== null){
  //       // deselect user from group formation
  //       network.allPeers[easyrtcid].selected = false;
  //       delete network.allGroups[network.selectingGroup].removeFromGroup(easyrtcid);

  //     } else {
  //       // add user to group
  //       network.allPeers[easyrtcid].selected = true;
  //       network.allGroups[network.selectingGroup].addToGroup(easyrtcid);
  //     }
  //     return true;
  //   }
  //   return false;
  // };

  // 
  // 


  // network.updateGroups = function(updateData){
  //   // TODO: makes updates to a group based on updateType
  //   var groupID = updateData.id,
  //       updateType = updateData.type,
  //       data = updateData.value;
  //   switch(updateType){
  //     case 'newGroup':
  //       // data here is the Group object itself
  //       network.allGroups[groupID] = data;
  //       break;
  //     case 'newUser':
  //       // data is the new user that gets added the to users object
  //       // the connected value is initiated to false
  //       network.allGroups[groupID].users[data] = false;
  //       break;
  //     case 'deleteGroup':
  //       // remove the group object from the allGroups object
  //       delete network.allGroups[groupID];
  //       break;
  //     case 'userConnect':
  //       // data is the user who connected
  //       network.allGroups[groupID].users[data] = true;
  //       break;
  //     case 'userDisconnect':
  //       network.allGroups[groupID].users[data] = false;
  //       break;
  //     default:
  //       break;
  //   }
  // };
});