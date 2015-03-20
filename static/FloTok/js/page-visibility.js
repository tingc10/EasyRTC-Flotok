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
 

// // If the page is hidden, pause the video;
// // if the page is shown, play the video
// function handleVisibilityChange() {
//   if (document[hidden]) {
//     videoElement.pause();
//   } else {
//     videoElement.play();
//   }
// }
// 
// // Warn if the browser doesn't support addEventListener or the Page Visibility API
// if (typeof document.addEventListener === "undefined" || 
//   typeof document[hidden] === "undefined") {
//   alert("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
// } else {
//   // Handle page visibility change   
//   document.addEventListener(visibilityChange, handleVisibilityChange, false);
    
//   // Revert to the existing favicon for the site when the page is closed;
//   // otherwise the favicon remains paused.png
//   window.addEventListener("unload", function(){
//     favicon.change("/favicon.ico");
//   }, false);
// }