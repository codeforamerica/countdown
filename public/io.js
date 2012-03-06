/**
* @fileoverview Homepage experience animation functionality.
* This file includes all functionality to render the countdown
* clock, and ball physics. Depends on box2d libraries and base.js.
* @author mking@mking.me (Matt King)
*/

var totalDotCount = 0, dotThreshold = 150;
var iterations = 1, timeStep = 1 / 20, ground;
var world = createWorld();

/**
* Returns a random number between two numbers.
* @param {number} min Lowest number.
* @param {number} max Highest number.
* @return {number} Random number.
*/
function getRandom(min, max) {
  var randomNum = Math.random() * (max-min);
  return(Math.round(randomNum) + min);
}

/**
* Returns the top and left offset of a DOM node.
* @param {Object} obj DOM node
* @return {Array.<number>} left and top values of obj.
*/
var getPos = function(obj) {
  var curleft = 0, curtop = 0;
  do {
curleft += obj.offsetLeft;
curtop += obj.offsetTop;
  } while (obj = obj.offsetParent);
  return [curleft, curtop];
};


/**
* Box2d: Create a box2d world.
* @return {b2World} new world.
*/
function createWorld() {
  var worldAABB = new b2AABB();
  worldAABB.minVertex.Set(-2000,-2000);
  worldAABB.maxVertex.Set(2000,2000);
  var gravity = new b2Vec2(0, 500);
  var doSleep = true;
  var world = new b2World(worldAABB, gravity, doSleep);
  createGround(world, (window.innerHeight ||
                        document.documentElement.clientHeight) - 355);
  return world;
}

/**
* Box2d: Creates a ground shape. Depends on global ground variable.
* Destroys global ground variable if called.
* @param {b2world} world World to append to.
* @param {number} bottom Bottom position of the ground.
* @return {null} no return.
*/
function createGround(world, bottom) {
  if (ground) {
      world.DestroyBody(ground);
      ground = null;
  }
  var groundSd = new b2BoxDef();
  groundSd.extents.Set(2000, 50);
  groundSd.friction = 0;
  groundSd.restitution = 0.9;
  var groundBd = new b2BodyDef();
  groundBd.AddShape(groundSd);
  groundBd.position.Set(0, bottom);
  ground = world.CreateBody(groundBd);
}

/**
* Box2d: Creates a box surface to bounce off of.
* Appends to world passed in.
* @param {b2world} world World to append to.
* @param {number} x
* @param {number} y
* @param {number} width
* @param {number} height
* @return {b2BodyDef} box2d body shape.
*/
function createSurface(world, x, y, width, height, fixed) {
  if (typeof(fixed) == 'undefined') fixed = true;
  var boxSd = new b2BoxDef();
  if (!fixed) boxSd.density = 1.0;
  boxSd.restitution = 1.0;
  boxSd.friction = 0;
  boxSd.extents.Set(width, height);
  var boxBd = new b2BodyDef();
  boxBd.AddShape(boxSd);
  boxBd.position.Set(x,y);
  return world.CreateBody(boxBd);
}

/**
* Box2d: Creates a ball shape.
* Appends to world passed in.
* @param {b2world} world World to append to.
* @param {number} x
* @param {number} y
* @param {number} vel The linear velocity of the ball.
* @return {b2BodyDef} box2d body shape.
*/
function createBall(world, x, y, vel) {
  var ballSd = new b2CircleDef();
  ballSd.density = 0.3;
  ballSd.radius = 7;
  ballSd.restitution = 0.5;
  ballSd.friction = 0.1;
  var ballBd = new b2BodyDef();
  ballBd.AddShape(ballSd);
  ballBd.position.Set(x,y);
  ballBd.linearVelocity.Set( Math.random()*vel-(vel/2),
                              Math.random()*vel-(vel/2) );
  return world.CreateBody(ballBd);
}

