function ImprovedCursor( settingsObject ){
  let thisCopy = this;
  
  this.onMobile = false;
  
  this.x = null;
  this.y = null;
  this.pressed = false;
  this.leftPressed = false;
  this.rightPressed = false;
  this.middlePressed = false;
  this.previous = {
    x: this.x,
    y: this.y,
    pressed: this.pressed,
    leftPressed: this.leftPressed,
    middlePressed: this.middlePressed,
    rightPressed: this.rightPressed,
    time: millis(),
  }
  this.atPress = {
    x: this.x,
    y: this.y,
    time: millis(),
  }
  this.swipeVelocity = {x:0, y:0}
  let _timeOfLastSwipeUpdate = null;
  let _hasWarnedAboutSwipeUpdate = false;
  this.allCursors = [];
  
  this.settings = {
    logEvents: false,

    disableContextMenu: true,

    //With mobileFriendlyCanvas, the canvas will be centered on the document,
    //it will fill the screen (except for a margin),
    //and it will have an aspect ratio of your choosing.
    mobileFriendlyCanvas: true,
    marginInPixels: 20,
    minAspectRatio: 1/3, //width-to-height
    maxAspectRatio: 2/3, //width-to-height

    maxClickDistance: window.innerWidth/10,
    maxClickTime: 600, //milliseconds

    //How fast should the scroll velocity decelerate?
    //(velocity is multiplied by this number once per frame)
    swipeDeceleration: 0.9,

    //What button must be pressed (Left, Right, Middle, Any, None) to count as scrolling?
    swipeOnButton: "left",
    
    threeFingerConsole: false, //When true, triple tapping the screen will open a command dialogue window
  }
  
  //Change the default settings to any that are set by the user in settingsObject
  let this_settings_keys = Object.keys(this.settings)
  if(typeof settingsObject == "object"){
    for(let i in settingsObject){
    if(this_settings_keys.includes(i)){
      
      if(typeof settingsObject[i] !== typeof this.settings[i])
      console.warn("Warning: ImprovedCursor setting " + i + " should be of type " + typeof this.settings[i] + " instead of type " + typeof settingsObject[i])
      else {
        let isBetween = (n, a, b) => {return n >= a && n <= b}
        if(i == "swipeDeceleration" && !isBetween(settingsObject[i], 0, 1) )
        console.warn("Warning: ImprovedCursor setting swipeDeceleration should be a value between 0 and 1")
        if(i == "swipeOnButton" && !["left","right","middle","any","none"].includes(settingsObject[i]) )
        console.warn("Warning: ImprovedCursor setting swipeOnButton should contain one of the following: left, right, middle, any, none")
      }
      
      this.settings[i] = settingsObject[i];
      
    } else {
      let closestMatch = this_settings_keys.closestToString(i)
      console.warn(i + " is not an ImprovedCursor setting. Did you mean " + closestMatch + "?")
    }
  }
  } else if(typeof settingsObject !== "undefined") {
    console.warn("Warning: ImprovedCursor takes an object as a parameter for settings. You have passed it a(n) " + typeof settingsObject)
  }
  
  let _frameCount_at_last_updateSwipeVelocity = 0;
  let _have_warned_about_updateSwipeVelocity = false;
  let _time_of_last_touch_press_end = 0;
  let _max_fingers_before_released = 0; //Maximum number of fingers that were pressed before all fingers were released
  let _press_counts_as_click = false;
  
  //SET UP MOBILE FRIENDLY CANVAS IF NEEDED = = = = = = = = =
  const _resizeMobileFriendlyCanvas = function(){
    let h = windowHeight - (thisCopy.settings.marginInPixels * 2)
    let w = windowWidth - (thisCopy.settings.marginInPixels * 2)
    if(w/h <= thisCopy.settings.minAspectRatio)h = w * 1/(thisCopy.settings.minAspectRatio);
    if(w/h >= thisCopy.settings.maxAspectRatio)w = h * thisCopy.settings.maxAspectRatio;
    resizeCanvas(round(w),round(h))
  }
  
  const canvasIsOffCenter = () => {
    var c = canvas.getBoundingClientRect()
    var ret = 
    c.x <= 0 ||
    c.y <= 0 ||
    c.x + c.width >= window.innerWidth ||
    c.y + c.height >= window.innerHeight
    return (ret && !canvas.hidden);
  }
  
  let _userTappedOkToCallibrate = false;
  
  if(this.settings.mobileFriendlyCanvas){
    pixelDensity(1);
    _resizeMobileFriendlyCanvas();
    window.addEventListener("resize", _resizeMobileFriendlyCanvas)
    canvas.onselectstart = function() { return false }
    const checkForOffCenterCanvas = setInterval( () => {
      if( canvasIsOffCenter() && !_userTappedOkToCallibrate ){
        //Opening a dialogue window sometimes fixes the off center
        //canvas.
        let proceed = confirm("Tap OK to callibrate your screen.")
        _userTappedOkToCallibrate = true;
        setTimeout( ()=> {
          //If the dialogue window did not fix the off center canvas,
          //Refreshing the page likely will, so do that.
          if(canvasIsOffCenter())window.location.reload();
        }, 500)
        
      }
    }, 500)
    document.body.setAttribute('style', `
    -webkit-touch-callout:none;
    -webkit-user-select:none;
    -khtml-user-select:none;
    -moz-user-select:none;
    -ms-user-select:none;
    user-select:none;
    
    touch-action: none;
    margin: 0px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    `)
    document.documentElement.style.height = "100%";
    canvas.setAttribute('style', `vertical-align: top;`)
    let doc_meta = document.querySelector("meta")
    doc_meta.content = "user-scalable=no"
  }
  if(this.settings.disableContextMenu){
    window.addEventListener("contextmenu", event => {
      if(thisCopy.settings.logEvents) console.log("Prevented user from opening the context menu")
      event.preventDefault()
    })
  }
  if(this.settings.threeFingerConsole){
    let _handleError = function(evt) {
      if(thisCopy.onMobile){
        if (evt.message) { // Chrome sometimes provides this
          if( evt.filename.endsWith("js") || evt.filename == '' )
          alert("error: "+evt.message +" at linenumber: "+evt.lineno+" of file: "+evt.filename);
        } else {
          alert("error: "+evt.type+" from element: "+(evt.srcElement || evt.target));
        }
      }
    }
    window.addEventListener("error", _handleError, true);
  }
  
  //CREATE EVENT HANDLERS
  const _updateAllCursors = function(e){
    let canvasBounding = canvas.getBoundingClientRect();
    if(!thisCopy.onMobile){
      thisCopy.allCursors = [ {x: thisCopy.x, y: thisCopy.y, pressed: thisCopy.pressed} ]
    }
    if(thisCopy.onMobile){
      thisCopy.allCursors = [];
      for(var i = 0; i < e.touches.length; i ++){
        thisCopy.allCursors.push( {
          x: e.touches[i].clientX - canvasBounding.x,
          y: e.touches[i].clientY - canvasBounding.y,
          pressed: true
        } )
      }
    }
  }
  
  const _getMousePosFromEvent = function(e) {
    let canvasBounding = canvas.getBoundingClientRect();
    thisCopy.x = e.clientX - canvasBounding.x
    thisCopy.y = e.clientY - canvasBounding.y
    
    if(e.touches){ //This is a touch event, not a mouse event
      if(e.touches.length > 0){
        thisCopy.x = e.touches[0].clientX - canvasBounding.x;
        thisCopy.y = e.touches[0].clientY - canvasBounding.y;
      }
    }
    _updateAllCursors(e);
  }
  
  updateSwipeVelocity = function() { //Global function
    
  }
  
  this.update = function() {
    // UPDATE SWIPE VELOCITY
    thisCopy.swipeVelocity.x *= thisCopy.settings.swipeDeceleration
    thisCopy.swipeVelocity.y *= thisCopy.settings.swipeDeceleration
    if( Math.abs(thisCopy.swipeVelocity.x) < 0.01 ) thisCopy.swipeVelocity.x = 0;
    if( Math.abs(thisCopy.swipeVelocity.y) < 0.01 ) thisCopy.swipeVelocity.y = 0;
    
    let userIsSwiping = thisCopy[ thisCopy.settings.swipeOnButton + "Pressed" ] ||
    ( thisCopy.settings.swipeOnButton == "any" && thisCopy.pressed )
    if(userIsSwiping){
      thisCopy.swipeVelocity.x = thisCopy.x - thisCopy.previous.x
      thisCopy.swipeVelocity.y = thisCopy.y - thisCopy.previous.y
    }
    if(frameCount - _timeOfLastSwipeUpdate > 1 &&
       !_hasWarnedAboutSwipeUpdate &&
        _timeOfLastSwipeUpdate !== null){
      console.warn("Warning: It appears the update() method of your ImprovedCursor is not being called every frame. Be sure to put it in draw()")
      _hasWarnedAboutSwipeUpdate = true;
    }
    if(millis() - thisCopy.previous.time >= 4000/frameRate() && thisCopy.previous.pressed ){
      console.warn("It appears something (such as a dialogue box) is pausing the draw() loop. Ensure this does not happen while the cursor is pressed, or it will stay pressed.")
    }
    thisCopy.previous = {
      x: thisCopy.x,
      y: thisCopy.y,
      pressed: thisCopy.pressed,
      leftPressed: thisCopy.leftPressed,
      middlePressed: thisCopy.middlePressed,
      rightPressed: thisCopy.rightPressed,
      time: millis(),
    }
    _timeOfLastSwipeUpdate = frameCount;
  }
  
  const _getMouseButtonPressed = function(e, doNotUpdate){
    let buttonPressed = e.button //If the button pressed is not left, middle, or right (for special mice) just set it to the number that corresponds to this button
    if(e.button == 0){buttonPressed = "left"}
    if(e.button == 1){buttonPressed = "middle"}
    if(e.button == 2){buttonPressed = "right"}
    
    if(!doNotUpdate){
      if(e.button == 0){thisCopy.leftPressed = true}
      if(e.button == 1){thisCopy.middlePressed = true}
      if(e.button == 2){thisCopy.rightPressed = true}
      if(thisCopy.leftPressed || thisCopy.middlePressed || thisCopy.rightPressed)thisCopy.pressed = true;
      else thisCopy.pressed = false
    }
    return buttonPressed;
  }
  
  // CURSOR EVENTS (PC AND MOBILE) ----------------------------------------------------------------
  const _cursorPressStart = function(buttonPressed){
    thisCopy.swipeVelocity = {x:0, y:0}
    thisCopy.atPress = {
      x: thisCopy.x,
      y: thisCopy.y,
      pressed: thisCopy.pressed,
      leftPressed: thisCopy.leftPressed,
      middlePressed: thisCopy.middlePressed,
      rightPressed: thisCopy.rightPressed,
      time: millis(),
    }
    _press_counts_as_click = true; //true until proven otherwise
    if(typeof cursorPressStart !== "undefined")cursorPressStart(buttonPressed);
  }
  const _cursorPressEnd = function(buttonPressed){
    if(typeof cursorPressEnd !== "undefined")cursorPressEnd(buttonPressed);
    if(millis() - thisCopy.atPress.time >= thisCopy.settings.maxClickTime){
      _press_counts_as_click = false;
    }
    if(_press_counts_as_click) _cursorClick(buttonPressed);
  }
  const _cursorClick = function(buttonPressed){
    if(thisCopy.settings.logEvents) console.log("cursorClick button:" + buttonPressed + " x" + round(thisCopy.x) + " y" + round(thisCopy.y))
    if(typeof cursorClick !== "undefined")cursorClick(buttonPressed);
  }
  const _cursorMove = function(buttonPressed){
    if(thisCopy.pressed && dist(thisCopy.x, thisCopy.y, thisCopy.atPress.x, thisCopy.atPress.y) > thisCopy.settings.maxClickDistance ){
      _press_counts_as_click = false;
    }
    if(typeof cursorMove !== "undefined")cursorMove(buttonPressed);
  }
  // MOUSE EVENTS (PC ONLY) ----------------------------------------------------------------
  const _mousePressStart = function(e){
    if(!thisCopy.onMobile){
      _getMousePosFromEvent(e);
      let buttonPressed = _getMouseButtonPressed(e)
      if(thisCopy.settings.logEvents) console.log("mousePressStart button:" + buttonPressed + " x" + round(thisCopy.x) + " y" + round(thisCopy.y))
      _cursorPressStart(buttonPressed)
      if(typeof mousePressStart !== "undefined")mousePressStart(buttonPressed);
    }
    if(thisCopy.onMobile && millis() - _time_of_last_touch_press_end > 200){
      //For some inexplicable reason, _mousePressStart is triggered
      //by a mobile user *releasing* their finger if the tap is short and the 
      //cursor doesn't move. When this happens, _touchPressEnd is triggered right
      //before _mousePressStart.
      //So we only know that a user is no longer on mobile if significant
      //time has passed since _touchPressEnd was last triggered.
      
      thisCopy.onMobile = false;
    }
  }
  const _mousePressEnd = function(e){
    if(!thisCopy.onMobile){
      _getMousePosFromEvent(e);
      let buttonPressed = _getMouseButtonPressed(e, true);
      
      
      if(thisCopy.settings.logEvents)console.log("mousePressEnd button:" + buttonPressed + " x" + round(thisCopy.x) + " y" + round(thisCopy.y))
      if( thisCopy[buttonPressed + "Pressed"] == true ){
        thisCopy[buttonPressed + "Pressed"] = false
        _cursorPressEnd(buttonPressed)
        if(typeof mousePressEnd !== "undefined")mousePressEnd(buttonPressed);
      }
      
      if(thisCopy.leftPressed || thisCopy.middlePressed || thisCopy.rightPressed)thisCopy.pressed = true;
      else {thisCopy.pressed = false}
      
    }
  }
  const _mouseMove = function(e){
    if(!thisCopy.onMobile){
      _getMousePosFromEvent(e)
      _cursorMove();
      if(typeof mouseMove !== "undefined")mouseMove();
    }
  }
  // TOUCH EVENTS (MOBILE ONLY) ----------------------------------------------------------------
  const _touchPressStart = function(e){
    _getMousePosFromEvent(e);
    let buttonPressed = "left"
    thisCopy.leftPressed = true;
    thisCopy.pressed = true;
    
    if(thisCopy.allCursors.length > _max_fingers_before_released)
    _max_fingers_before_released = thisCopy.allCursors.length;
    
    thisCopy.onMobile = true;
    if(thisCopy.settings.logEvents)console.log("touchPressStart button:" + buttonPressed + " x" + round(thisCopy.x) + " y" + round(thisCopy.y))
    _cursorPressStart(buttonPressed)
    if(typeof touchPressStart !== "undefined")touchPressStart(buttonPressed);
    
  }
  const _touchPressEnd = function(e){
    _updateAllCursors(e); //Do not call _getMousePosFromEvent() here
    let buttonPressed = "left"
    
    if(thisCopy.settings.logEvents)console.log("touchPressEnd button:" + buttonPressed + " x" + round(thisCopy.x) + " y" + round(thisCopy.y))
    if(thisCopy.allCursors.length == 0){
      thisCopy.pressed = false;
      thisCopy.leftPressed = false;
      _cursorPressEnd(buttonPressed)
      if(typeof touchPressEnd !== "undefined")touchPressEnd(buttonPressed);
      if(thisCopy.settings.threeFingerConsole && _max_fingers_before_released >= 3){
        let output = '';
        let user_command = 'temporary'
        while(user_command !== null && user_command.length > 0){
          user_command = prompt(output + "\nEnter command:")
          output = eval(user_command);
        }
      }
      _time_of_last_touch_press_end = millis();
      _max_fingers_before_released = 0;
    }
  }
  const _touchMove = function(e){
    _getMousePosFromEvent(e);
    _cursorMove();
    if(typeof touchMove !== "undefined")touchMove();
  }
  
  window.addEventListener("mousedown", _mousePressStart)
  window.addEventListener("mouseup", _mousePressEnd)
  window.addEventListener("mousemove", _mouseMove)
  window.addEventListener("touchstart", _touchPressStart)
  window.addEventListener("touchend", _touchPressEnd)
  window.addEventListener("touchmove", _touchMove)
  
  /*canvas.onmouseout = () => {
    if(thisCopy.settings.logEvents) console.log("Cursor has left the canvas.")
    if(thisCopy.pressed){
      if(thisCopy.settings.logEvents) console.log("All button presses have been ended.")
      thisCopy.pressed = false;
      if(thisCopy.leftPressed){
        _cursorPressEnd("left")
        if(!thisCopy.onMobile && typeof mousePressEnd !== "undefined")mousePressEnd("left")
        if(thisCopy.onMobile && typeof touchPressEnd !== "undefined")touchPressEnd("left")
        thisCopy.leftPressed = false;
      }
      if(thisCopy.middlePressed){
        _cursorPressEnd("middle")
        if(!thisCopy.onMobile && typeof mousePressEnd !== "undefined")mousePressEnd("middle")
        if(thisCopy.onMobile && typeof touchPressEnd !== "undefined")touchPressEnd("middle")
        thisCopy.middlePressed = false;
      }
      if(thisCopy.rightPressed){
        _cursorPressEnd("right")
        if(!thisCopy.onMobile && typeof mousePressEnd !== "undefined")mousePressEnd("right")
        if(thisCopy.onMobile && typeof touchPressEnd !== "undefined")touchPressEnd("right")
        thisCopy.rightPressed = false;
      }
    }
  }*/
  
  //RENDER
  this.render = function(){
    push();
    background(0, 200)
    fill(255); noStroke();
    textSize(width/30);
    let st = 'Improved Cursor:\n= = = = = = = = =\n'
    st += "x" + round(thisCopy.x) + " y" + round(thisCopy.y) + "\n"
    st += "pressed: " + thisCopy.pressed + "\n"
    st += "leftPressed: " + thisCopy.leftPressed + "\n"
    st += "middlePressed: " + thisCopy.middlePressed + "\n"
    st += "rightPressed: " + thisCopy.rightPressed + "\n"
    st += "atPress: x" + round(thisCopy.atPress.x) + " y" + round(thisCopy.atPress.y) + " time " + round(thisCopy.atPress.time) + "ms\n"
    st += "onMobile: " + thisCopy.onMobile + "\n"
    st += "swipeVelocity: x" + round(thisCopy.swipeVelocity.x) + " y" + round(thisCopy.swipeVelocity.y) + "\n"
    st += "allCursors.length: " + thisCopy.allCursors.length + "\n"
    text(st, width/10, width/10)
    
    //Draw virtual mouse
    let w = width/4;
    let x = width - w;
    let y = 0;
    stroke(255); strokeWeight(5);
    noFill();
    rect(x, y, w, w)
    if(icursor.leftPressed)fill(color("green")); else noFill();
    rect(x, y, w/2, w/2)
    if(icursor.rightPressed)fill(color("red")); else noFill();
    rect(x + (w/2), y, w/2, w/2)
    if(icursor.middlePressed)fill(color("blue")); else fill(0);
    rect(x + (w/2.5), y + (w/2.5), w/6, w/6)
    
    //Draw all cursor positions
    
    let cursorColors = [
      color("white"),
      color("red"),
      color("yellow"),
      color("green"),
      color("blue"),
    ]
    
    for(i in thisCopy.allCursors){
      var col = cursorColors[i % cursorColors.length]
      var c = thisCopy.allCursors[i]
      fill(col); noStroke(); strokeWeight(10);
      let w = width/3
      ellipse(c.x, c.y, w)
      stroke(0); strokeWeight(5);
      line(c.x - w/4, c.y, c.x + w/4, c.y)
      line(c.x, c.y - w/4, c.x, c.y + w/4)
      
    }
    
    pop();
  }
}

