// centers objectToCenter within containerElement, passed in as jQuery objects
// centerWidth and centerHeight are boolean flags to choose what to center
// objects must be positioned relative or absolute
function centerInElement(containerElement,objectToCenter, centerWidth, centerHeight) {
  var startingPointX = containerElement.innerWidth()/2;
  var startingPointY = containerElement.innerHeight()/2;
  var offsetX = -1*(objectToCenter.innerWidth()/2);
  var offsetY = -1*(objectToCenter.innerHeight()/2);
  var left = startingPointX + offsetX;
  var top = startingPointY + offsetY;

  if(centerHeight && centerWidth){
    objectToCenter.css({
      "left" : left,
      "top" : top
    });
  } else if(centerWidth) {
    objectToCenter.css({
      "left" : left
    });
  } else {
    objectToCenter.css({
      "top" : top
    });
  }
}


// retrieves all css attributes
// http://stackoverflow.com/questions/754607/can-jquery-get-all-css-styles-associated-with-an-element
function css(a) {
    var sheets = document.styleSheets, o = {};
    for (var i in sheets) {
        var rules = sheets[i].rules || sheets[i].cssRules;
        for (var r in rules) {
            if (a.is(rules[r].selectorText)) {
                o = $.extend(o, css2json(rules[r].style), css2json(a.attr('style')));
            }
        }
    }
    return o;
}

function css2json(css) {
    var s = {};
    if (!css) return s;
    if (css instanceof CSSStyleDeclaration) {
        for (var i in css) {
            if ((css[i]).toLowerCase) {
                s[(css[i]).toLowerCase()] = (css[css[i]]);
            }
        }
    } else if (typeof css == "string") {
        css = css.split("; ");
        for (var i in css) {
            var l = css[i].split(": ");
            s[l[0].toLowerCase()] = (l[1]);
        }
    }
    return s;
}