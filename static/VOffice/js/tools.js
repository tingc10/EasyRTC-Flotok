/************************ GLOBAL ****************************/
var final_transcript = '';
var recognition;
var initRecognition = false;

// canvas globals
var mousedown = false;
var canvasTool = {
	ELLIPSE:0,
	BRUSH:1,
	LINE:2,
	ERASER:3,
	RECTANGLE:4
};
var currentTool = canvasTool.ELLIPSE;
/********************** VOICE METHODS ************************/
// initialize voice recognition function
function initVoiceRecognition(){
	if (!('webkitSpeechRecognition' in window)) {
	  alert("Speech recognition not supported, please use Google Chrome");
	  return;
	}	
	// Create  the webkitSpeechRecognition object which provides the speech interface 
	recognition = new webkitSpeechRecognition(); 
	// Ensure that the recogniser is listening continously, even if the user pauses (default value is false) 
	recognition.continuous = true; 
	// Return interim results that can change before it is finalized
	recognition.interimResults = true;
	
	recognition.onstart = function() { 
		// start event
		$("#dialogue").css({
			"margin-top" : "10px",
			"height" : "20%",
			"width"  : "40%",
			"opacity": "1"
		});
		
	};

	recognition.onresult = function(event) { 
		var interim_transcript = '';

		for (var i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal) {
				final_transcript += event.results[i][0].transcript;
			} else {
				interim_transcript += event.results[i][0].transcript;
			}
		}
		// final_transcript = capitalize(final_transcript);
		$("#interim-transcript").html(interim_transcript);
		$("#final-transcript").html(final_transcript);
		console.log("Interim Transcript:" + interim_transcript);
		console.log("Final Transcript:" + final_transcript);
		// final_span.innerHTML = linebreak(final_transcript);
		// interim_span.innerHTML = linebreak(interim_transcript);
	};

	recognition.onerror = function(event) { 
		// if error occurs
		console.log(event);
	};

	recognition.onend = function() { 
		console.log("voice recognition has ended");
		final_transcript = '';

	};
}

/********************** WHITE BOARD ***************************/
// Creates canvas 320 × 200 at the top left corner with ID "whiteboard"
var canvasWidth = 800,
	canvasHeight = 600;
var paper = Raphael("whiteboard", canvasWidth, canvasHeight);
// fill background of new canvas
var background = paper.rect(0,0, canvasWidth, canvasHeight);
background.attr("fill", "#FFFFFF");




/********************* EVENT HANDLERS *************************/
$("#dialogue .fa").click(function(){
	$("#dialogue").css({
		"margin-bottom" : "10%",
		"margin-left" : "40%",
		"height" : "0",
		"width"  : "0",
		"opacity": "0"
	});
	recognition.stop();
});

$("#tool-container .border .fa-quote-right").click(function(){
	if(!initRecognition){
		initVoiceRecognition();
	}
	recognition.start();
});

// // returns the mouse position relative to the canvas
// $("svg").mousemove(function(event){
// 	var pos = positionInElement($(this).offset(), event.pageX, event.pageY);
// 	console.log(pos.x,pos.y);
// });

var startPosition;
var currentObject;
var strokeColor;
var fillColor;
$("svg").mousedown(function(event){
	mousedown = true;
	startPosition = positionInElement($(this).offset(), event.pageX, event.pageY);
	initElement(event);
}).mousemove(function(event){
	if(mousedown){
		var currentPosition = positionInElement($(this).offset(), event.pageX, event.pageY);
		transformShape(currentPosition, event);
	}
}).mouseup(function(event){
	// get element ID from server, then broadcast the object
	getElementID();
});

$(document).mouseup(function(event){
	mousedown = false;
	

});

$('#whiteboard .options .option-container').click(function(event){
	// change current tool to draw circle
	if($(this).children(".fa-circle-thin").length > 0){
		currentTool = canvasTool.ELLIPSE;
	}
	if($(this).children(".fa-square-o").length > 0){
		currentTool = canvasTool.RECTANGLE;
	}
	if($(this).children(".fa-paint-brush").length > 0){
		currentTool = canvasTool.BRUSH;
	}
});

/********************** CANVAS HELPER ******************************/
// returns coordinates of mouse in element
// offset is jquery offset, pageX/Y is event object
function positionInElement(offset, pageX, pageY) {
	var position = {};
	position.x = pageX - offset.left;
	position.y = pageY - offset.top;
	return position;
}

