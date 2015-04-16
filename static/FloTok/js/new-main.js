
(function(){
	
	/************** ANGULAR SETUP *************/
	angular.module('VirtualOffice')	
	.directive('getUsername', function($rootScope, $timeout){
		return {
			restrict: 'E',
			scope: {
				displayName : "=",
				roomName : '='
			},
			templateUrl: './directives/get-username.html',
			link: function(scope, element, attrs){
				element[0].querySelector('#username-input').focus();
				element.bind('keyup', function(e){
					if(e.keyCode == 13){
						if(scope.displayName.length == 0){
							alert('Please enter a username');
						} else {
							easyrtc.setUsername(scope.displayName);
							$rootScope.$broadcast('setDisplayName', scope.displayName);
							TweenMax.to(element, .75, {
								opacity:0, 
								onComplete:function(){
									scope.$apply(function(){
										if($scope.roomName == ""){
											$scope.roomName = "default";
										}
										element.remove();
										$rootScope.$broadcast('initStream');

									});
									
								}
							});
						}
					}
				});
			}
		}
	})
	.directive('imageLoaded', function(){
		return {
			restrict: 'A',
			link: function(scope, element, attrs){
				element.bind('load', function(){
					console.log('image loaded');
					TweenMax.to(element, 1, {opacity: 1});
				});
			}
		}
	})
	.controller('StreamController', function($timeout, $interval, $scope, $rootScope, NetworkData){
		// TODO: Parent Controller
		$scope.myDisplayName = '';
		$scope.roomName = "";
		$scope.allPeers = NetworkData.allPeers;
		$scope.roomParticipants = NetworkData.roomParticipants;
		$scope.connectedToRoom = null;
		var preRoomListenerEvents = [];		// takes an array of functions that need to run after peer is setup
		// do not create users when 
		var knownInvalidIds = [];
		// var runningIntervals = [];
		var snapshotPromise = null;
		var iceConfigPromise = null;
		var serverConnected = false;
		var localStreamEnded = false;
		var localStreamWatcher = null;
		
		var startSnapshotInterval = function(){
			snapshotPromise = $interval(function(){
        // TODO: take snapshot and check room occupancy to make sure it aligns with allPeers array
        $scope.$broadcast('takeSnapshot');
      }, NetworkData.snapshotInterval*1000);
		};
		var killIntervals = function(){
			// TODO: cancels all actively running intervals
			// while(runningIntervals.length > 0){
			// 	console.log("killing an interval...");
			// 	$interval.cancel(runningIntervals.shift());
			// }
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			if(iceConfigPromise != null){
				$interval.cancel(iceConfigPromise);
				iceConfigPromise = null;
			}
		};
		$scope.$watch(function(){
			return preRoomListenerEvents.length;
		}, function(){
			while(preRoomListenerEvents.length > 0){
				var tmpFn = preRoomListenerEvents.shift();
				tmpFn();
			}
		});
		$scope.$watch(function(){
			return NetworkData.snapshotInterval;
		}, function(){
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			if(!NetworkData.haltInterval){
				startSnapshotInterval();
			}
		}, true);

		$scope.$watch(function(){
			return NetworkData.haltInterval;
		}, function(newValue, oldValue){
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			// if haltInterval is false and connected start sending snapshots again
			if(!newValue){
				startSnapshotInterval();
			}
		});

		

		var roomListener = function(roomName, otherPeers) {
	    // TODO: callback for any changes to the number of occupants in room
		  $scope.$apply(function(){
		    var totalPeers = 0;
		    var callbacksComplete = 0;
		    var user;
		    var easyrtcid;
		    var bootUsers = function(){
		    	// log out anyone who is no longer in the room
		    	// called after all callbacks are complete
					var tmp;
		    	console.log('checking for tmps to boot');
			    for(easyrtcid in NetworkData.allPeers){		      
			      tmp = NetworkData.allPeers[easyrtcid];
			      if(!tmp.stillInRoom){
			        console.log(tmp.displayName + " has left the room");
			        $scope.$broadcast(tmp.id+"leaveRoom");
			        
			      } else {
			        // must reset the tmp's stillInRoom flag
			        tmp.stillInRoom = false;
			      }
			    }
			  };
			  for(easyrtcid in otherPeers){
			  	// do a quick count, this function can't be combined with the bottom loop
			  	// because the callbacks rely on totalPeers number which may change when
			  	// callback returns
			  	totalPeers++;
			  }
		    for(easyrtcid in otherPeers) {
		      console.log(easyrtcid + " entered the room");
		      var tmp = easyrtcid.valueOf();
		      (function(id){
			      easyrtc.sendPeerMessage(id, 'check_channel', null,
	            function(msgType, msgBody) {
	            	
	              console.log(id + " channel work");
	            	if((user = NetworkData.allPeers[id]) === undefined){
					      	NetworkData.addPeer(id);
					      } else {
					        user.stillInRoom = true;
					      }
					      $scope.$apply(function(){
					      	callbacksComplete++;
					      	if(callbacksComplete == totalPeers){
					      		bootUsers();
					      	}
					      });
					      
	            },
	            function(errorCode, errorText) {
	               
	              console.log("channel failed " + errorText);
	              $scope.$apply(function(){
					      	callbacksComplete++;
					      	if(callbacksComplete == totalPeers){
					      		bootUsers();
					      	}
					      });
	            }
	          );
	        })(easyrtcid);
		      
		    }
		    
		    
	    });
	  };
	  var connectToServer = function(){
	  	var connectSuccess = function(myId) {
	      serverConnected = true;
	      $scope.refreshMessage = "Refresh";
	      $scope.$broadcast("expandDock", false);
	      console.log("My easyrtcid is " + myId);
	      // begin sending snapshots at 
	      
	      killIntervals();
	      // only create snapshot interval is haltInterval is false
	      if(!NetworkData.haltInterval){
		      startSnapshotInterval();
		    }
	      // Get fresh ice config every 5 minutes
	      iceConfigPromise = $interval(function(){
	      	if(serverConnected){
		      	easyrtc.getFreshIceConfig();
		      	checkRoomLength();
		      }
	      }, 300000);

	     	
	      localStreamWatcher = $scope.$watch(function(){
					return easyrtc.getLocalStream().getVideoTracks()[0].readyState;
				}, function(newValue, oldValue){
					if(newValue == "ended"){
						disconnectFromServer();
						$scope.$broadcast('clearSelfStream');
						localStreamEnded = true;
						alert('Please reinitialize your camera');
						// deregister watch
						localStreamWatcher();
					}
				});
		    
	    };
	    var connectFailure = function(errMsg){
	      console.log("Connection Error: " + errMsg);
	      // If connection failed, try to reconnect to server after a 5 seconds
	      $timeout(function(){
	      	console.log('Server reconnect failed, reconnecting in 5 seconds...');
	      	connectToServer();
	      }, 5000);
	    };
	    easyrtc.connect(
      	$scope.roomName, 
      	connectSuccess, 
      	connectFailure
      );
	  };
	  var disconnectFromServer = function(){
	  	// TODO: remove intervals then disconnect
	  	
	  	easyrtc.disconnect();
	  	
	  };
	  $scope.refreshConnection = function(){
	  	// TODO: refreshes the current connection by disconnecting then reconnecting
	  	//				it will also reinitialize local stream
	  	$scope.refreshMessage = "In Progress";
	  	disconnectFromServer();
	  	$timeout(connectToServer, 1000);

	  	
	  };
	  var checkRoomLength = function(){
	    // $scope.$apply(function(){
		    var realRoomList = easyrtc.getRoomOccupantsAsArray($scope.roomName);
		    if(realRoomList.length == null){
		    	console.log("Error checking room length: room length is null.", realRoomList);
		    	return;
		    }
		    if((NetworkData.peerLength+1) != realRoomList.length){
		    	console.log("incorrect room length!");
		    	var user;
		    	var id;
		    	// reset the peerlength
		    	NetworkData.peerLength = 0;
		    	for(var id in NetworkData.allPeers){
		    		NetworkData.peerLength++;
		    	}
		    	for(var i = 0; i < realRoomList.length; i++){
		    		id = realRoomList[i];
		    		if(id == easyrtc.myEasyrtcid) continue;
		    		if((user = NetworkData.allPeers[id]) !== undefined){
			        user.stillInRoom = true;
			      }
		    	}
		    	// log out anyone who is no longer in the room
			    for(easyrtcid in NetworkData.allPeers){		      
			      user = NetworkData.allPeers[easyrtcid];
			      if(!user.stillInRoom){
			        console.log(user.displayName + " has left the room");
			        $scope.$broadcast(user.id+"leaveRoom");
			        
			      } else {
			        // must reset the user's stillInRoom flag
			        user.stillInRoom = false;
			      }
			    }
		    }
		  // });
	  };
		$scope.$on('initStream', function() {
			// check notification permission and enable if not enabled
	    notifyMe("You will receive a notification when someone is trying to contact you");
	    easyrtc.setRoomOccupantListener(roomListener);
	    
	    
	    // initMediaSource called when user allows camera accessibility
	    easyrtc.initMediaSource(function(){
	      // success callback
	      $scope.$broadcast('initSelfVideo');
	      connectToServer();
	      
	    });
	  });
	  

	  easyrtc.setPeerListener(function(easyrtcid, msgType, msgData, targeting){
	    // IMPORTANT: peer listener will begin getting data even before room listener is called
	    // JSON.stringify(msgData));
	  	$scope.$apply(function(){
		    switch(msgType){
		      case "activateVoice":
		        NetworkData.allPeers[easyrtcid].toggleAudioStream(true);
		        NetworkData.allPeers[easyrtcid].evalCallState($scope);
		        break;
		      case "stopVoice":
		        NetworkData.allPeers[easyrtcid].toggleAudioStream(false);
		        NetworkData.allPeers[easyrtcid].evalCallState($scope);
		        break;
		      case "newSnapshot":
		        
		        if(!document[hidden]){
		          try{
		            if(msgData != null || msgData != undefined){
			            // NetworkData.allPeers[easyrtcid].snapshots.push(msgData);
			            $scope.$broadcast(easyrtcid+"newSnapshot", msgData);
			          }
		          } catch(err){
		            console.log(err);
		          }
		        }
		        break;
		      case "callWhenReady":
		      	// used for call all if someone is trying to call everyone in the room
		      	preRoomListenerEvents.push(function(){
		      		easyrtc.sendData(easyrtcid, "readyForCall");
		      	});
		      	break;
		      case "getCurrentSnapshot":
		      	// sends current snapshot to user requesting first snapshot
		      	preRoomListenerEvents.push(function(){
		      		$scope.$broadcast('sendCurrentSnapshot', easyrtcid);
		      	});
		      	break;
		      case "readyForCall":
		      	NetworkData.allPeers[easyrtcid].toggleTransmition(true, $scope);
		      	break;
		      case "groupUpdate":
		        // network.updateGroups(msgData);
		        break;

		    }
	    });
	  });
	  easyrtc.setStreamAcceptor(function(callerEasyrtcid, stream) {
	    // TODO: callback when there is a stream connection from callerEasyrtcid
	    $scope.$apply(function(){
	    	$scope.$broadcast(callerEasyrtcid+"streamAccepted", stream);

	    });
	  });
	  easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
	    // TODO: callback for when a connection is closed from callerEasyrtcid
	    $scope.$apply(function(){
	    	$scope.$broadcast(callerEasyrtcid+"streamClosed");

	    });
	  });
	  easyrtc.setDisconnectListener(function(){
	  	// TODO: callback for when server gets disconnected
		  easyrtc.sendServerMessage('roomLeave', null,
	      function(msgType, msgData ) {
	         console.log("Left room during server disconnect");
	      },
	      function(errorCode, errorText) {
	         console.log("Room leave fail - " + errorCode + ":" + errorText);
	      }
      );
		  $scope.$apply(function(){
		  	killIntervals();
		  	serverConnected = false;

		  	// do not run reconnection if user's video gets ended
		  	if(!localStreamEnded){
		  		console.log("Server disconnected");
		  	}
	  	});
	  });
	  window.onfocus = function(){
	  	// TODO: reinitialize local stream and connect to server
	  	$scope.$apply(function(){
	  		console.log('Checking local stream')
	  		if(localStreamEnded && !serverConnected){
	  			console.log('...local stream was ended, reinitializing');
	  			localStreamEnded = false;
	  			$scope.$emit('initStream');
	  		}
	  		for(var id in NetworkData.allPeers){
	  			// refreshing all snapshots of peers
	  			easyrtc.sendData(id, 'getCurrentSnapshot', easyrtc.myEasyrtcid);
	  		}
	  	});
	  };
	})
	.controller('BubbleController', function($scope, $timeout, NetworkData){
		
		// $scope.callUser = function(peer) {
		// 	// TODO: call user and update callStatus
		// 	// check for drag event first, then see if it is a click event for selection or for call
		// 	if(!peer.pendingCall){
		// 		// cancel callUser if the event was a drag event
		// 		return;
		// 	}
		// 	// if toggling user selection for group, dont make a call
		// 	if(NetworkData.toggleUserSelection(peer.id)){
		// 		return;
		// 	}

		// 	peer.pendingCall = false;		// reset
			
		// 	peer.toggleTransmition();
			
			
		// };


		// $scope.groupConfirm = function(create){
		// 	if(NetworkData.selectingGroup == null){
		// 		console.log('Group Confirm Error: No group ID');
		// 		return;
		// 	}
			
		// 	if(NetworkData.allGroups[NetworkData.selectingGroup].count < 2 && create){
		// 		alert('Please select more people to join your group!');
		// 		return;
		// 	}
		// 	if(create){
		// 		// if create, broadcast the group
		// 		NetworkData.broadcastCurrentGroup();
		// 	} else {
		// 		// if not, remove the group from all groups
		// 		delete NetworkData.allGroups[NetworkData.selectingGroup];
		// 	}
		// 	// reset selecting group flag
		// 	NetworkData.selectingGroup = null;
		// };
	})
	
})();