/**
* Class Digit
* Represents a single digit on the countdown clock.
* Generates an array of dots based on opts.matrix, and saves them for drawing.
* @param {Object} opts Settings for digit.
* @param {number} opts.x
* @param {number} opts.y
* @param {Object} opts.ctx A DOM node this will be appended to
* @param {Array.<number>} opts.matrix A multi-dimensional array representing
*     state of the digit.
* @param {String} opts.blankColor the hex color value of a "blank" dot
* @param {String} opts.activeColor the hex colorvalue of an "active" dot
* @constructor
*/
function Digit(opts) {
  this.x = opts.x;
  this.y = opts.y;
  this.ctx = opts.ctx;
  this.matrix = opts.matrix;
  this.num = opts.num;
  this.blankColor = opts.blankColor || '#d9d9d9';
  this.activeColor = opts.activeColor;
  this.dots = [];

  for (var i = 0; i < this.matrix.length; i++) {
      for (var j = 0; j < this.matrix[i].length; j++) {
          this.dots.push(new Dot({
              x: this.x + 19*j,
              y: this.y + 19*i,
              ctx: this.ctx,
              fillStyle: (this.matrix[i][j] == 1 ?
                          this.activeColor :
                          this.blankColor),
              willDraw: (this.matrix[i][j] != 2),
              isActive: this.matrix[i][j] == 1,
              digit: this
          }));
      }
  }
}

/**
* Routine to place digit and dots on the countdown clock.
* Will run through all the associated dots and update their positions
*     based on the state of the digit:
*     - default: digit lives on the clock.
*     - removed: digit has been popped off the clock.
* Reaps all dots that are considered out of bounds, and once all dots
* are reaped, marks itself as 'done' to be removed from the digit list.
* @return {null}
*/
Digit.prototype.draw = function() {
  if (this.dots.length == 0) {
      totalDotCount -= this.removedDotCount;
      this.done = true;
      return;
  }
  for (var j = 0; j < this.dots.length; j++) {
      if (this.removed) {
          // only draw dots that are colored ('active')
          if (this.dots[j].isActive && !degraded) {
              if (!this.dots[j].ball2d) {
                  this.dots[j].ball2d = createBall(world,
                                                    this.dots[j].x,
                                                    this.dots[j].y,
                                                    this.velocity);
                  this.dots[j].d.style.zIndex = 99;
              }
              this.dots[j].x = this.dots[j].ball2d.m_position0.x;
              this.dots[j].y = this.dots[j].ball2d.m_position0.y;
              // stop drawing and remove from list when considered done
              if (this.dots[j].x < -400 ||
                  this.dots[j].x > 1400 ||
                  totalDotCount > dotThreshold) {
                  world.DestroyBody(this.dots[j].ball2d);
                  this.ctx.removeChild(this.dots[j].d);
                  this.dots.splice(j,1);
                  totalDotCount--;
                  this.removedDotCount--;
              } else {
                  this.dots[j].draw();
              }
          } else {
              // remove dots we don't want to draw after removed,
              // because they are placeholder dots
              this.ctx.removeChild(this.dots[j].d);
              this.dots.splice(j,1);
          }
      } else {
          this.dots[j].draw();
      }
  }
  if (this.removed && !this.removedDotCount) {
      totalDotCount += this.dots.length;
      this.removedDotCount = this.dots.length;
  }
};

/**
* Routine to remove all dots that are not considered 'active'.
* Marks itself as 'removed' by setting this.removed to true.
* Figures out the digit that replaced it by looking at the numberMatrices
*     array, then removes dots that are in the same position.
* Dots that do not exist in the same position on the successor are marked
*     to be thrown around.
* @return {null}
*/
Digit.prototype.remove = function() {
  var successor = numberMatrices[this.num-1] ||
      numberMatrices[numberMatrices.length-1];
  var current = numberMatrices[this.num];
  if (successor) {
      if (!this.num == 0 || this.num == 1) {
          var s = 0;
          for (var i = 0; i < successor.length; i++) {
              for (var j = 0; j < successor[i].length; j++) {
                  if (current[i][j] == successor[i][j]) {
                      if (this.dots[s]) {
                          this.ctx.removeChild(this.dots[s].d);
                          this.dots.splice(s,1);
                          s--;
                      }
                  }
                  s++;
              }
          }
      }
  }
  /**
    * Higher velocity if the number is zero
    */
  if (this.num == 0) {
      this.velocity = 1500;
  } else {
      this.velocity = 700;
  }
  this.removed = true;
};


/**
* Class Dot
* Represents a Dot on a Digit.
* @param {Object} opts Settings for digit.
* @param {number} opts.x
* @param {number} opts.y
* @param {Object} opts.ctx A DOM node this will be appended to
* @param {String} opts.fillStyle the hex color value of the dot
* @param {Boolean} opts.willDraw Whether or not to append itself to this.ctx
* @param {Boolean} opts.isActive Being active means that the dot has a color
* @param {Digit} opts.digit The parent Digit of the Dot.
* @constructor
*/
function Dot(opts) {
  this.x = opts.x;
  this.y = opts.y;
  this.ctx = opts.ctx;
  this.fillStyle = opts.fillStyle;
  this.willDraw = opts.willDraw;
  this.isActive = opts.isActive;
  this.digit = opts.digit;
}

