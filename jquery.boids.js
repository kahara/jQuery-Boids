// My first attempt making a jQuery plugin, following
// the guidelines at: http://docs.jquery.com/Plugins/Authoring
//
// Boids code adapted from Javascript Boids by Ben Dowling,
// see: http://www.coderholic.com/javascript-boids/
//
// If this is bound to the window resize event, then the 
// jQuery resize event plugin by "Cowboy" Ben Alman
// should be used as it throttles the window resize events.
// See: http://benalman.com/projects/jquery-resize-plugin/

(function($) {

    $.fn.boids = function(options) {  

	var settings = {
	    "refreshrate": 12,
	    "maxvelocity": 4,
	    "boids": 100,
	    "red": 0,
	    "green": 0,
	    "blue": 0,
	    "alpha": 127
	};

	var width;
	var height;

	var Boid = function(x, y) {
	    this.x = x;
	    this.y = y;

	    this.px = x;
	    this.py = y;

	    this.xVelocity = 1;
	    this.yVelocity = -1;
	}

	Boid.prototype.move = function() {
	    this.px = this.x;
	    this.py = this.y;

	    this.x += this.xVelocity;
	    this.y += this.yVelocity;
	    var border = 5;
	    if(this.x <= border || this.x >= width - border) {
		this.x -= this.xVelocity;					
		this.x = Math.max(this.x, border);
		this.x = Math.min(this.x, width - border);
		this.xVelocity = -this.xVelocity;
		this.x += this.xVelocity;
	    }
	    if(this.y <= border || this.y >= height - border) {
		this.y -= this.yVelocity;
		this.y = Math.max(this.y, border);
		this.y = Math.min(this.y, height - border);
		this.yVelocity = -this.yVelocity;
		this.y += this.yVelocity;
	    }
	}
	
	Boid.prototype.distance = function(boid) {
	    var distX = this.x - boid.x;
	    var distY = this.y - boid.y;
	    return Math.sqrt(distX * distX + distY * distY);
	}
	
	Boid.prototype.moveAway = function(boids, minDistance) {
	    var distanceX = 0;
	    var distanceY = 0;
	    var numClose = 0;

	    for(var i = 0; i < boids.length; i++) {
		var boid = boids[i];
		
		if(boid.x == this.x && boid.y == this.y) continue;
		
		var distance = this.distance(boid);
		if(distance < minDistance) {
		    numClose++;
		    var xdiff = (this.x - boid.x);
		    var ydiff = (this.y - boid.y);

		    if(xdiff >= 0) xdiff = Math.sqrt(minDistance) - xdiff;
		    else if(xdiff < 0) xdiff = -Math.sqrt(minDistance) - xdiff;

		    if(ydiff >= 0) ydiff = Math.sqrt(minDistance) - ydiff;
		    else if(ydiff < 0) ydiff = -Math.sqrt(minDistance) - ydiff;

		    distanceX += xdiff;
		    distanceY += ydiff;
		    boid = null; 
		}
	    }
	    
	    if(numClose == 0) return;
	    
	    this.xVelocity -= distanceX / 5;
	    this.yVelocity -= distanceY / 5;
	}
	
	Boid.prototype.moveCloser = function(boids, distance) {
	    if(boids.length < 1) return;			

	    var avgX = 0;
	    var avgY = 0;
	    for(var i = 0; i < boids.length; i++) {
		var boid = boids[i];
		if(boid.x == this.x && boid.y == this.y) continue;
		if(this.distance(boid) > distance) continue;
		
		avgX += (this.x - boid.x);
		avgY += (this.y - boid.y);
		boid = null;
	    }
	    
	    avgX /= boids.length;
	    avgY /= boids.length;

	    distance = Math.sqrt((avgX * avgX) + (avgY * avgY)) * -1.0
	    if(distance == 0) return;
	    
	    this.xVelocity= Math.min(this.xVelocity + (avgX / distance) * 0.15, settings["maxvelocity"]);
	    this.yVelocity = Math.min(this.yVelocity + (avgY / distance) * 0.15, settings["maxvelocity"]);
	}
	
	Boid.prototype.moveWith = function(boids, distance) {
	    if(boids.length < 1) return;

	    // calculate the average velocity of the other boids
	    var avgX = 0;
	    var avgY = 0;
	    for(var i = 0; i < boids.length; i++) {
		var boid = boids[i];
		if(boid.x == this.x && boid.y == this.y) continue;
		if(this.distance(boid) > distance) continue;
		
		avgX += boid.xVelocity;
		avgY += boid.yVelocity;
		boid = null;
	    }
	    avgX /= boids.length;
	    avgY /= boids.length;

	    distance = Math.sqrt((avgX * avgX) + (avgY * avgY)) * 1.0;
	    if(distance == 0) return;

	    this.xVelocity= Math.min(this.xVelocity + (avgX / distance) * 0.05, settings["maxvelocity"]);
	    this.yVelocity = Math.min(this.yVelocity + (avgY / distance) * 0.05, settings["maxvelocity"]);
	}
	
	return this.each(function() {        
	    if(options) { 
		$.extend(settings, options);
	    }
	    
	    // if this element already has a jquery.boids set up, do some cleaning
	    if($(this).data("jquery.boids.timer")) {
		console.log("clearInterval(" + $(this).data("jquery.boids.timer") + ")");		
		clearInterval($(this).data("jquery.boids.timer"));
		$(this).data("jquery.boids.timer", null);
	    }
	    if($(this).data("jquery.boids.canvas")) {		
		$($(this).data("jquery.boids.canvas")).remove();
		$(this).data("jquery.boids.canvas", null);
	    }
	    
	    var c = document.createElement("canvas");
	    var ctx;

	    try {  // check if canvas element is supported
		if(c.getContext) {
		    ctx = c.getContext("2d");
		} else {
		    return true; // skip loop iteration
		}
	    } catch(e) {}

	    // store a reference to canvas element in parent
	    $(this).data("jquery.boids.canvas", c);	    
	    $(this).append(c);

	    $(c).css("position", "absolute");
	    $(c).css("top", 0);
	    $(c).css("left", 0);

	    

	    // set width, height to match those of parent element
	    c.setAttribute("width", $(this).width());
	    c.setAttribute("height", $(this).height());
	    
	    // this is dirty
	    width = c.width;
	    height = c.height;

	    var boids = [];
	    for(var i = 0; i < settings["boids"]; i++) {
		boids.push(new Boid(Math.ceil(Math.random() * c.width), Math.ceil(Math.random() * c.height)));
	    }

	    var rate = Math.ceil(1000/settings["refreshrate"]);
	    var timer = setInterval(function(){
		for(var i = 0; i < settings["boids"]; i++) {
		    boids[i].moveWith(boids, 300);
		    boids[i].moveCloser(boids, 300);					
		    boids[i].moveAway(boids, 15);	
		}
		
		for(var i = 0; i < settings["boids"]; i++) {
		    boids[i].move();
		}

		ctx.clearRect(0, 0, c.width, c.height);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "rgba(" + settings["red"] + "," + settings["green"] + "," + settings["blue"] + "," + settings["alpha"] + ")";

		for(var i = 0; i < settings["boids"]; i++) {
		    ctx.beginPath();
		    ctx.moveTo(Math.floor(boids[i].px), Math.floor(boids[i].py));
		    ctx.lineTo(Math.floor(boids[i].x), Math.floor(boids[i].y));
		    ctx.closePath();
		    ctx.stroke();
		}		
	    }, rate);
	    console.log("setInterval(" + rate + ") = " + timer);
	    $(this).data("jquery.boids.timer", timer);
	    
	});
    };

})( jQuery );