// if shift keydown, shape height and width become the same
// if alt keydown, shape is drawn from the center outwards
function transformShape(currentPos, event){
	if(currentTool == canvasTool.ELLIPSE
		|| currentTool == canvasTool.RECTANGLE){
		var width = Math.abs(currentPos.x - startPosition.x);
		var height = Math.abs(currentPos.y - startPosition.y);
		var tmpStartPos = {
			x : startPosition.x,
			y : startPosition.y

		};

		// allow Raphael to draw properly when current postion is less than start position
		if(currentPos.x < startPosition.x){
			tmpStartPos.x = event.altKey ? currentPos.x + width : currentPos.x;
		}
		if(currentPos.y < startPosition.y){
			tmpStartPos.y = event.altKey ? currentPos.y + height : currentPos.y;

		}
		var originX = tmpStartPos.x + (width/2);
		var originY = tmpStartPos.y + (height/2);
		if(event.shiftKey) {
			if(width > height){
				height = width;
				
			} else {
				width = height;

			}
		}
	}
	switch(currentTool){
		case canvasTool.ELLIPSE:
			currentObject.attr({
				rx : event.altKey ? width : width/2,
				ry : event.altKey ? height : height/2,
				cx : event.altKey ? tmpStartPos.x : originX,
				cy : event.altKey ? tmpStartPos.y : originY
			});
			break;
		case canvasTool.RECTANGLE:
			currentObject.attr({
				width : width,
				height : height,
				x : tmpStartPos.x,
				y : tmpStartPos.y
			});
			break;
		case canvasTool.BRUSH:
			var pathArray = currentObject.attr("path");
			var stringPath;
			if(event.shiftKey){
				pathArray[pathArray.length - 1][1] = currentPos.x;
				pathArray[pathArray.length - 1][2] = currentPos.y;
				stringPath = pathArray.toString();
			} else {
				stringPath = pathArray.toString();
				stringPath = stringPath + "M" + pathArray[pathArray.length - 1][1]
							+ "," + pathArray[pathArray.length - 1][2] + "L"
							+ currentPos.x + "," + currentPos.y;

			}
			currentObject.attr("path", stringPath);

	}
	
}

function initElement(event){
	switch(currentTool){
		case canvasTool.ELLIPSE:
			currentObject = paper.ellipse(startPosition.x,startPosition.y,0,0);
			break;
		case canvasTool.RECTANGLE:
			currentObject = paper.rect(startPosition.x,startPosition.y,0,0);
			break;
		case canvasTool.BRUSH:
			var pathString
			
			if(currentObject && currentObject.node.nodeName == "path" && event.shiftKey){
				var pathArray = currentObject.attr("path");
				pathString = pathArray.toString();
				pathString = pathString + "M" + pathArray[pathArray.length - 1][1]
							+ "," + pathArray[pathArray.length - 1][2] + "L"
							+ startPosition.x + "," + startPosition.y;
				currentObject.attr("path", pathString);
			} else {
				pathString = "M" + startPosition.x + "," + startPosition.y 
					+ "L" + startPosition.x + "," + startPosition.y;
				currentObject = paper.path(pathString);
			}
			break;
	}
	currentObject.attr({
		"fill" : fillColor,
		"stroke" : strokeColor,
		"stroke-width" : 5,
		"stroke-linecap" : "round"
	});
}

function elementToJSON(element){
	var obj = element.attrs;
	obj.type = element.type;
	return obj;
}

function addToCanvas(elementObj, id, canvasID){
	if(canvasID == "whiteboard"){
		insertElementWithID(elementObj, id, paper);
	}
}

function insertElementWithID(elementObj, id, canvas){
	var topElement = canvas.top;
	// make sure top element if smaller than the element to be inserted
	console.log("inserting element with id", id);
	while(topElement != null && topElement.id > id){
		topElement = topElement.prev;
	}

	var elementArray = [];
	elementArray.push(elementObj);
	var elementSet = canvas.add(elementArray);
	
	topElement.insertBefore(elementSet[0]);
	// set the assigned id for the element
	var tmpElement = paper.getById(elementSet[0].id);
	tmpElement.id = id;

}

/***************** MISC HELPER **********************/
function broadcastObject(obj, messageType){
	var dest = { targetRoom : "default" };
	easyrtc.sendPeerMessage(dest, messageType, obj,
		function(msgType, msgBody){ // success callback
		  // console.log("sent " + msgType);
		  if(messageType == "newSnapshot") {
		  	// console.log("snapshot broadcasted");
		  } else if(messageType == "drawElement") {
		  	// console.log("canvas element drawn");
		  }
		},
		function(errorCode, errorText){ // error callback
		  console.log("error was " + errorText);
		}
	);
}