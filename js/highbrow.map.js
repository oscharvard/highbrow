
var HighbrowMap = this.HighbrowMap = function(hb,conf) {

    // graphic that consists of a plot and label column.

    if (! (this instanceof HighbrowMap)) throw "called HighbrowMap constructor as if it were a function: missing 'new'.";
    var map = this;

    map.init = function(){
	map.canvas = document.getElementById(conf.mapPanel);
	map.normalized = {};
	map.setBounds();
	map.minCharPerPx = conf.minCharPerPx;
	map.defaultTrackSize = conf.defaultTrackSize;
	map.spa=0.0;
	map.spz=hb.sequence.length;
    };

    map.setBounds = function(){
	map.width = map.canvas.width;
	map.height = map.canvas.height;
	map.plotX=0;
	map.plotY=30;
	map.labelWidth = 135;
	map.minLabelWidth = 100;
	map.plotWidth = map.width-map.plotX-map.labelWidth;
	map.plotHeight = map.height-map.plotY;
    };

    // Needs to happen after constructor because processingOverrides references map?
    
    map.initProcessing = function(){
	map.p = new Processing(map.canvas,map.processingOverrides);
	map.monoFont = map.p.loadFont("courier");
	map.fancyFont = map.p.loadFont("baskerville");
	map.fancyFontItalic = map.p.loadFont("Baskerville-Italic");
    };

    // Procesing.js drawing method overrides.
    
    map.processingOverrides = function(p){

	// Setup the Processing Canvas
	p.setup = function(){
	    p.size(map.canvas.width,map.canvas.height);
	    p.strokeWeight( 1 );
	    p.frameRate( 5 );
	};

	// Set up the drawing routine.
	p.draw = function(){
	    p.background( 255 );
	    p.fill( 0 );
	    p.textFont(map.monoFont);			
	    p.textSize("9");
	    map.drawRawSequence();
	    map.drawTracks();
	    map.drawSelections();
	    map.drawPlaybackPosition();
	    p.noFill();
	    p.stroke(0);
	    hb.settingsDialog.onDraw();
	    //hb.pushPendingSaves();
	};

	// Processing input handling methods.

	p.keyPressed = function(){
	    if ( map.mouseIsOver ) {
		if (p.key == p.CODED) {
		    if (p.keyCode == p.UP ) {
			map.zoomIn();
		    } else if (p.keyCode == p.DOWN) {
			map.zoomOut();
		    } else if (p.keyCode == p.LEFT) {
			map.panLeft();
		    } else if ( p.keyCode == p.RIGHT) {
			map.panRight();
		    }
		}
	    }
	};
	
	p.mouseOver = function () {
	    //alert("Mouseover!");
	    // using jquery, remove focus from any other elements that may have it.
	    // now we can take keyboard and mousewheel focus.
	    map.mouseIsOver = true;
	    map.canvas.focus();
	};

	p.mouseOut = function() {
	    // we no longer take focus.
	    map.mouseIsOver = false;
	};

	p.mouseScrolled = function(){
	    if ( map.mouseIsOver ) {
		if ( p.mouseY < map.height ) {
		    if ( p.mouseScroll < 0 ) {
			map.zoomOut();
		    } else if ( p.mouseScroll > 0 ) {
			map.zoomIn();
		    }
		}
	    }
	};

	p.mouseDragged = function(){
	    if ( map.isDragging ) {
		var mouseTp = map.spa + (map.charPerPx() * p.mouseX);
		var deltaTp = map.grabTp - map.mouseTp;
		var deltaPx = map.grabPx - p.mouseX;
		if ( deltaTp ) {
		    map.setVisibleRange(map.spa+deltaTp,map.spz+deltaTp);
		}
	    }
	};

	p.mousePressed = function(){
	    if ( map.isOnDragPanArea() ) {
		map.isDragging = true;
		map.grapPx = p.mouseX;
		map.grabTp = map.spa + (map.charPerPx()*p.mouseX);
	    }
	};

	p.mouseReleased = function(){
	    map.isDragging = false;
	};

	p.mouseClicked = function(){
	    if ( map.isOnDragPanArea() ) {
		return;
	    }
	    var a = map.sp(p.mouseX);
	    var z = map.sp(p.mouseX+1);
	    // get the biggest structural feature that is smaller than some threshold in this region.
	    // if not structural features or nothing suitable, just get some default range of characters centered on click point.  
	    // hack for now for bible.
	    var sn;
	    var sntrack = hb.visibleTracks[0];
	    for (var i =0; i < sntrack.notes.length; i++ ) {
		if ( sn ) {
		    break;
		}
		var book = sntrack.notes[i];
		if ( hb.overlaps(a,z,book.start,book.stop) ) {
		    for (var ii =0; ii < book.children.length; ii++ ) {
			var chapter = book.children[ii];
			if ( hb.overlaps(a,z,chapter.start,chapter.stop) ) {
			    if ( map.pxPerChar() > .1 ) {
				// zoomed in enough to see verses and actually clicked on one.
				// question: do you have to click on an sn to select it? I think so. 
				// clicking elsewhere should deselect (or possibly do something else)
				for (var iii =0; iii < chapter.children.length; iii++ ) {
				    var verse = chapter.children[iii];
				    if ( hb.overlaps(a,z,verse.start,verse.stop) ) {
					sn = verse;
					break;
				    }
				} 
			    } else {
				sn = chapter;
			    }
			    break;
			}
		    }
		}
	    }
	    hb.selectSection(sn);
	};
    };

    // Highbrow Map input handling methods..

    map.isOnDragPanArea = function(){
	return map.p.mouseY < (map.defaultTrackSize*.5);
    };

    // Highbrow Map drawing methods.

    map.drawSelections = function(){
	if ( hb.selectedSection ) {
	    var a = map.visiblePxInt(hb.selectedSection.start+1);
	    var z = map.visiblePxInt(hb.selectedSection.stop);
	    map.p.stroke(hb.BLUE[0],hb.BLUE[1],hb.BLUE[2],100);
	    map.p.fill(hb.BLUE[0],hb.BLUE[1],hb.BLUE[2],100);
	    map.p.rect(a,0,z-a+1,map.height);
	}
    };

    map.drawPlaybackPosition = function(){
	// TODO: hbv element should be an configuration parameter.
	if ( $("#hbv").length > 0 ) {
	    var position = document.getElementById("hbv").currentTime;
	    if ( position === undefined ) {
		position = 0;
	    } else {
		position = parseInt(position,10);
	    }
	    var a = map.visiblePxInt(position);
	    var z = map.visiblePxInt(position+1);
	    var alpha = 100;
	    if ( z-a < 3 ) {
		alpha=200;
		z=a;
	    }
	    map.p.stroke(RED[0],RED[1],RED[2],alpha);
	    map.p.fill(RED[0],RED[1],RED[2],alpha);
	    map.p.rect(a,0,z-a+1,height);
	}
    };

    map.drawRawSequence = function(){
	if ( (map.pxPerChar() > 4) && hb.sequence.data) {
	    var a = map.sp(1);
	    var z = map.sp(map.plotWidth);
	    var str = hb.getRawSequence(a,z);
	    for ( var i =0; i < str.length; i++) {
		var c = str.charAt(i);	
		var px = i*map.pxPerChar(); 
		map.p.text(""+ c, px,10);
	    }  
	}
    };
	
    map.drawTracks = function(){
	map.normalized.min = Number.MAX_VALUE;
	map.normalized.max = 0;	
	map.scorePixels(hb.visibleTracks);
	for (var ti=0; ti < hb.visibleTracks.length; ti++ ) {
	    var t = hb.visibleTracks[ti];
	    if ( t.type == 'structure') {
		map.drawAlternatingColorNotes(t);
	    } else {
		map.drawScoredTrack(t,ti);
	    }
	}
	map.labelTracks(hb.visibleTracks);
    };

    map.drawScoredTrack = function(t,order){
	map.alternateColor(order,hb.RED,0);
	var min = map.getBound('min',t);
	var max = map.getBound('max',t);
	var y = map.plotY+(t.size*(order+0));
	map.p.beginShape();
	map.p.vertex(map.plotX, y);
	var lastScore=-1;
	for (var i=0; i < map.plotWidth; i++ ) {
	    var score = t.pxScore[i];
	    if ( false && i+1 < map.plotWidth && (score == lastScore == t.pxScore[i+1]) ) {
		// assuming saving vertices will render faster?
		// looks like it.
	    } else {
		var x = map.plotX + i;
		var scorePercent = (score-min) / (max-min+0.0);
		var scoreHeight  = (t.size-1) * scorePercent;
		map.p.vertex(x, y+scoreHeight*-1);
	    }
	    lastScore = score;
	}	    
	map.p.vertex(map.plotX+map.plotWidth, y);
	map.p.endShape(map.p.CLOSE);
	map.p.line(map.plotX,y,map.plotX+map.plotWidth,y);
    };

    map.drawAlternatingColorNotes = function(t) {
	map.p.textFont(map.fancyFont);			
	map.p.textSize(9);
	map.p.textAlign(map.p.CENTER,map.p.CENTER);
	map.drawNotes(t,map.drawStructuralFeature);
	map.p.textAlign(map.p.LEFT,map.p.BOTTOM)
    };

    map.drawStructuralFeature = function (t,f,fi,min,max){
	// draw structural features appropriate for current zoom level
	// Bible: book -> chapter -> verse
	// Plato: dialog -> [book number] -> stephanus number -> section letter.
	// http://plato-dialogues.org/faq/faq007.htm
	// Make good use of space. No more than 2 horizontal bands at a time.
	// Top band can show combined info for multiple levels.
	// thresholds at which to show each level of subfeature could be set in the data.
	// for now, hard code (need a default anyway).
	// works great for bible (3 tiers). But will break on other number of tiers.
	// actually, logic should be simple. bottom tier shows finest visible granulatity.
	// top tier shows concatenation of all above tiers. 
	var y = map.plotY;//+(t.size*(t.order+0)); 
	var height = t.size;
	var bottomFeatures = [];
	var topFeatures = [];
	var topPrefix = "";
	if (  map.pxPerChar() > .005 ) {
	    if ( map.pxPerChar() > .1 ) {
		// show verses on bottom and book-chapters on top.
		topPrefix = f.name + " : ";
		topFeatures = f.children;
		for ( var i=0; i < topFeatures.length; i++ ) {
		    for ( var ii=0; ii < topFeatures[i].children.length; ii++ ) {      
			bottomFeatures.push(topFeatures[i].children[ii]);
		    }
		}
	    } else {
		// show chapters on bottom and books on top.
		map.drawSimpleStructuralFeature(f,fi,y-(t.size/2),height/2,f.name);  
		bottomFeatures = f.children;
	    }
	} else {
	    // only show books.
	    map.drawSimpleStructuralFeature(f,fi,y,height,f.name);  
	}
	var height = t.size / 2;
	map.drawSimpleFeatures(topFeatures,y-height,height,topPrefix);
	map.drawSimpleFeatures(bottomFeatures,y,height,"");
    };

    map.drawSimpleFeatures = function(features,y,height,labelPrefix) {
	for (var i=0; i < features.length; i++){  
	    var f = features[i];
	    map.drawSimpleStructuralFeature(f,i,y,height,labelPrefix + f.name);  
	}
    };

    map.drawSimpleStructuralFeature = function(f,fi,y,h,label) {
	// label must be a STRING.
	label = label.replace("\n"," ",label);
	map.alternateColor(fi,hb.GOLD,153);
	var start = map.visiblePxInt(f.start+1);
	var stop  = map.visiblePxInt(f.stop);
	var visibleRegion = stop - start +1;
	var x = (start + stop) /2;
	map.p.rect( start, y-h, stop-start+1, h-1 );
	if ( visibleRegion > 4.1*label.length ) {
	    map.p.stroke(0);
	    map.p.fill(0);
	    // todo: fix substring visible chars.
	    // var visibleChars = Math.min(4, label.length);
	    // text(label.substr(0,visibleChars),x,y-h/2);
	    map.p.text(label,x,y-(h/2)-2);
	}
    };

    map.labelTracks = function(tracks){
	var y= map.plotY;
	for (var ti=0; ti < tracks.length; ti++ ) {
	    var t = tracks[ti];
	    map.alternateColor(ti,hb.RED,[0]);
	    if ( t.type != 'structure')  {
		map.p.textFont(map.fancyFontItalic);			
		map.p.textSize("13");
		map.p.text(t.name,map.plotWidth+20,y);
		map.p.textFont(map.monoFont);			
		map.p.textSize("8");
		map.p.textAlign(map.p.RIGHT);
		map.p.textAlign(map.p.LEFT);
	    }
	    y+=t.size;
	}
    };

    map.drawNotes = function(t,drawMethod){
	t.pxScore = [];
	var min = map.getBound('min',t);
	var max = map.getBound('max',t);
	for (var ai=0; ai < t['notes'].length; ai++){  
	    var n =  t['notes'][ai];
	    if ( hb.overlaps(n.start,n.stop,map.spa,map.spz)){
		drawMethod(t,n,ai,min,max);
	    }
	}
    };

    map.alternateColor = function(i,evensColor,oddsColor){
	if ( i == 0 || i % 2 == 0 ) {
	    map.arraystrokefill(evensColor);
	} else {
	    map.arraystrokefill(oddsColor);
	}
    };

    map.arraystrokefill = function(a){
	if ( a instanceof Array ) {
	    if (a.length==4) {
		map.p.stroke(a[0],a[1],a[2],a[3]);
		map.p.fill(a[0],a[1],a[2],a[3]);
	    } else if (a.length==3 ) {
		map.p.stroke(a[0],a[1],a[2]);
		map.p.fill(a[0],a[1],a[2]);
	    } else {
		map.p.stroke(a[0]);
		map.p.fill(a[0]);
	    }
	} else {
	    map.p.stroke(a);
	    map.p.fill(a);      
	}
    };

    // Sequence position <=> pixel translation methods.

    map.visiblePxInt = function(sp){
	return Math.floor(map.visiblePx(sp));
    };
    
    map.visiblePx = function(sp){
	var p = map.px(sp);
	p = Math.max(p,0);
	p = Math.min(p,map.plotWidth);
	return p;  
    };

    // text to pixel position
    map.px = function(sp){
	return (sp - map.spa) * map.pxPerChar();
    }; 

    // pixel to text position 
    map.sp = function (px) {
	return (px / map.pxPerChar()) + map.spa;
    };
    
    map.pxPerChar = function(){
	return map.plotWidth / ((map.spz-map.spa+1.0));
    };
    
    map.charPerPx = function(){
	return (map.spz-map.spa+1.0) / (map.plotWidth);
    };

    // Zoom and Pan methods.
    
    map.zoom = function(factor){
	// todo: take mouse position into account.
	// if no mouse, center.
	var oldMouseSp = map.sp(map.p.mouseX);
	var old_sps = (map.spz - map.spa +1);
	var new_sps = (map.spz - map.spa +1) * factor;
	if ( new_sps > hb.sequence.length ) {
	    new_sps =  hb.sequence.length;
	}
	var new_spa = Math.max(0,map.spa - (new_sps/2));
	var new_spz = new_spa + new_sps;
	map.setVisibleRange(new_spa,new_spz);
	var newMouseSp = map.sp(map.p.mouseX);
	var delta = oldMouseSp - newMouseSp;
	map.setVisibleRange(new_spa+delta,new_spz+delta);
    };

    map.setVisibleRange = function(new_spa,new_spz){
	var oldLength = map.spz - map.spa +1;
	var new_sps = new_spz-new_spa+1;
	if ( new_spa <= 0 ) {
	    new_spa=1;
	    new_spz=new_sps;
	}
	if ( new_spz > hb.sequence.length ) {
	    new_spz =  hb.sequence.length;
	    new_spa =  new_spz - new_sps;
	}
	// semi-redundant checks. rewrite this method so it works withouth this crap.
	// shouldn't be necessary.
	if ( new_spa <= 0 ||  new_spz > hb.sequence.length ) {
	    new_spa=1;
	    new_spz=hb.sequence.length;
	}
	// TODO: why *2???????
	if ( ((new_spz - new_spa ) / map.plotWidth)  > map.minCharPerPx*2 ) {
	    map.spa = new_spa;
	    map.spz = new_spz;
	}
	var newLength = map.spz - map.spa +1;
	//if ( oldLength != newLength ) {
	//updateCurrentLevel();
	//}
    };

    map.pan = function (factor){
	var sps = (map.spz - map.spa +1);
	var delta = factor * sps;
	var new_spa = map.spa+delta; 
	var new_spz = map.spz+delta;
	map.setVisibleRange(new_spa,new_spz);
    };

    map.currentZoom = function(){
	return hb.sequence.length / (map.spz - map.spa +1.0);
    };

    map.zoomIn = function(){
	map.zoom(.5);
    };
    
    map.zoomOut = function(){
	map.zoom(2.0);
    };
    
    map.panLeft = function(){
	map.pan(-.10);
    };
    
    map.panRight = function(){
	map.pan(.10);
    };

    // Track Pixel Scoring methods.

    map.scorePixels = function(tracks){
	for (var i=0; i < tracks.length; i++ ) {
	    var t = tracks[i];
	    if ( t.type === "group" ) {
		map.scorePixelsForGroup(t);
	    } else {
		map.scorePixelsForTrack(t);
	    }
	}
    };

    map.scorePixelsForGroup = function(g){
	g.min=Number.MAX_VALUE;
	g.max=0;
	g.pxScore = hb.newFilledArray(map.plotWidth,0);
	for (var i=0; i < g.trackIds.length; i++ ) {
	    var t = hb.trackById[g.trackIds[i]];
	    map.scorePixelsForTrack(t);
	    map.addTrackPixelScoresToGroup(g,t,i+1==g.trackIds.length);
	}
	if (g.min > g.max) {
	    g.min = g.max;
	}
    };

    map.addTrackPixelScoresToGroup = function(g,t,updateMin){
	for ( var i=0; i < map.plotWidth; i++ ) {
	    g.pxScore[i]+= t.pxScore[i];
	    if ( updateMin ) {
		map.updateMinMax(g.pxScore[i],g);
	    } else {
		map.updateMax(g.pxScore[i],g);
	    }
	}
    };

    map.scorePixelsForTrack = function(t){
	if ( t.pyramid) {
	    //loadTiles(t);
	    alert("Pyramid not yet supported by this version of Highbrow. Rethinking.");
	} else {
	    map.countPxNotes(t,t.notes);
	}
    };

    map.countPxNotes = function(t,notes){
	// count number of ref characters overlapping each visible pixel.
	t['min'] = 0;
	t['max'] = 0;    		      
	t.pxScore = hb.newFilledArray(map.plotWidth,0);
	for (var ai=0; ai < notes.length; ai++){  
	    var n =  notes[ai];
	    if ( hb.overlaps(n.start,n.stop,map.spa,map.spz)){
		// get pixels with ANY overlap
		var a = map.visiblePxInt(n.start+1);
		var z = map.visiblePxInt(n.stop)+1;
		for (var i=a; i <=z; i++ ) {
		    var pxStart = map.sp(i);
		    var pxStop  = map.sp(i+1);
		    if ( true || hb.overlaps(n.start,n.stop,pxStart,pxStop)) {
			t.pxScore[i]+=hb.getOverlapCharCount(n.start,n.stop,pxStart,pxStop);
			map.updateMinMax(t.pxScore[i],t);
		    }
		}
	    }
	}
    };

    map.updateMax = function(score,t){
	if ( score > map.normalized['max'] ) {
	    map.normalized['max'] = score;
	}
	if ( score > t['max'] ) {
	    t['max'] = score;
	}
    };

    map.updateMinMax = function(score,t) {
	map.updateMax(score,t);
	if ( score < map.normalized['min'] ) {
	    map.normalized['min'] = score;
	}
	if ( score < t['min'] ) {
	    t['min'] = score;
	}
    };

    map.getBound = function(bound,track){
	if ( $('#bounds').val() == 'normal'  ){
	    return map.normalized[bound];
	} else {
	    return track[bound];
	}
    };

    map.init();
};