// function renderP5Cursor(){
//   push();
// 
//   background(0,200)
//   let w = width/4;
//   let x = width - w;
//   let y = height-w;
//   stroke(255,255,0); strokeWeight(5);
//   noFill();
//   rect(x, y, w, w)
//   if(mouseIsPressed && mouseButton === LEFT)fill(color("green")); else noFill();
//   rect(x, y, w/2, w/2)
//   if(mouseIsPressed && mouseButton === RIGHT)fill(color("red")); else noFill();
//   rect(x + (w/2), y, w/2, w/2)
//   if(mouseIsPressed && mouseButton === CENTER)fill(color("blue")); else fill(0);
//   rect(x + (w/2.5), y + (w/2.5), w/6, w/6)
// 
//   let st = "P5 Cursor:\n= = = = = = = = = = = = =\n"
//   st += "x" + round(mouseX) + " y" + round(mouseY) + "\n"
//   st += "mouseIsPressed: " + mouseIsPressed + "\n"
//   st += "mouseButton: " + mouseButton + "\n"
//   st += "touches.length: " + touches.length + "\n"
//   noStroke(); fill(255,255,0)
//   textSize(width/30);
//   text(st, width/10, width/10)
// 
//   //Draw all touches
//   let cursorColors = [
//     color("yellow"),
//     color("yellow"),
//     color("red"),
//     color("green"),
//     color("blue"),
//   ]
//   let n_touches = [...touches]
//   n_touches.unshift( {x:mouseX, y:mouseY} )
//   for(i in n_touches){
//     var col = cursorColors[i % cursorColors.length]
//     var c = n_touches[i]
//     fill(col); noStroke(); strokeWeight(10);
//     let w = width/3
//     ellipse(c.x, c.y, w)
//     stroke(0); strokeWeight(5);
//     line(c.x - w/4, c.y, c.x + w/4, c.y)
//     line(c.x, c.y - w/4, c.x, c.y + w/4)
// 
//   }
// 
//   pop();
// }
