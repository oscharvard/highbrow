
// variable names are spelled out except (sometimes) in the following cases:
// hb = highbrow
// p = processing
// n = note, t = track, s = sequence
// sp = sequence position, px= pixel
// a = start, z = stop
// so by extension: spa, spz, pxa, pxz

var Highbrow = this.Highbrow = function(conf) {

    // The Highbrow object represents the entire widget.  Composed of:
    // Map, Sequence Panel, Notes Panel (and possible additional data
    // managers)

    if (! (this instanceof Highbrow)) {
	throw "called Highbrow constructor as if it were a function: missing 'new'.";
    }

    var hb = this;

    // initialization and data munging methods.

    hb.validateConf = function(){
	// make sure we have required configuration parameters.
	// set defaults for optional parameters.
	if (! (conf.container)) { throw "no container div id provided!"; }
	if (! (conf.sequence )) { throw "no sequence configuration provided!"; }
	if (! (conf.tracks )) { throw "no tracks configuration provided!"; }
	if (! (conf.structure )) { throw "no structure configuration provided!"; }

	hb.container = conf.container;

	if ( conf.title ) {
	    hb.title = conf.title;
	} else {
	    hb.title = "";
	    if ( conf.sequence.hasOwnProperty('name') ) {
		hb.title += conf.sequence.name;
	    } else {
		hb.title += "an Untitled Work";
	    }
	}
	hb.prefix = conf.prefix ? conf.prefix : "HB_";
	conf.mapPanel      = hb.prefix + "mapPanel";
	conf.notesPanel    = hb.prefix + "notesPanel";
	conf.notesHeader   = hb.prefix + "notesHeader";
	conf.sectionPanel  = hb.prefix + "sectionPanel";
	conf.sectionHeader = hb.prefix + "sectionHeader";
	conf.groups = conf.groups ? conf.groups : [];
	conf.minCharPerPx = conf.minCharPerPx ? conf.minCharPerPx : 0.01; 
	conf.defaultTrackSize = conf.defaultTrackSize ? conf.defaultTrackSize : 20;
	conf.noteMarkMode = conf.noteMarkMode ? conf.noteMarkMode : "narrow";
	conf.intro='';
    };

    hb.init = function() {
	hb.validateConf();
	hb.createHighbrowDiv();
	// these constants should be put somewhere else.
	hb.RED  = [206,15,37];
	hb.GOLD = [207,181,59]; //[245,217,77];
	hb.BLUE = [19,83,180];
	hb.noteMarkMode = conf.noteMarkMode;
	hb.initSequence(conf.sequence);
	hb.map = new HighbrowMap(hb,conf);	
	hb.map.initProcessing();
	hb.name = "Highbrow.js Instance";
	hb.initTracks(conf.tracks,conf.groups,conf.structure);
	hb.sPanel   = new HighbrowSelectionPanel(hb,conf);
	hb.nPanel   = new HighbrowNotesPanel(hb,conf);
	hb.settingsDialog = new HighbrowSettingsDialog(hb,conf);
	hb.searchDialog = new HighbrowSearchDialog(hb,conf);
	//hb.eDialog = new HighbrowEditDialog(hb,conf);
	hb.adjustBounds();
	hb.updateNavState();
	hb.attachListeners();

    };

    hb.attachListeners = function(){

	$("#" + hb.prefix + "zoomIn").click(function(e){  hb.map.zoomIn()   ; e.preventDefault(); });
	$("#" + hb.prefix + "zoomOut").click(function(e){ hb.map.zoomOut()   ; e.preventDefault(); });
	$("#" + hb.prefix + "panLeft").click(function(e)  { hb.map.panLeft()  ; e.preventDefault(); });
	$("#" + hb.prefix + "panRight").click(function(e) { hb.map.panRight() ; e.preventDefault(); });
	
	$(window).resize(function() {
		hb.adjustBounds();
	    });
	$(window).bind( 'hashchange', function(){
		hb.updateNavState();
	    });
    };
    
    hb.updateNavState = function(){
	var fragment = $.deparam.fragment();
	var sid = fragment.select ? fragment.select : "";
	var zid = fragment.zoom   ? fragment.zoom : ""; // could be multiple.
	var spa = fragment.start ? fragment.start : "";
	var spz = fragment.stop ? fragment.stop : "";
	// noteSection ?
	if ( sid ) {
	    var s = hb.sectionById[sid];
	    hb.selectSection(s);
	}
	if ( zid ) {
	    // if zoom id is set, it overrides start and stop.
	    var z = hb.sectionById[zid];
	    hb.map.setVisibleRange(z.start,z.stop);
	} else if ( spa && spz ) {
	    hb.map.setVisibleRange(spa,spz);
	}
    };
    
    hb.buildSectionById = function(sections){
	// create map so we can quickly look up sections by id for selection and zooming in url.
	$.each(sections, function(index, section) {
		hb.sectionById[section.id]=section;
		if ( section.hasOwnProperty("children") ) {
		    hb.buildSectionById(section.children);
		}
	    });
    };

    hb.initSequence = function(sequence){
	hb.sequence = sequence;
	hb.sequence.length *= 1.0;
	if ( sequence.type === "video" ) {
	    sequence.length = hb.duration2position(sequence.length);
	}
	if ( sequence.data ) {
	    sequence.length = sequence.data.length;
	}
    };

    hb.initTracks = function(tracks,groups,structure){
	hb.tracks = tracks;
	hb.groups = groups;
	hb.structure = structure;
	hb.trackById = {};
	hb.visibleTracks = [];
	if ( hb.sequence.type === "video" ) {
	    hb.positionDurationNotes();
	}
	// add track groups to tracks. also rethink as with structure.
	for (var gi=groups.length-1; gi > -1; gi-- ) {
	    groups[gi].type="group";
	    tracks.unshift(groups[gi]);
	}
	// add structure to tracks. Rethink. Probably cleaner to keep separate? 
	for (var si=0; si < structure.length; si++ ) {
	    structure[si].type="structure";
	    tracks.unshift(structure[si]);
	    hb.sectionById={};
	    hb.buildSectionById(structure[si].notes);
	}
	// clean up tracks and build lookup by id table.
	for (var ti=0; ti < tracks.length; ti++ ) {
	    var t = tracks[ti];
	    t.size = hb.map.defaultTrackSize;
	    t.order = ti;
	    t.visible = t.visible ? t.visible : false;
	    if ( ! t.notes ) {
		t.notes = [];
	    }
	    // todo: this is confusing. now we've got aggregation groups
	    // and pyramid groups.
	    if ( t.pyramid && ! t.group ) {
		t.group = 'tile';
	    }
	    if ( ! t.type ) {
		t.type = "notes";
	    }
	    hb.trackById[t.id]=t;
	}
	hb.filterTracks();
    };

    hb.filterTracks = function(){
	// create convenience data structures for easy access to visible and editable tracks.
	hb.visibleTracks = [ hb.tracks[0] ];
	hb.editableTracks = [];
	for (var i=1; i < hb.tracks.length; i++ ) {
	    var t = hb.tracks[i];
	    if ( t.visible ){
		hb.visibleTracks.push(t);
		t.order = hb.tracks.length-1;
		if ( t.editable ) {
		    hb.editableTracks.push(t);
		}
	    }
	}
    };

    hb.getNotes = function(tracks,range){
	// todo: check notes for children. optionally? replacement for deep zoom.
	var seenIds = {};
	var notes = [];
	for (var i=0; i < tracks.length; i++ ) {
	    var t = tracks[i];
	    var trackNotes = t.notes;
	    for (var ii=0; ii < trackNotes.length; ii++ ) {
		var n = trackNotes[ii];
		if (hb.overlaps(range.start,range.stop,n.start,n.stop)){
		    if ( ! seenIds.hasOwnProperty(n.id) ) {
			n.track = t;
			notes.push(n);
			seenIds[n.id]=true;
		    }
		}
	    }
	}
	return notes;
    };

    hb.duration2position = function(duration){
	// todo: name is misleading. not duration but whatever you call that h:m:s representation of timestamps.
	// covert timestamps into millisecond counts to position notes on audio/video sequence.
	// todo: looks like it's actually just down to the second right now.
	if ( duration.indexOf(":") > -1 ) {
	    var t = duration.split(":");
	    var h = parseInt(t[0]);
	    var m = parseInt(t[1]);
	    var s = parseInt(t[2]);
	    return (h*60*60)+(m*60)+(s);        
	}
	return duration;
    };

    hb.positionDurationNotes = function(){
	for (var ti=0; ti < hb.tracks.length; ti++ ) {
	    var t = tracks[ti];
	    for ( var ri=0; ri < t.notes.length; ri++ ) {
		var n = t.notes[ri];
		n.start = hb.duration2position(n.start);
		n.stop  = hb.duration2position(n.stop);
	    }
	}
    };

    // range methods. move to new utility class?

    hb.len = function(n){
	return n.stop-n.start+1;
    };

    hb.getOverlap = function(a,z,aa,zz) {
	var o = {};
	o.start = a > aa ? a : aa;
	o.stop  = z < zz ? z : zz;
	return o;
    };

    hb.getOverlapCharCount = function(a,z,aa,zz) {
	var o = hb.getOverlap(a,z,aa,zz);
	return Math.max(0,hb.len(o));
    };

    hb.overlaps = function(a,z,aa,zz){
	if (a <= zz && z >= aa) {
	    return true;
	}
	return false;
    };

    hb.contains = function(a,z,aa,zz){
	if (a <= aa && z >= zz) {
	    return true;
	}
	return false;
    };

    // Misc Utility methods.

    hb.newFilledArray = function(length, val) {
	var array = [];
	for (var i = 0; i < length; i++) {
	    array[i] = val;
	}
	return array;
    };

    // Sub-widget coordination methods.

    hb.getInspectableTracks = function(){
	var inspectableTracks = [];
	var inspectableTrackIdSet = hb.getInspectableTrackIdSet();
	for ( var i = 0; i < hb.tracks.length; i++ ) {
	    var t = hb.tracks[i];
	    if ( inspectableTrackIdSet[t.id] ) {
		inspectableTracks.push(t);
	    }
	}
	return inspectableTracks;
    };

    hb.getInspectableTrackIdSet = function(){
	var inspectableIdSet = {};
	for ( var i = 0; i < hb.tracks.length; i++ ) {
	    var t = hb.tracks[i];
	    if ( t.visible ) {
		if ( t.type === "group" ) {
		    for ( var ii=0; ii < t.trackIds.length; ii++ ) {
			var tid = t.trackIds[ii];
			inspectableIdSet[tid]=1;
		    }
		} else {
		    inspectableIdSet[t.id]=1;
		}
	    }
	}
	return inspectableIdSet;
    };

    hb.getRawSequence = function(a,z){
	a--; // a is 1 based.
	z--;
	return hb.sequence.data.substr(a,(z-a+1));
    };

    hb.selectSection = function(section) {
	hb.selectedSection = section;
	var inspectTracks = hb.getInspectableTracks();
	hb.sPanel.update(section,inspectTracks);
    };

    hb.editRange = function(a,z) {
	if ( a > z ) {
	    var temp = a;
	    a = z;
	    z = temp;
	}
	a++;
	alert("Editing range " + a + "-" + z + ":\n'" + hb.getRawSequence(a,z) + "'") ;
    };

    hb.notecount = function(track){
	if (track.notes.length > 0 ) {
	    return track.notes.length;
	} else if ( track.notecount ) {
	    return track.notecount;
	}
	return 0;
    };

    // bounds adjustment to fill screen (should be optional)

    hb.adjustBounds = function(){
	var windowWidth = $(window).innerWidth();
	var windowHeight = $(window).innerHeight();

	var remainingHeight = windowHeight;
	var headerHeight =  $("#" + hb.prefix + "header").height();

	remainingHeight -= headerHeight;

	// adjust canvas / processing / plot bounds.
	var canvasHeight = hb.map.plotY;//+(hb.defaultTrackSize/2);
	var canvasWidth  = windowWidth;
	var tracks     = hb.visibleTracks;
	for (var i=1; i < tracks.length; i++ ) {
	    canvasHeight+=tracks[i].size;
	}
	hb.map.p.size(canvasWidth,canvasHeight);
	hb.map.setBounds();

	remainingHeight -= canvasHeight;
	remainingHeight -= 30; // what does this fudge consist of?

	// adjust header panel bounds.

	//$("#" + hb.prefix + "header").width(hb.map.plotWidth+"px");
	//$("#" + hb.prefix + "header").width(hb.map.plotWidth+"px");
	$("." + hb.prefix + "w").width(hb.map.plotWidth+"px");
	$("." + hb.prefix + "w2").width(hb.map.plotWidth/2+"px");
	$("." + hb.prefix + "w4").width(hb.map.plotWidth/4+"px");

	//$("." + hb.prefix + "nav").css("text-transform","uppercase");

	// adjust bottom panel bounds.
	$("#" + hb.prefix + "bottomSelectionPanel").css("width",hb.map.plotWidth+"px");
	$("#" + hb.prefix + "bottomSelectionPanel").css("height",remainingHeight+"px");

	var half = (hb.map.plotWidth/2);
	$(hb.sPanel.headerElement).width(half);
	$(hb.sPanel.element).width(half);
	$(hb.nPanel.headerElement).width(half);
	$(hb.nPanel.element).width(half);
    };

    hb.createHeaderPanel = function(){
	// todo. does too much. get rid of table stuff. should image stuff even be here? no.
	var html = '<table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 3px;"><tr><td><!-- 2 columns, 1= misc nav and title, images. 2= login link -->';
	html+='<table border="0" cellpadding="0" cellspacing="0" class="' + hb.prefix+ 'w" id="' + hb.prefix + 'header">';
	html+='<tr><td class="' + hb.prefix + 'w4">';
	if ( hb.leftimage ) {
	    html+='<img src="' + hb.leftimage + '" align="left" height="50" style="margin-bottom: 2px;" /> ';
	}
	html+='</td>';
	html+='<td class="' + hb.prefix + 'w2">';
	html+='<div class="' + hb.prefix + 'title">'+ hb.title + '</div>';
	if ( hb.subtitle ) {
	    html+='<div class="' + hb.prefix + 'title">'+ hb.subtitle +'/div>';
	}
	html+='</td> ';
	html+='<td class="' + hb.prefix + 'w4"> ';
	if ( hb.rightimage ) {
	    html+='<img src="../images/right.png" align="right" height="50" />';
	}
	html+='</td>';
	html+='</tr>';
	html+='<tr>';
	html+='<td id="' + hb.prefix + 'searchBox"><a href="x" id="' + hb.prefix + 'showSearchDialog">Search Text</a></td>';
	html+='<td class="' + hb.prefix + 'nav""> <a id="' + hb.prefix + 'panLeft" href="x">&lt; Left</a> | <a id="' + hb.prefix + 'zoomIn" href="x">+ Zoom In</a>  | <a id="'  + hb.prefix + 'zoomOut" href="x">Zoom Out -</a> | <a id="' + hb.prefix + 'panRight" href="x">Right &gt;</a></td>';
	html+='<td id="' + hb.prefix + 'settingsBox"><a href="x" id="' + hb.prefix + 'showSettingsDialog">Settings</a></td>';
	html+='</tr>';
	html+='</table></td>';
	// needs to be conditional.
	if ( hb.loginlink ) {
	    html+='<td><span class="' + hb.prefix + 'nav" style="margin: 15px;"> [ <a href="/user" id="' + hb.loginlink + '">login to edit</a> ]</span> </td>';
	}
	html+='</tr></table>';
	return html;
    };

    hb.createHighbrowDiv = function(){
	var html = "";
	html+="\n<div id=\"" + hb.prefix + "panel\">\n";
	html+=hb.createHeaderPanel();
	html+="<canvas id=\"" + hb.prefix + "mapPanel\" width=\"1000px\" height=\"100px\"></canvas>\n";
	html+="<div id=\"" + hb.prefix + "bottomSelectionPanel\" style=\"width:870px; height:400px;float:left;\">\n";
	html+="<div id=\"" + hb.prefix + "sectionHeader\" style=\"width:50%;float:left;text-align:center;font-weight: bold;padding-top: 5px\">Section</div>\n";
	html+="<div id=\"" + hb.prefix + "notesHeader\" style=\"width:50%;float:right;text-align:center;font-weight: bold;padding-top: 5px;\">Notes</div>\n";
	html+="<div id=\"" + hb.prefix + "sectionPanel\" style=\"width:50%;height:100%;overflow:auto;float:left;\"><p style=\"text-align: center;\"></p></div>\n";
	html+="<div id=\"" + hb.prefix + "notesPanel\" style=\"width:50%;height:100%;overflow:auto;float:right;\"><p style=\"text-align: center;\"></p></div>\n";
	html+="</div>\n"; // bottom selection panel
	html+="</div>\n"; // highbrow panel
	$("#"+hb.container).html(html);
    };
  
    // track creation methods.

    hb.addTrack = function(t) {
	// add a track to the myriad places it needs to go.
	t.order = hb.tracks.length;
	hb.tracks.push(t);
	hb.visibleTracks.push(t);
	hb.trackById[t.id]=t;
	hb.settingsDialog.trackAdded(t);
	hb.adjustBounds();
	hb.filterTracks();
    };

    hb.initTrack = function(){
	var t ={ "notes": [] };
	t.size = hb.map.defaultTrackSize;
	t.visible = true;
	return t;
    };


    // crude html generation methods.

    hb.tag = function(t,args){
	var contents = "";
	var attributes = "";
	for (var i=0; i < args.length; i++ ) {
	    if ( args[i] instanceof Object) {
		for ( var key in args[i] ){
		    attributes+= " " + key + "=" + "\"" + args[i][key] + "\"";
		}
	    } else {
		contents+=args[i];
	    }
	}
	var html = "<" + t + attributes + ">" + contents + "</" + t + ">";
	return html;
    };

    hb.td = function(){
	return hb.tag("td",td.arguments);
    };

    hb.tr = function(){
	return hb.tag("tr",tr.arguments);
    };

    hb.div = function(){
	return hb.tag("div",div.arguments);
    };

    hb.cb = function(){
	var args = [];
	args.push( { "type": "checkbox" });
	var i = 0;
	if (hb.cb.arguments[0]===true){
	    args.push( { "checked" : "checked" } );
	}
	i=1;
	for ( i; i<arguments.length; i++ ) {
	    args.push(arguments[i]);
	}
	return hb.tag("input",args);
    };

    hb.cbChecked = function(id){
	return $(id+":checked").val() !== undefined; 
    };

  
    hb.dump = function(object) {
	return JSON.stringify(object,null,2);
    };

    hb.init();
};