/**
* Routine to render dots with onto this.ctx
* Will create a new img DOM node and set the src based on this.fillStyle,
*     then it will append it to this.ctx.
* Finally, it sets the x/y of the dot.
* @return {null}
*/
Dot.prototype.draw = function() {
  if (this.willDraw) {
      if (!this.d) {
          this.d = document.createElement('img');
          this.d.className = 'ball';
          this.d.src = 'http://www.google.com/events/io/2011/static/img/ball-' + this.fillStyle + '.png';
          this.ctx.appendChild(this.d);
      }
      this.d.style.left = this.x + 'px';
      this.d.style.top = this.y + 'px';
  }
};

/**
* Represents state of a Digit row, all dots filled in.
*/
var fullRow = [1, 1, 1, 1];

/**
* Represents state of a Digit row, only right dot filled in.
*/
var rightFill = [0, 0, 0, 1];

/**
* Represents state of a Digit row, only left dot filled in.
*/
var leftFill = [1, 0, 0, 0];

/**
* Represents state of a Digit row, ends filled in.
*/
var endsFill = [1, 0, 0, 1];


/**
* Represents complete digit states for 0-9.
*/
var numberMatrices = [
  [
      fullRow,
      endsFill,
      endsFill,
      endsFill,
      endsFill,
      endsFill,
      fullRow
  ],
  [
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill
  ],
  [
      fullRow,
      rightFill,
      rightFill,
      fullRow,
      leftFill,
      leftFill,
      fullRow
  ],
  [
      fullRow,
      rightFill,
      rightFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
  ],
  [
      endsFill,
      endsFill,
      endsFill,
      fullRow,
      rightFill,
      rightFill,
      rightFill
  ],
  [
      fullRow,
      leftFill,
      leftFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
  ],
  [
      fullRow,
      leftFill,
      leftFill,
      fullRow,
      endsFill,
      endsFill,
      fullRow
  ],
  [
      fullRow,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill
  ],
  [
      fullRow,
      endsFill,
      endsFill,
      fullRow,
      endsFill,
      endsFill,
      fullRow
  ],
  [
      fullRow,
      endsFill,
      endsFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
  ]
];

/**
* Respresents state of a separator (two dots between Digit sets)
*/
var separator = [
  [2,2],
  [2,2],
  [1,2],
  [2,2],
  [1,2],
  [2,2],
  [2,2]
];

/**
* In order, the colors that each Digit's dots should be.
* Blank value means it's a separator.
*/
var digitColors = ['265897', '265897', '265897', '',
                  '13acfa', '13acfa', '',
                  'c0000b', 'c0000b', '',
                  '009a49', '009a49'];


