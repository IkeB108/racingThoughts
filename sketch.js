document.addEventListener("visibilitychange", function() {
    if (document.hidden){
        windowHidden = true;
        if(myLoader.complete && !isFirstTap){
          let currentSound = window["sound_" + imageNames[currentImageIndex] ]
          setVolume(currentSound, 0);
        }
    } else {
        windowHidden = false;
        if(myLoader.complete && !isFirstTap){
          let currentSound = window["sound_" + imageNames[currentImageIndex] ]
          setVolume(currentSound, soundVol);
        }
    }
});

function setup(){
  icursor = new ImprovedCursor({
    minAspectRatio: 3/2,
    maxAspectRatio: 3/1,
  })
  
  filesToLoad = {
    comm64: "comm64.json",
    title1: "title1.png",
    title2: "title2.png",
    tapAndHold1: "tapAndHold1.png",
    tapAndHold2: "tapAndHold2.png",
  }
  
  soundTypewriter = document.getElementById("typewriter");
  
  windowHidden = false;
  
  imagesList = `parkingGarage.png
parkingGarage2.png
textbook.jpg
street.jpg
park.jpg
nextToTrain.jpg
train.jpg
sunset.png
backyard.jpg`.split("\n")


  imageNames = []
  
  stopSound = function(soundObject){
    soundObject.pause();
    soundObject.currentTime = 0;
  }
  
  setVolume = function(soundObject, newVolume){
    soundObject.volume = newVolume
  }
  
  for(let i in imagesList){
    let n = imagesList[i].split(".")
    n = n[0];
    window["sound_" + n] = document.getElementById(n);
    filesToLoad["image_" + n] = "assets/" + imagesList[i]; 
    imageNames.push(n)
  }
  
  myLoader = new FileLoader( filesToLoad, window, true )
  
  document.body.style.backgroundColor = "black"
  
  imageMode(CENTER);
  rectMode(CENTER);
  textAlign(CENTER,CENTER);
  
  textGraphicCount = 0;
  
  thoughts = `I wish I had more free time, but I never make it a priority
I wish it was easier to feel grounded in the present
I wish I would spend less time on social media
I wish I was better at remembering important things
How do you distinguish good reasons from poor excuses?
Am I bad at managing my time? Am I procrastinating without realizing it?
Half the time I feel that I'm too ambitious and half the time that I'm not ambitious enough
Sometimes it feels like time is constantly slipping through my fingers
I won't again have the opportunity to relive my life the way it is right now, on this day, or month, or year
I should talk to my friends
I should remember to write that down
I should do my homework later today
I should cook better food for myself
I should definitely have a topic for my essay by now
If you try to be the best at everything, you will fail to be good at anything
Sometimes I am not fair or forgiving to myself or to others.
Do I have employable skills? How do I know if a career plan is realistic?
What if I'm not able to find a job that's right for me?
Maybe I am spending too much time by myself
Somehow there is never enough time to do the things I am passionate about
There's nothing more frustrating than someone who is confidently wrong
It's impossible to know whether you are making the best use of your time
How much time do I spend every day wishing I were doing something else?
We don't live in a world that is built for living our best life
Maybe seeing the bigger picture is the cure to anger and stress
Why am I so bad at building new habits?
Even simple habits are so hard to keep
Why should I expect to succeed today if I've failed every day for the last month?`
  thoughts = thoughts.split("\n")
  
  isFirstTap = true;
  openSpots = getOpenSpots();
  
  whiteNoiseAlpha = 0;
  
  xoffset = 0;
  yoffset = 0;
  thoughtOffset = 0;
  pwni = null;
  
  noiseVolume = 0;
  
  currentImageIndex = 0;
  
  maxSoundVol = 1;
  soundVol = maxSoundVol;
  
  textIsNew = true;
  framesTilSoundCheck = 5;
  
  userHasTriedHolding = false;
  
  // blendMode(DIFFERENCE)
}

function onLoadComplete(){
  textRenderer = new TileRenderer(comm64, 8)
  textRenderer.alphabet = "Commodore 64"
  
  allTextGraphic = createGraphics(width, height);
  allTextGraphic.noSmooth();
  
  whiteNoiseGraphics = [];
  whiteNoiseGraphicsCount = 20;
  for(let i = 0; i < whiteNoiseGraphicsCount; i ++){
    let w = constrain(width, 0, 700)
    let h = constrain(height, 0, 700)
    let g = createGraphics(w, h);
    g.background(0);
    g.loadPixels();
    for(let j = 0; j < g.pixels.length; j += 4){
      let r = round(random(200));
      g.pixels[j] = r;
      g.pixels[j+1] = r;
      g.pixels[j+2] = r;
    }
    g.updatePixels();
    whiteNoiseGraphics.push(g);
  }
  
  setVolume(soundTypewriter, 0.6)
}

