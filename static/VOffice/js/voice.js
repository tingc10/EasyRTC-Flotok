var final_transcript = '';
var recognition;
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
var initRecognition = false;

$("#tool-container .border .fa-quote-right").click(function(){
	if(!initRecognition){
		initVoiceRecognition();
	}
	recognition.start();
});

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