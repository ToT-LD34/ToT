"use strict";

// Constants and DOM Elements //////////////////////////////////////////

var RATIO = 4/3;
var MAX_WIDTH = 1080;
var MAX_HEIGHT = 720;

var EARTH_RADIUS = 230;
var EARTH_OFFSET = 180;

var ROTATION_SPEED = 0.5; // rad/s

var EARTH_SRC = "assets/earth.png";
var SKY_SRC =   "assets/sky.png";
var SUN_SRC =   "assets/sun.png";

var SUN_X = 0.80;
var SUN_Y = 0.06;
var SUN_SIZE = 0.4;

var N_TREES = 6;

var TREE_SRCS = [
  "assets/arbre01.png",
  "assets/arbre02.png",
  "assets/arbre03.png"
];

var $earthImg, $skyImg, $sunImg;

var $canvas = document.getElementById("game");

var $skyCanvas = document.createElement("canvas");
$canvas.parentNode.insertBefore($skyCanvas, $canvas);
$skyCanvas.style.position = "absolute";
$skyCanvas.style.zIndex = "-1";

var $earthCanvas = document.createElement("canvas");
$earthCanvas.width = 4*EARTH_RADIUS;
$earthCanvas.height = 2*EARTH_RADIUS;
$earthCanvas.getContext("2d").translate(2*EARTH_RADIUS, 2*EARTH_RADIUS);

var $stopButton = document.getElementById("stop-button");
var $debugButton = document.getElementById("debug-button");

// Window Size Management //////////////////////////////////////////////

function resizeGame() {
  var w = window.innerWidth;
  if (w < MAX_WIDTH) {
    $canvas.width = w;
    $canvas.height = Math.floor(w / RATIO);
  } else {
    $canvas.width = MAX_WIDTH;
    $canvas.height = MAX_HEIGHT;
  }
  resizeSky();
}

function resizeSky() {
  if ($skyImg.width) {
    $skyCanvas.width = $canvas.width;
    $skyCanvas.height = $canvas.height;
    $skyCanvas.style.left = $canvas.offsetLeft + "px";
    $skyCanvas.style.top = $canvas.offsetTop + "px";

    var skyCx = $skyCanvas.getContext("2d");
    skyCx.drawImage($skyImg,
      ($canvas.width - $skyImg.width) / 2,
      ($canvas.height - $skyImg.height + EARTH_RADIUS - EARTH_OFFSET)
    );

    if ($sunImg.width) {
      skyCx.drawImage($sunImg,
        $canvas.width * SUN_X - $sunImg.width * SUN_SIZE/2,
        $canvas.height * SUN_Y - $sunImg.height * SUN_SIZE/2,
        $sunImg.width * SUN_SIZE,
        $sunImg.height * SUN_SIZE
      );
    }
  }
}

(function () {
  var throttleTimer;
  window.addEventListener("resize", function (event) {
    clearTimeout(throttleTimer);
    throttleTimer = setTimeout(resizeGame, 100);
  });
}());

// Asset Loading ///////////////////////////////////////////////////////

var LoadAsset = (function () {
  var assetsCount = 0;
  var loadedAssets = 0;
  var loadingAssets = 0;

  return {
    img: function loadImg(src, callback) {
      assetsCount++;
      loadingAssets++;

      var $img = document.createElement("img");
      $img.addEventListener("error", function () {
        loadingAssets--;
        console.warn("image not loaded: " + src);
      });
      $img.addEventListener("load", function (event) {
        loadingAssets--;
        loadedAssets++;
        if (callback) callback.call(this, event);

        if (!loadingAssets && (loadedAssets === assetsCount)) {
          console.log("firing allAssetsLoaded event");
          document.dispatchEvent(new CustomEvent("allAssetsLoaded"));
        }
      });
      $img.src = src;
      return $img;
    }
  };
}());

$skyImg = LoadAsset.img(SKY_SRC);
$sunImg = LoadAsset.img(SUN_SRC);
$earthImg = LoadAsset.img(EARTH_SRC);

for (var i = 0; i < TREE_SRCS.length; i++) {
  LoadAsset.img(TREE_SRCS[i], function () {
    new TreeAsset(this.src);
  });
}

// Tree Pre-rendering //////////////////////////////////////////////////

function TreeAsset(src) {
  if (!(this instanceof TreeAsset)) return new TreeAsset(src);

  this.src = src;
  this.$img = document.createElement("img");
  this.$img.src = src;
  this.$canvas = document.createElement("canvas");
  this.ratio = this.$img.width / this.$img.height;
  this.plant();
  TreeAsset.instances.push(this);
}

TreeAsset.prototype = {
  $img: null,
  $canvas: null,
  src: "",
  ratio: 0,

  plant: function plant() {
    this.$canvas.width = EARTH_RADIUS * this.ratio;
    this.$canvas.height = EARTH_RADIUS;
    var cx = this.$canvas.getContext("2d");
    cx.drawImage(
      this.$img,
      0, 0,
      EARTH_RADIUS * this.ratio, EARTH_RADIUS
    );
    if (debug) {
      cx.strokeStyle = "black";
      cx.strokeRect(0, 0, this.$canvas.width, this.$canvas.height);
    }
  }
};

TreeAsset.instances = [];