/**
* Anonymous wrapper function, setting up state and firing off draw loop.
* @return {null}
*/
(function() {

  /**
    * Reference to the DOM node all Digits/Dots will drawn on.
    */
  var ctx;

  /**
    * Pad a number with leading zeroes
    * @param {number} num Number to pad.
    * @param {places} places Number of places to pad to.
    * @return {String} padding number as a string value.
    */
  function padNum(num, places) {
      if (num < 100 && places == 3) {
          num = '0' + num;
      }
      if (num < 10) {
          num = '0' + num;
      }
      return num.toString();
  }

  /**
    * Gets the current date, figures out how many days, hours,
    *    minutes and seconds until global countdownTo variable.
    * @return {Array.<String>} array of all digits plus separators
    */
  function getDigits() {
      var now = new Date().getTime();
      var dateDiff = Math.floor((countdownTo-now)/1000);
      var days = padNum(Math.floor(dateDiff/86400), 3);
      var timeRemaining = Math.floor(dateDiff%86400);
      var hours = padNum(Math.floor(timeRemaining/3600), 2);
      var minutes = padNum(Math.floor((timeRemaining%3600)/60), 2);
      var seconds = padNum(((timeRemaining%3600)%60)%60, 2);
      var values = [days, hours, minutes, seconds].join('').split('');
      values.splice(3,0,':');
      values.splice(6,0,':');
      values.splice(9,0,':');
      return values;
  }

  /**
    * Routine that is run in a loop to draw Digits and Dots
    * @return {null}
    */
  function draw() {

      /**
        * Get digit array as of this cycle in the loop.
        */
      var digits = getDigits();

      /**
        * Set the virtual cursor to zero. Gets incremented as Digits and Dots
        *     are draw on ctx.
        */
      var cursorX = 0, cursorY = 0;

      /**
        * Reset current digit list to an empty array.
        * Each digit will be appended to this array
        */
      currentDigits = [];

      /**
        * Loop through all digits and generate Digit objects as needed.
        */
      for (var i = 0; i < digits.length; i++) {

          /**
            * Check oldDigits to see if this Digit exists. If so, reuse it.
            */
          if (oldDigits.length > 0 && digits[i] == oldDigits[i].num) {
              currentDigits.push(oldDigits[i]);
              /**
                * Increment the cursor based on the Digit value.
                * Separator (':') gets it's X incremented by 2 widths of Dot,
                *     otherwise it does the default 5 widths
                *     (the full width of a Digit).
                */
              if (digits[i] == ':') {
                  cursorX += (2*18);
              } else {
                  cursorX += (5*19)-1;
              }
          } else {

              /**
                * Separator (':') gets different constructor values
                */
              if (digits[i] == ':') {
                  currentDigits.push(
                      new Digit({
                          ctx: ctx,
                          x: cursorX,
                          y: 14,
                          num: digits[i],
                          matrix: separator,
                          activeColor: 'b6b4b5'
                      })
                  );
                  cursorX += (2*18);
              } else {
                  /**
                    * Add a new Digit
                    */
                  currentDigits.push(
                      new Digit({
                          ctx: ctx,
                          x: cursorX,
                          y: 14,
                          num: parseInt(digits[i]),
                          matrix: numberMatrices[parseInt(digits[i])],
                          activeColor: digitColors[i],
                          blankColor: ((i < 4 || i > 9) ?
                                        'c9c9c9' :
                                        'd9d9d9'),
                          successor: oldDigits.length ? oldDigits[i] : null
                      })
                  );
                  cursorX += (5*19)-1;
              }
              /**
                * Run the draw routine on the Digit, rendering itself
                *    on the ctx.
                */
              currentDigits[i].draw();

              /**
                * If a Digit exist on oldDigits in this position,
                *     it's ready to be 'discarded', meaning start the
                *     Dot animation. Append it to the discardedDigits
                *     array to be looped through again.
                */
              if (oldDigits.length) {
                  var old = oldDigits[i];
                  discardedDigits.push(old);
              }
          }
      }

      /**
        * Box2d: step the world an iteration
        */
      world.Step(timeStep, iterations);

      /**
        * Loop through all the discarded digits, and draw. If marked as done,
        *    reap the Digit to remove it from play.
        */
      for (var j = 0; j < discardedDigits.length; j++) {
          if (discardedDigits[j].done) {
              discardedDigits.splice(j, 1);
          } else {
              /**
                * Call the remove method to reap dots not going to bounce around.
                */
              if (!discardedDigits[j].removed) {
                  discardedDigits[j].remove();
              }
              discardedDigits[j].draw();
          }
      }

      /**
        * Assign the currentDigits to oldDigits so the next iteration can
        * compare the current set to the previous one.
        */
      oldDigits = currentDigits;
  }


  /**
    * Event listener to activate draggable items on the screen.
    * @param {Event} e
    * @return {Boolean}
    */
  var hactivator = function(e) {

      /**
        * If the target is the logo, an item in the share list, or nav item,
        *    allow dragging.
        */
      if (e.target.id == 'logo' ||
          e.target.className == 'share' ||
          e.target.className == 'nav') {

          /**
            * If we're not already activated and the target is the logo,
            *     activate dragging. Otherwise return.
            */
          if (!activated && e.target.id == 'logo') {
              io.el('index').className = 'hactivated';
              activated = true;
          } else if (!activated) {
              return true;
          }

          /**
            * Get the current x/y coords of the cursor relative to the target.
            */
          var layerX = (e.layerX || e.offsetX),
              layerY = (e.layerY || e.offsetY);

          /**
            * Save the link href to be used in event listeners.
            */
          var href = e.target.getAttribute('href');

          /**
            * Generate a new DOM node by cloning the target and
            *    removing the target. Appends the new node to ctx.
            */
          var g;
          if (e.target.className == 'nav') {
              g = e.target.parentNode.cloneNode(true);
              ctx.appendChild(g);
              g.style.cursor = 'move';
              e.target.parentNode.parentNode.removeChild(e.target.parentNode);
          } else {
              g = e.target.cloneNode(false);
              ctx.appendChild(g);
              e.target.parentNode.removeChild(e.target);
              g.style.cursor = 'move';
          }

          /**
            * Get the width/height of the new DOM node clone
            */
          var w = g.offsetWidth, h = g.offsetHeight;

          /**
            * Assume by default the user does not intend to move the node.
            * If this is not set to true, then follow the href.
            */
          var moved = false;

          /**
            * Set the position of the new DOM node to exactly where
            *    it was when clicked.
            */
          g.style.zIndex = '99';
          g.style.position = 'absolute';
          g.style.left = (((e.pageX || e.clientX)-countdownBounds[0]) +
                          ((layerX)*-1)) + 'px';
          g.style.top = (((e.pageY || e.clientY)-countdownBounds[1]) +
                          ((layerY)*-1)) + 'px';

          /**
            * Event handler for mousemove.
            * Will move the cloned DOM node around based on the event
            *    coords, adjusting for the layer offsets. Creates a
            *    new Box2d surface every time, destroying any that
            *    represented it in a previous iteration.
            * Sets moved = true to prevent following the link after mouseup.
            * @param {Event} e
            * @return {null}
            */
          var onMouseMove = function(e) {
              g.style.left = ((e.pageX || e.clientX)-countdownBounds[0]) +
                  ((layerX)*-1) + 'px';
              g.style.top = ((e.pageY || e.clientY)-countdownBounds[1]) +
                  ((layerY)*-1) + 'px';
              if (surfaces[g.id]) {
                  world.DestroyBody(surfaces[g.id]);
              }
              surfaces[g.id] = createSurface(world,
                                              parseInt(g.style.left)+(w/2),
                                              parseInt(g.style.top)+(h/2),
                                              w/2,
                                              h/2);
              moved = true;
          };

          /**
            * Event handler for mouseup.
            * Will remove listeners for mousemove and mouseup, and follow
            *     the href if moved is still false.
            */
          var onMouseUp = function(e) {
              io.unlisten('mousemove', document, onMouseMove);
              io.unlisten('mouseup', document, onMouseUp);
              if (moved) {
                  e.preventDefault();
                  e.stopPropagation();
              } else if (href) {
                  window.location.href = href;
              }
              return false;
          };

          /**
            * Set up event listeners for mousemove/mouseup
            */
          io.listen('mousemove', document, onMouseMove);
          io.listen('mouseup', document, onMouseUp);
          e.stopPropagation();
          e.preventDefault();
          return false;
      } else {
          return true;
      }

  };

  /**
    * Nullify references to Digits and Box2d objects, run onunload
    */
  var cleanup = function() {
      oldDigits = null;
      currentDigits = null;
      discardedDigits = null;
      for (k in surfaces) {
          world.DestroyBody(surfaces[k]);
      }
      world.DestroyBody(ground);
      world = null;
  };

  /**
    * Get the date we're counting down to.
    */
  var countdownTo = new Date(2012, 3, 16, 17, 00, 00).getTime();

  /**
    * Buckets for the Digits.
    */
  var currentDigits, oldDigits = [], discardedDigits = [];

  /**
    * Object to old references to surfaces, so we can destroy and recreate.
    */
  var surfaces = {};

  /**
    * Reference to the DOM node where everything is drawn.
    */
  ctx = io.el('countdown');

  /**
    * Used everywhere to adjust position of items for screen width/height.
    * Also used to determine whether a ball is out of bounds.
    */
  var countdownBounds = getPos(ctx);

  /**
    * Start out draggable state as not activated.
    */
  var activated;

  /**
    * Resize ground and refetch countdownBounds when window is resized.
    */
  io.listen('resize', window, function() {
      createGround(world, (window.innerHeight ||
                            document.documentElement.clientHeight) - 355);
      countdownBounds = getPos(ctx);
  });

  /**
    * Add listener to cleanup when the user leaves.
    */
  io.listen('unload', window, cleanup);

  /**
    * If global degraded is not set, then allow dragging of items.
    */
  if (!degraded) {
      io.listen('mousedown', document, hactivator);
  }

  /**
    * Loop!
    */
  setInterval(draw, 30);


}());
