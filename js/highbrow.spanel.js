
Highbrow.SequencePanel = this.Highbrow.SequencePanel = function(hb,conf) {

    //"use strict";

    // Shows sequence corresponding to selected structure note.
    // Allows region region to be selected for display of overlapping notes in note panel
    // or adding new note.

    if (! (this instanceof Highbrow.SequencePanel)) throw "called Highbrow.SequencePanel constructor as if it were a function: missing 'new'.";
    var sPanel = this;
    var curentSection, currentInspectTracks;

    sPanel.init = function() {
	sPanel.hb = hb;
	sPanel.element = document.getElementById(conf.sequencePanel);
	sPanel.headerElement = document.getElementById(conf.sequenceHeader);
	sPanel.attachMouseListeners();
	sPanel.showHelp();
    };


    sPanel.showHelp = function() {
	$(sPanel.element).html('<p class="'+hb.prefix+'_panelHelp">Click on a section above to inspect it here.</p>');    
    };

    // sequence annotation range selection methods.
    // problems: if you mousedown or mouseup outside a div, it can get confused.
    // usually works well enough.

    sPanel.attachMouseListeners = function(){

	$("#"+sPanel.element.id).on("mousedown","div",function(event){
		// track when mousedown happen as annotation start.
		//alert("Mouse Down! " + event.target.getAttribute('data-spa'));
		var offset = event.target.getAttribute('data-spa')
		sPanel.markSelectedSpaOffset(offset);
	    });
	$("#"+sPanel.element.id).on("mouseup","div",function(event){
		// if mouse moved since down, assume we want to edit from that point to this.
		//alert("Mouse Up! " + event.target.getAttribute('data-spa'));
		var offset = event.target.getAttribute('data-spa');
		//alert("mouseup offset: " + offset);
		$(hb.nPanel.element).html("mousedown offset: " + offset);
		sPanel.markSelectedSpzOffset(offset);
		sPanel.applySelectedRange();
		if ( sPanel.selectedSpa === sPanel.selectedSpz ) {
		    sPanel.showSpNotes(sPanel.selectedSpa);
		} else if ( sPanel.selectedSpa > -1 && sPanel.selectedSpz > -1 ) {
		    hb.editRange(sPanel.selectedSpa,sPanel.selectedSpz);		
		} else {
		    var sp = sPanel.selectedSpa > -1 ? sPanel.selectedSpa : sPanel.selectedSpz;
		    if ( sp > -1 ) {
			sPanel.showSpNotes(sp);
		    } else {
			alert("Highbrow couldn't figure out which region you selected: " + sPanel.selectedSpa + "-" + sPanel.selectedSpz + "\n\nTry again?");
		    }
		}
		sPanel.selectedSpa=-1;
		sPanel.selectedSpz =-1;
		sPanel.selectedSpaOffset = -1;
		sPanel.selectedSpzOffset = -1;
	    });	
	$("#"+sPanel.element.id).on("mouseout","div",function(event){
		if ( sPanel.selectedSpaOffset > -1 ) {
		    var offset = event.target.getAttribute('data-spa');
		    //alert("mouseout offset: " + offset); 
		    sPanel.markSelectedSpzOffset(offset);
		}
	    });	
    };


    var getRangeOfAllOverlappingNotes = function(range){
	var notes = hb.getNotes(hb.getInspectableTracks(),range);
	var spa = range.start;
	var spz = range.stop;
	$.each(notes, function(noteIndex, note) {
	    spa = spa < note.start ? spa : note.start;
	    spz = spz > note.stop ?  spz : note.stop;
	});
	return { start: spa, stop: spz };
    };

    var getSmallestNote = function(range){
	var notes = hb.getNotes(hb.getInspectableTracks(),range);
	var smallestNote = null;
	$.each(notes, function(noteIndex, note) {
	    if (smallestNote == null || hb.len(note) <= hb.len(smallestNote)){
		smallestNote = note;
	    }
	});
	return smallestNote;
    };

    sPanel.showSpNotes = function(sp){
	var range = getSmallestNote({'start':sp, 'stop':sp});
	if ( ! range ) {
	    // no overlapping note.
	    range = ({'start':sp, 'stop':sp});
	}
	hb.nPanel.showSpNotes(range);
	markInRange(range);
    };

    var markInRange = function(r){
	// for now, overlapping range. maybe add option for contains.
	$("#"+sPanel.element.id + " span").each(function(){
		var chunk = $(this);
		var chunkSpa = chunk.attr("data-spa");
		var chunkSpz = chunk.attr("data-spz");
		if ( hb.overlaps(r.start,r.stop, chunkSpa,chunkSpz) ) {
		    chunk.css("text-decoration","underline");
		    chunk.css("text-decoration-style","solid");
		} else {
		    chunk.css("text-decoration","none");
		}
	    });
    };

    sPanel.getSelectedRange = function(){
	if(window.getSelection){ 
	    return window.getSelection(); 
	} 
	else if(document.selection){ 
	    return document.selection.createRange(); 
	} else if(document.getSelection){ 
	    alert("Problem getting selected range. Are you using IE or something? Come on!");
	    return document.getSelection(); 
	} 
	alert("Big problem getting selected range.");
    };

    sPanel.markSelectedSpaOffset = function(offset){
	sPanel.selectedSpaOffset=parseInt(offset);
    };

    sPanel.markSelectedSpzOffset = function (offset){
	// this edit start/stop stuff actually seems to work in Chrome, Firefox, Safari!
	// we get a range object which gives us character offsets within the start and stop verses.
	if ( offset ) {
	    offset = parseInt(offset);
	    if ( offset > -1 ) {
		sPanel.selectedSpzOffset= offset;
		$(hb.nPanel.element).html("setting edit stop offset: " + offset);	
		return;
	    }
	}
	$(hb.nPanel.element).html("NOT setting verkackte edit stop offset: " + offset);	
    };

    sPanel.applySelectedRange = function(){
	// think of a better name for this.
	// take the start and stop structural note sequence offsets,
	// combine with html selectedRange info and record range to
	// annotate in sequence coordinates.
	var selectedRange   = sPanel.getSelectedRange();
	sPanel.selectedSpa  = sPanel.selectedSpaOffset + selectedRange.anchorOffset-1;
	sPanel.selectedSpz  = sPanel.selectedSpzOffset  + selectedRange.focusOffset-1;
    };

    // build selection panel UI methods.

    sPanel.update = function(section,inspectTracks){
	// renders text for all "finest grain subsections" in specified section.
	// todo: problem: 
	// If sections are non contiguous -- what about the gaps?
	// if no arguments give, use last. Remember current for reuse.
	currentSection = typeof section !== 'undefined' ? section : currentSection;
	currentInspectTracks = typeof inspectTracks !== 'undefined' ? inspectTracks : currentInspectTracks;
	section = currentSection;
	inspectTracks = currentInspectTracks;
	var sectionNotes = {};
	var subSections = sPanel.fillGaps(section,sPanel.getFinestGrainSubsections(section,[]));
	var sectionNotes = sPanel.buildSectionNotesMap(section,subSections,inspectTracks);	
	var rows = sPanel.buildSelectionRows(subSections,sectionNotes )[0];
	var html = "";
	for (var i=0; i < rows.length; i++ ) {
	    var row = rows[i];
	    html += '<div style="width:100%; ">' + row.textString + "</div>";
	}
	sPanel.updateHtml(html);
	sPanel.updateHeader(section);
	$("#"+sPanel.element.id + " div").css("marginBottom","1px");
	$("#"+sPanel.element.id + " div").css("marginTop","1px");
    };

    sPanel.fillGaps = function(range,subsections) {
	// just pads on the front for now.
	// internal gaps and stop are ignored.
	// note that overlapping structural features will destroy stuff. It's a deep assumption that structural features on the same level do not overlap.
	if ( subsections[0].start > range.start ) {
	    subsections.unshift({ "start": range.start, "stop": subsections[0].stop-1 });
	}
	return subsections;
    };

    sPanel.getFinestGrainSubsections = function(section,subsections) {
	if ( section.children && section.children.length > 0 && section.l <= hb.structureLevels.length) {
	    for (var i=0; i < section.children.length; i++ ) {
		sPanel.getFinestGrainSubsections(section.children[i],subsections);
	    }
	} else {
	    subsections.push(section);
	}
	return subsections;
    };

    sPanel.updateHeader = function(section){
	// todo: displaying id is nasty. should join names of this and all parent sections instead.
	sPanel.headerElement.innerHTML= "" + hb.structure[0].name + " " + section.id;//name;
    };

    sPanel.updateHtml = function(html){
	// not sure why, but jquery is significantly slower than raw js here.
	sPanel.element.innerHTML=html;
	//$(".hbw2").width(mapWidth/2);
    };

    sPanel.buildSectionNotesMap = function(range,sections,inspectTracks,refTileRange){
	var sectionNotes={};
	for (var i=0; i < inspectTracks.length; i++ ) {
	    var t = inspectTracks[i];
	    var notes = [];
	    if ( t.pyramid ) {
		notes = hb.getTiledNotes(t,refTileRange);
	    } else {
		notes = t.notes;
	    }
	    for (var ii=0; ii < notes.length; ii++ ) {
		var n = notes[ii];
		if (hb.overlaps(range.start,range.stop,n.start,n.stop)){
		    for (var iii=0; iii < sections.length; iii++ ) {
			var section = sections[iii];
			if (hb.overlaps(section.start,section.stop,n.start,n.stop)){
			    if ( ! sectionNotes[section.id ] ) {
				sectionNotes[section.id] = new Array();
			    }
			    n.track = t;
			    sectionNotes[section.id].push(n);
			}
		    }
		}
	    }
	}
	return sectionNotes;
    };

    sPanel.buildSelectionRows = function(sections, sectionNotes){
	// builds "rows" consisting of one row per sub-section of selected section.
	// rows consist of display html for section and some metadata.
	var rows = [];
	var maxNoteCount=0;
	var minNoteCount=Number.MAX_VALUE;
	visEditNotes=[];
	// hb.getRawSequence(sn.start,hb.len(sn))
	for (var i=0; i < sections.length; i++ ) {
	    var sn = sections[i];
	    var textString = hb.sequence.data ?  sequence.data.substr(sn.start-1,hb.len(sn)) : "Not sure what to show here instead of raw text."; 
	    var heatmap = [];
	    var notes = sectionNotes[sn.id];
	    if ( ! notes ) {
		notes = [];
	    }
	    var annotationString="<ul>";
	    for (var ii=0; ii < notes.length; ii++ ) {
		var morehypertext = "more";
		var n = notes[ii];
		sPanel.updateHeatmap(heatmap,sn.start,sn,n, textString);

	    }
	    annotationString+="</ul>";
	    var row = {};
	    row.sn=sn;
	    row.heatmap = heatmap;
	    row.textString = textString;
	    row.noteCount = notes.length;
	    row.annotationString = annotationString;
	    if ( row.noteCount > maxNoteCount ) {
		maxNoteCount = row.noteCount;
	    }
	    if ( row.noteCount < minNoteCount ) {
		minNoteCount = row.noteCount;
	    }
	    rows.push(row);
	}
	var heatmapBounds = sPanel.getHeatmapBounds(rows);
	sPanel.applyHeatmap(heatmapBounds,rows);
	return [rows,minNoteCount,maxNoteCount];
    };

    sPanel.updateHeatmap = function(heatmap,offset,sn,n,debug){
	// update char position to density score map for given note.
	var o = hb.getOverlap(sn.start,sn.stop,n.start,n.stop);
	o.start -= offset;
	o.stop  -= offset;
	for ( var i= o.start; i <= o.stop; i++ ) {
	    if ( ! heatmap[i] ) {
		heatmap[i]=0;
	    }
	    heatmap[i]++;
	}
    };

    sPanel.getHeatmapBounds = function(rows){
	var bounds = {};
	bounds.min = Number.MAX_VALUE;
	bounds.max = 0;
	for ( var i=0; i < rows.length; i++ ) {
	    var heatmap = rows[i].heatmap;
	    if ( heatmap.length < rows[i].textString.length ) {
		bounds.min = 0;
	    }
	    for ( var ii=0; ii < heatmap.length; ii++ ) {
		var heat = heatmap[ii];
		if ( ! heat ) {
		    heat = 0;
		}
		if ( heat < bounds.min ) {
		    bounds.min = heat;
		}
		if ( heat > bounds.max ) {
		    bounds.max = heat;
		}
	    }
	}
	return bounds;
    };

    sPanel.applyHeatmap = function(heatmapBounds,rows){
	for ( var i=0; i < rows.length; i++ ) {
	    sPanel.heatmapText(rows[i],heatmapBounds);
	}
    };

    sPanel.chunkHeatmap = function(heatmap,textLength){
	var chunks = [];
	var c= {};
	// open first chunk
	c.start=0;
	c.score=-1;
	// intervening chunks
	for ( var i=0; i < heatmap.length; i++ ) {
	    var score = heatmap[i];
	    if ( ! score ) {
		score = 0;
	    }
	    if ( c.score === -1 ) {
		c.score = score;
	    }
	    if ( score !== c.score ) {
		c.stop = i-1;
		chunks.push(c);
		c = {};
		c.start = i;
		c.score = score;
	    }
	}
	// close last open chunk.
	c.stop  = i-1;
	chunks.push(c);
	// close final chunk, if any
	if ( heatmap.length < textLength-1 ) {
	    c={};
	    c.start=i;
	    c.stop=textLength-1;
	    c.score=0;
	    chunks.push(c);
	}
	return chunks;
    };

    sPanel.heatmapText = function(row,heatmapBounds){
	var chunks = sPanel.chunkHeatmap(row.heatmap,row.textString.length);
	var heatmapText="";
	var alpha = 0.0;
	row.rawTextString = row.textString;
	for (var i=0; i < chunks.length; i++ ) {
	    var c = chunks[i];
	    if ( heatmapBounds.max == heatmapBounds.min ) {
		alpha=0;
	    } else {
		alpha = 1.0 * ( (c.score-heatmapBounds.min) / (heatmapBounds.max-heatmapBounds.min) );
	    }
	    var color = " rgba(255, 255, 0, " + alpha + ") ";
	    var spa = row.sn.start + c.start;
	    var spz = row.sn.start + c.stop;
	    var heatmapData  = ' data-spa="'+ spa +'" data-spz="' + spz +'" ';
	    var heatmapTitle =  ""; //" title=\"chunk:" + c.start + ":" + c.stop + " (" + c.score + ") " + color + "\" ";
	    heatmapText+='<span ' + heatmapData + heatmapTitle + " style=\"background: " + color + "; \">";
	    heatmapText+=row.textString.substr(c.start,hb.len(c));
	    heatmapText+="</span>";
	}
	row.textString=heatmapText;
    };
    sPanel.init();
};
