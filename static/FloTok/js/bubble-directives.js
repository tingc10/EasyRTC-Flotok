// BUBBLE DIRECTIVES

angular.module('VirtualOffice')
.directive('selfBubble',['NetworkData', function(NetworkData){
	// TODO: directive defining own video container
	return {
		restrict: 'E',
		templateUrl: './directives/self-bubble.html',
		scope: {},
		link: function(scope, element, attrs){
			var videoContainer = element[0].querySelector('.video-container');
			var $video = element.find('video');		// jquery lite
			var snapshotCanvas = element[0].querySelector("#snapshot");
			scope.bubble = new Bubble(element);
			$(element).draggable({
				scroll : false
			});
			scope.$on('takeSnapshot', function(){
			  // set snapshot canvas width and height to the same as the video element
			  snapshotCanvas.width = $video[0].offsetWidth;
			  snapshotCanvas.height = $video[0].offsetHeight;
			  var snapshotContext = snapshotCanvas.getContext("2d");
			  
			  snapshotContext.drawImage($video[0], 0, 0, snapshotCanvas.width, snapshotCanvas.height);
			  // broadcast to everyone who is in the room

			  if(NetworkData.peerLength > 0){
			    var data = snapshotCanvas.toDataURL();
			    NetworkData.broadcastObject(data, "newSnapshot");
			  }
			  
			});
			scope.$on('initSelfVideo', function(){
				scope.$apply(function(){
					easyrtc.setVideoObjectSrc($video[0], easyrtc.getLocalStream());
      		scope.bubble.expandAt(0, 0, null, null);
      		scope.bubble.playAnimationQueue();
      	});
			});
			scope.$on('setDisplayName', function(e, displayName){
				var nameDOM = element[0].querySelector('.display-name');
				nameDOM.innerHTML = displayName;
			});
			scope.$on('sendFirstSnapshot', function(e, userRequesting){
				var data = snapshotCanvas.toDataURL();
				console.log('sending new user first snapshot');
				easyrtc.sendData(userRequesting, "newSnapshot", data);
			});

		}
	};
}])
.directive('peerBubble', ['NetworkData', '$timeout', function(NetworkData, $timeout){
	return {
		restrict: 'E',
		scope: {
			peer: '='
		},
		templateUrl: "./directives/peer-bubble.html",
		link: function(scope, element, attrs){
			var videoContainer = element[0].querySelector('.video-container'),
					statusIndicator = element[0].querySelector('.status-indicator'),
					isDragging = false,
					callEvent = false,
					selectEvent = false,
					$video = element.find('video');
			scope.snapshots = [];
			scope.callStatusLabel = '';
			
			scope.callActionLabel;
			scope.$watch(function(){
				return scope.peer.callStatus;
			}, function(){
				switch(scope.peer.callStatus){
					case callStatus.NONE:
						scope.callActionLabel = "START CHAT";
						break;
					case callStatus.CALLFROM:
						scope.callActionLabel = "JOIN CHAT";

						break;
					case callStatus.CALLTO:
					case callStatus.TWOWAY:
						scope.callActionLabel = "END CHAT";
						
						break;
				}
			});
			var performCall = function(){
				// TODO: toggle transmition decided based on current callStatus
				if(scope.peer.callStatus == callStatus.NONE ||
						scope.peer.callStatus == callStatus.CALLFROM){
					scope.peer.toggleTransmition(true, scope);
				} else {
					scope.peer.toggleTransmition(false, scope);
				}
			};

			var initBubble = function(){
				// TODO: initializes bubble and begin the animation
				// user is the User object
				// the timeout is used to run the function after DOM has been rendered
				var callTimeout = function(){
					try{
						scope.bubble = new Bubble(element);
						$(statusIndicator).draggable({
							scroll: false,
							drag: function(){
								isDragging = true;
								callEvent = selectEvent = false;
							},
							stop: function(){
								isDragging = false;
							}
						});
						// requests an initial snapshot for the user
						// easyrtc.sendData(scope.peer.id, 'getFirstSnapshot', easyrtc.myEasyrtcid);
						if(NetworkData.transmitAll){
							easyrtc.sendData(scope.peer.id, 'callWhenReady', easyrtc.myEasyrtcid);
						}
						scope.bubble.enterRoom(scope);
						
					} catch(err){
						console.log("error logging user", user);
					}
				};
				$timeout(callTimeout);
			}();
			/**************** CLICK EVENTS ********************/
			element.bind('mouseover', function(){
				scope.$apply(function(){
					if(scope.bubble.shouldFloat){
						// conditional prevents mouseover from firing multiple times
						scope.bubble.haltFloat(true);
											}
				});
			}).bind('mouseleave', function(){
				
				
				scope.$apply(function(){
					if(!scope.bubble.shouldFloat && !isDragging){
						if(scope.peer.callStatus == callStatus.NONE){
							scope.bubble.haltFloat(false);								
						}
					}
				});

			}).bind('mousedown', function(){
				scope.$apply(function(){
					callEvent = true;
				});
			
			}).bind('mouseup', function(){
				// no apply wrap needed here as toggleTransmition will end with apply
				if(callEvent){
					performCall();
				} else if(selectEvent){

				}
				callEvent = selectEvent = false;
			});
			/**************** ANGULAR EVENTS ******************/
			scope.$on('$destroy', function(){
				scope.bubble.resetAnimationQueue();
				scope.bubble.collapse();
				scope.bubble.playAnimationQueue();
				$(statusIndicator).draggable('destroy');
			});
			scope.$on(scope.peer.id+'newSnapshot', function(e, snapShot){
				scope.snapshots.push(snapShot);
			});
			scope.$on(scope.peer.id+'streamAccepted', function(e, stream){
				// scope.$apply(function(){
					// turn off their audio stream
			    var remoteAudioStream = stream.getAudioTracks()[0];
			    remoteAudioStream.enabled = false;
			    // turn off their video stream
			    var remoteVideoStream = stream.getVideoTracks()[0];
			    remoteVideoStream.enabled = false;
			    easyrtc.setVideoObjectSrc($video[0], stream);
			  // });
			});
			scope.$on(scope.peer.id+'streamClosed', function(){
				// apply will show error, on the person closing the stream, just ignore
				// scope.$apply(function(){
			    scope.peer.callStatus = callStatus.NONE;
			    scope.peer.evalCallState(scope);
			    easyrtc.setVideoObjectSrc($video[0], "");
				// });
			});
			scope.$on(scope.peer.id+"newCallState", function(e, animation){
				//evalCallState should be wrapped by $apply already
				scope.bubble.resetAnimationQueue();
				if(animation == "none"){
					// remove animations then unpin
					scope.bubble.addToAnimationQueue(animation);
					// halt float inside togglePin as a callback
					scope.bubble.togglePin(false, scope);	
				} else {
					// stop floating, pin, then display animation
					if(scope.bubble.shouldFloat){
						scope.bubble.haltFloat(true);
					}
					scope.bubble.togglePin(true);
					if(animation != "twoway"){
						// if animation not two way, must reset to original bubble shape
						scope.bubble.addToAnimationQueue();
					}
					scope.bubble.addToAnimationQueue(animation);
				}
				scope.bubble.playAnimationQueue();
			});
			scope.$on(scope.peer.id+"leaveRoom", function(){
				// TODO: animates bubble collapse right before DOM is removed
				var removeCallback = function(){
					// scope.$apply(function(){
					NetworkData.removePeer(scope.peer.id);
					// });
				};
				scope.bubble.resetAnimationQueue();
				scope.bubble.collapse(removeCallback);
				scope.bubble.playAnimationQueue();
			});
			/***************** FAUX BUBBLE LISTENERS *****************/
			// faux bubble listeners should have $apply wrapped in binding directive
			scope.$on(scope.peer.id+"pinBubble", function(){
				if(!scope.bubble.pinned){
					if(scope.bubble.shouldFloat){
						// conditional prevents mouseover from firing multiple times
						scope.bubble.haltFloat(true);
					}
					scope.bubble.resetAnimationQueue();
					scope.bubble.togglePin(true);
					scope.bubble.playAnimationQueue();
				}
			});
			scope.$on(scope.peer.id+"unpinBubble", function(){
				// only unpin if there is no call going on
				if(scope.bubble.pinned && 
					scope.peer.callStatus == callStatus.NONE){
					scope.bubble.resetAnimationQueue();
					scope.bubble.togglePin(false, scope);
					scope.bubble.playAnimationQueue();
				}
			});
			scope.$on(scope.peer.id+"performCall", function(){
				performCall();
			});
			scope.$on(scope.peer.id+"forceCall", function(e, turnOn){
				scope.peer.toggleTransmition(turnOn, scope);
			});
		},
		controller: function($scope){
			
		}
	};
}])
.directive('fadeSnapshot', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
    	var animationComplete = function(){
      	scope.$apply(function(){
      	// 	//pop off
	      	if(scope.snapshots.length > 1){
	      			scope.snapshots.shift();
	      	}
      	});
      	// scope.$emit('snapshotLoaded');
      };
      TweenMax.to(element,2, {opacity:1, ease: Power3.easeIn, onComplete:animationComplete});
    }
  } 
});