// Drawing /////////////////////////////////////////////////////////////

function draw(time) {
  var cx = $canvas.getContext("2d");
  var w = $canvas.width;
  var h = $canvas.height;

  cx.clearRect(0, 0, w, h);
  drawEarth(cx, w, h, time);
}

var drawEarth = (function () {
  var time0;

  return function drawEarth(cx, w, h, time) {
    var ecx = $earthCanvas.getContext("2d");
    ecx.clearRect(
      -2*EARTH_RADIUS, -2*EARTH_RADIUS,
      4*EARTH_RADIUS, 4*EARTH_RADIUS
    );

    ecx.save();

    if (!time0) time0 = time;
    var rotation = -ROTATION_SPEED * (time - time0) / 1000;
    ecx.rotate(rotation);
    ecx.translate(-2*EARTH_RADIUS, -2*EARTH_RADIUS);

    ecx.drawImage(
      $earthImg,
      EARTH_RADIUS, EARTH_RADIUS,
      2*EARTH_RADIUS, 2*EARTH_RADIUS
    );

    // control rectangles
    if (debug) {
      ecx.strokeStyle = "magenta";
      ecx.strokeRect(
        0, 0,
        4*EARTH_RADIUS, 4*EARTH_RADIUS
      );

      ecx.strokeStyle = "cyan";
      ecx.strokeRect(
        EARTH_RADIUS, EARTH_RADIUS,
        2*EARTH_RADIUS, 2*EARTH_RADIUS
      );

      cx.strokeStyle = "lime";
      cx.lineWidth = 2;
      cx.setLineDash([8, 9]);
      cx.strokeRect(
        w/2 - 2*EARTH_RADIUS,
        h - EARTH_OFFSET - EARTH_RADIUS,
        4*EARTH_RADIUS,
        4*EARTH_RADIUS
      );
    }

    for (var i = N_TREES; i--; ) {
      drawTree(LogicTree.instances[i], ecx);
    }

    ecx.restore();

    cx.drawImage($earthCanvas,
      w/2 - 2*EARTH_RADIUS,
      h - EARTH_OFFSET - EARTH_RADIUS);
  };
}());

function drawTree(tree, ecx) {
  var x = EARTH_RADIUS * (2 + Math.cos(tree.angle)) - tree.$canvas.width / 2;
  var y = EARTH_RADIUS * (2 - Math.sin(tree.angle)) - tree.$canvas.height / 2;
  ecx.drawImage(tree.$canvas, x, y);

  if (debug) {
    ecx.strokeStyle = "yellow";
    ecx.strokeRect(x, y, tree.$canvas.width, tree.$canvas.height);
    ecx.strokeRect(x, y, 16, 1);
    ecx.strokeRect(x, y, 1, 16);
  }
}

// Main Loop ///////////////////////////////////////////////////////////

var mainLoop = (function() {
  var rafId;

  if ($stopButton) $stopButton.addEventListener("click", function () {
    if ("Stop" === this.textContent) {
      cancelAnimationFrame(rafId);
      this.textContent = "Resume";
    } else {
      rafId = requestAnimationFrame(mainLoop);
      this.textContent = "Stop";
    }
  });

  return function mainLoop() {
    rafId = requestAnimationFrame(mainLoop);
    var time = Date.now();
    logic(time);
    draw(time);
  };
}());

document.addEventListener("allAssetsLoaded", function () {
  // plants all trees
  for (var i = N_TREES; i--; ) {
    var angle = 2*Math.PI * i / N_TREES;
    var asset = TreeAsset.instances[
      Math.floor(Math.random() * TreeAsset.instances.length)
    ];
    new LogicTree(angle, asset);
  }

  // lanches the game
  resizeGame();
  mainLoop();
});

// Game Logic //////////////////////////////////////////////////////////

var logicTrees = [];
function LogicTree(angle, asset) {
  console.log("constructing new LogicTree", angle, asset);

  if (!(this instanceof LogicTree)) return new LogicTree(angle, asset);

  this.angle = angle;
  this.$canvas = document.createElement("canvas");
  this.health = 50;

  if (asset) this.replaceAsset(asset);

  // debug
  if (debug) {
    this.$canvas.style.outline = "dashed thin yellow";
    document.body.appendChild(this.$canvas);
  }

  LogicTree.instances.push(this);
}

LogicTree.prototype = {
  angle: 0,
  health: 50,
  $canvas: null,
  asset: null,

  replaceAsset: function replaceAsset(asset) {
    var w = asset.$canvas.width;
    var h = asset.$canvas.height;
    var cx = this.$canvas.getContext("2d");
    this.$canvas.width = w;
    this.$canvas.height = h;
    cx.translate(w / 2, h / 2);
    cx.rotate(Math.PI/2 - this.angle);
    cx.translate(-w / 2, -h / 2);
    cx.drawImage(asset.$canvas, 0, 0, w, h);
    this.asset = asset;
  }
};

LogicTree.instances = [];

function logic(time) {

}

// Debug ///////////////////////////////////////////////////////////////

// $canvas.parentNode.insertBefore($earthCanvas, $canvas.nextSibling);

var debug = true;
if ($debugButton) $debugButton.addEventListener("click", function () {
  debug = !debug;
});
console.log("script ended");