function draw(){
  //Remember to use if(myLoader.complete)
  clear();
  background(0);
  
  icursor.update();
  // icursor.render();
  
  if(!myLoader.complete){
    fill(255); textSize(30);
    let loadingProgress = "(" + myLoader.progress + "/" + myLoader.completion + ")\n(Turn on your sound)"
    text("Loading\nRestlessness...\n" + loadingProgress, width/2, height/2)
  }
  
  if(myLoader.complete){
    let titleimg = null;
    if(frameCount % 30 < 15)titleimg = title1;
    else titleimg = title2;
    let w = width;
    let h = titleimg.height * (w/titleimg.width)
    noSmooth();
    image(titleimg, width/2, height/2, w, h)
  }
  
  if(myLoader.complete && !isFirstTap){
    // textRenderer.setGraphicsToUnused();
    smooth();
    
    
    let currentImage = window["image_" + imageNames[currentImageIndex] ]
    let currentSound = window["sound_" + imageNames[currentImageIndex] ]
    if(currentSound.paused && framesTilSoundCheck <= 0){
      currentImageIndex = (currentImageIndex + 1) % imageNames.length
      currentImage = window["image_" + imageNames[currentImageIndex] ]
      currentSound = window["sound_" + imageNames[currentImageIndex] ]
      currentSound.play();
      framesTilSoundCheck = 10;
    }
    framesTilSoundCheck --;
    
    
    
    if( currentImage.width/currentImage.height > width/height ){
      //image is too wide
      //fit to height
      let h = height;
      let w = currentImage.width * (h/currentImage.height)
      image(currentImage, width/2, height/2, w, h)
    } else {
      let w = width;
      let h = currentImage.height * (w/currentImage.width)
      image(currentImage, width/2, height/2, w, h)
    }
    
    if(!userHasTriedHolding){
      let tapImg = null;
      if(frameCount % 30 < 15)tapImg = tapAndHold1;
      else tapImg = tapAndHold2;
      let w = width/2;
      let h = tapImg.height * (w/tapImg.width)
      image(tapImg, width/2, height/2, w, h)
    }
    
    if(icursor.leftPressed){
      
      displayWhiteNoise();
      
      image(allTextGraphic, width/2, height/2)
      updateText();

      soundVol -= 0.002;
      if(soundVol < 0)soundVol = 0;
      setVolume(currentSound, soundVol);

    } else {
      textGraphicCount = 0;
    }
    
    // textRenderer.deleteUnusedGraphics();
  }
  
}

function cursorPressStart( buttonPressed ){
  
  if(buttonPressed == "left" && myLoader.complete){
    thoughtOffset = floor(random(100))
    noiseVolume = 0;
    
    allTextGraphic = createGraphics(width, height);
    allTextGraphic.noSmooth();
    openSpots = getOpenSpots();
    textSizeMultiplier = width * 0.0025;
    textIsNew = true;
    
    if(!isFirstTap)userHasTriedHolding = true;
    if(isFirstTap){
      let currentSound = window["sound_" + imageNames[currentImageIndex] ]
      currentSound.play();
    }
  }
  
}

function cursorPressEnd( buttonPressed ){
  if(buttonPressed == 'left' && myLoader.complete){
    if(isFirstTap)isFirstTap = false;
    textGraphicCount = 0;
    
    whiteNoiseAlpha = 0;
    xoffset = 0;
    yoffset = 0;
    allTextGraphic.clear();
    for(let i in textRenderer.graphics){
      textRenderer.deleteGraphic(i)
    }
    stopSound(soundTypewriter);
    soundVol = maxSoundVol;
    let  currentSound = window["sound_" + imageNames[currentImageIndex] ]
    setVolume(currentSound, soundVol);
  }
}

function updateText(){
  allTextGraphic.clear();
  
  for(let i in textRenderer.graphics){
    let g = textRenderer.graphics[i];
    
    if(frameCount%4 == 0)g.update();
    
    let gw = round(g.width * textSizeMultiplier);
    let gh = round(g.height * textSizeMultiplier);
    allTextGraphic.image(g, g.xpos, g.ypos, gw, gh);
  }
  
  if(soundTypewriter.paused)soundTypewriter.play();
  
  if(frameCount % 40 == 0 || textIsNew){
    textIsNew = false;
    let t = thoughts[ (textGraphicCount+thoughtOffset) % thoughts.length].toLowerCase();
    t = t.padEnd( t.length + textGraphicCount, " " )
    let g = textRenderer.getTextGraphic(t, {
      textColor: 1,
      widthInCharacters: 20,
      tilesPerFrame: 1,
    } )
    if(openSpots.length == 0){
      openSpots = getOpenSpots();
      xoffset += round(width/20)
      yoffset += round(width/20)
      console.log("refilled open spots")
    }
    let chosenSpotIndex = floor(random(openSpots.length))
    g.xpos = openSpots[chosenSpotIndex].x + xoffset;
    g.ypos = openSpots[chosenSpotIndex].y + yoffset;
    openSpots.splice(chosenSpotIndex, 1);
    textGraphicCount ++;
  }
  
  
}

function displayWhiteNoise(){
  push();
  
  whiteNoiseAlpha += 0.4;
  tint(255,whiteNoiseAlpha)
  
  let i = frameCount%(whiteNoiseGraphicsCount*6)
  i = floor(i/6);
  let wni = whiteNoiseGraphics[i];
  
  let w = width;
  let h = wni.height * (w/wni.width)
  image(wni, width/2, height/2, w, h)
  
  pop();
}

function getOpenSpots(){
  let ret = []
  for(let x = 0; x < 5; x ++){
    for(let y = 0; y < 5; y ++){
      ret.push( {x: round(x * (width/5)), y: round(y * (height/5))} )
    }
  }
  return ret;
}
