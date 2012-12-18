
Highbrow.Map = this.Highbrow.Map = function(hb,conf) {

    "use strict";

    // graphic that consists of a plot and label column.

    if (! (this instanceof Highbrow.Map)) throw "called Highbrow.Map constructor as if it were a function: missing 'new'.";
    var map = this;
    var scored = false;



    map.init = function(){
	map.canvas = document.getElementById(conf.mapPanel);
	map.scorecount=0;
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
	map.labelWidth = 168;
	map.plotWidth = map.width-map.plotX-map.labelWidth;
	map.plotHeight = map.height-map.plotY;
    };

    // Needs to happen after constructor because processingOverrides references map?
    
    map.initProcessing = function(){
	map.p = new Processing(map.canvas,map.processingOverrides);
	map.monoFont = map.p.loadFont("courier");
	map.fancyFont = map.p.loadFont("baskerville");
	map.fancyFontItalic = map.p.loadFont("baskerville-italic","baskerville");
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
	    //hb.indexTracks();
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
	    // mouse scrolling is more gradual than arrow scrolling.
	    if ( map.mouseIsOver ) {
		if ( p.mouseY < map.height ) {
		    if ( p.mouseScroll < 0 ) {
			map.zoom(1.1);
		    } else if ( p.mouseScroll > 0 ) {
			map.zoom(.909090909);
		    }
		}
	    }
	};

	p.mouseDragged = function(){
	    if ( map.isDragging ) {
		var mouseTp = map.spa + (map.charPerPx() * p.mouseX);
		var deltaTp = map.grabTp - mouseTp;
		var deltaPx = map.grabPx - p.mouseX;
		if ( deltaTp ) {
		    map.setVisibleRange(map.spa+deltaTp,map.spz+deltaTp);
		}
	    }
	};

	p.mousePressed = function(){
	    if ( map.isOnDragPanArea() ) {
		map.isDragging = true;
		map.grabPx = p.mouseX;
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
	    // select the clicked on section.
	    var structureTrack = hb.visibleTracks[0];
	    var notes = structureTrack.notes;
	    var bottomVisibleLevel = map.bottomVisibleLevel();
	    $.each( notes, function(index, note ) {
		    var selectedNote = map.getStructureNoteAt(note,0,bottomVisibleLevel,a,z);
		    if ( selectedNote ) {
			// we clicked on the top tier
			if ( bottomVisibleLevel > 0 &&   map.p.mouseY < ((map.defaultTrackSize+structureTrack.size)*.5)) {
			    selectedNote = selectedNote.parent;
			}
			hb.selectSection(selectedNote);
			return;
		    }
		});
	};
    };

    map.getStructureNoteAt = function (note,currentDepth,maxDepth,a,z){
	var match;
	if ( currentDepth === maxDepth ) {
	    if ( hb.overlaps(note.start,note.stop,a,z)) {
		match = note;
	    }
	} else {
	    $.each(note.children,function(index,child) {
		    if (hb.overlaps(child.start,child.stop,a,z)){
			child.parent = note; // temporarily need to keep track of this to support top tier click.
			match =map.getStructureNoteAt(child,currentDepth+1,maxDepth,a,z);
			return;
		    }
		});
	}
	return match;
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
	//reinos
	if ( ! scored ) {
	    map.scorePixels(hb.visibleTracks);
	}
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
	map.drawNotes(t,map.drawTieredSection);
	map.p.textAlign(map.p.LEFT,map.p.BOTTOM)
    };

    map.drawTieredSection = function (t,f,fi,min,max){
	// draw one or two tiered structural bands appropriate for current zoom level
	// Bible: book -> chapter -> verse
	// Plato: dialog -> [book number] -> stephanus number -> section letter.
	// Shakespeare: Play -> Act -> Scene -> Speaker -> Line
	// http://plato-dialogues.org/faq/faq007.htm
	// Make good use of space. No more than 2 horizontal bands at a time.
	// Top band can show combined info for multiple levels.
	// Thresholds at which to show each level of substructure determined by average substructure node size at each level.
	// actually, logic should be simple. bottom tier shows finest visible granulatity.
	// top tier shows concatenation of all above tiers. 
	var y = map.plotY;
	var height = t.size;
	var bottomVisibleLevel = map.bottomVisibleLevel();
	if (  bottomVisibleLevel > 0 ) {
	    // draw 2 tiers.
	    var height = t.size / 2;
	    map.descendStructureTier(f,y,height,"",1,bottomVisibleLevel);
	} else {
	    // draw 1 tier. Only show top level (eg., biblical books).
	    map.drawSimpleSection(f,fi,y,height,f.name);  
	}
    };


    map.descendStructureTier = function(n,y,height,topPrefix,currentDepth,maxDepth) {
	if ( hb.overlaps(n.start,n.stop,map.spa,map.spz)){
	    // Either draw given structural level n or descend a level deeper depending on current zoom level.
	    if ( currentDepth === maxDepth ) {
		map.drawTieredStructure(n,n.children,y,height,topPrefix);
	    } else {
		$.each(n.children,function(index,child) {
		    map.descendStructureTier(child,y,height,topPrefix+ n.name+ " : ",currentDepth+1,maxDepth);
		});
	    }
	}
    };

    map.drawTieredStructure = function(top,bottoms,y,height,topPrefix){
	map.drawSections([top],y-height,height,topPrefix);
	map.drawSections(bottoms,y,height,"");
    };

    map.bottomVisibleLevel = function(){
	// if 0, then single level
	// if anything else, then there are 2 levels, with this level on the bottom
	// and all above levels concatenated on top.
	// determination is based on number of total levels
	// and map.pxPerChar
	// hack for now to limit to 4 until you figure out what is going on with some tei shakespeare.
	var bottomLevel = hb.structureLevels.length < 5 ? hb.structureLevels.length : 4;
	for ( var i = bottomLevel; i > 0; i-- ) {
	    if ( map.pxPerChar() > (hb.structureLevels[i] / (hb.sequence.length/8)) ) {
		return i;
	    }
	}
	return 0;
    };

    map.drawSections = function(sections,y,height,labelPrefix) {
	// draw a horizonal band of simple sections.
	for (var i=0; i < sections.length; i++){  
	    var n = sections[i];
	    map.drawSimpleSection(n,n.hasOwnProperty('li') ? n.li : i,y,height,labelPrefix + n.name);  
	}
    };

    map.drawSimpleSection = function(f,fi,y,h,label) {
	// draws a colored box with a label.
	// label must be a STRING.
	label = label.replace(/\s+/g," ",label);
	map.alternateColor(fi,hb.GOLD,153);
	var start = map.visiblePxInt(f.start+1);
	var stop  = map.visiblePxInt(f.stop);
	var visibleRegion = stop - start +1;
	var x = (start + stop) /2;
	map.p.rect( start, y-h, stop-start+1, h-1 );
	
	if ( f.hasOwnProperty('abbr') ) {
	    if ( visibleRegion <= 7*label.length ) {
		label = f.abbr;
	    }
	}

	while ( visibleRegion <= 7*label.length ) {
	    label=label.substr(0,label.length-1);
	}
	if ( (visibleRegion > 7*label.length && label.length > 0)) {
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
		map.p.text(t.name,map.plotWidth+10,y);
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
		drawMethod(t,n, n.hasOwnProperty('li') ? n.li : ai,min,max);
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
	// why set visiblerange twice?
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
	// reinos: we only need to do this when the viewport changes, right?
	scored = false;

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
	map.scorecount++;
	map.normalized.min = Number.MAX_VALUE;
	map.normalized.max = 0;
	for (var i=0; i < tracks.length; i++ ) {
	    var t = tracks[i];
	    if ( t.type === "group" ) {
		map.scorePixelsForGroup(t);
	    } else {
		map.scorePixelsForTrack(t);
	    }
	}
	scored = true;
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
		    var pxStartChar = map.sp(i);
		    var pxStopChar  = map.sp(i+1);
		    if ( true || hb.overlaps(n.start,n.stop,pxStartChar,pxStopChar)) {
			// reinos: ok, this is the logic: 50/50 rule: score is 1 if 
			// pixel contains 50-100% of note OR note overlaps 50-100% of pixel.
			var overlap = hb.getOverlapCharCount(n.start,n.stop,pxStartChar,pxStopChar);
			if ( (overlap >= hb.len(n)/2) || (overlap >= (pxStopChar-pxStartChar)) ) {
			    t.pxScore[i]+=1;
			}
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
