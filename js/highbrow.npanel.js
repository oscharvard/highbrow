
Highbrow.NotesPanel = this.Highbrow.NotesPanel = function(hb,conf) {
    "use strict";
    if (! (this instanceof Highbrow.NotesPanel)) throw "called Highbrow.NotesPanel constructor as if it were a function: missing 'new'.";
    var nPanel = this;

    var notes=[];

    nPanel.element = document.getElementById(conf.notesPanel);
    nPanel.headerElement = document.getElementById(conf.notesHeader);

    nPanel.showHelp = function() {
	$(nPanel.element).html('<p class="HB_panelHelp">Click on a <span class="HB_noted">note</span> in the text on the right to inspect it here.</p>');    
    };

    nPanel.showHelp();


    var attachListeners = function(){
	// reinos: before ian lunch. pasted from edit.js
	$("#"+nPanel.element.id).on("click","a",function(event){
		// adjust bounds of annotated region.
		event.preventDefault();
		var action    = event.target.getAttribute('data-action');
		var noteIndex = parseInt(event.target.getAttribute('data-note'));
		alert("action: " + action + ", noteIndex: " + noteIndex);
		if ( action === 'edit' ) {
		    hb.editor.editNote(notes[noteIndex]);
		} else if ( action === 'delete' ) {
		    hb.editor.deleteNote(notes[noteIndex]);
		} else {
		    throw "Unknown data-action: " + action;
		}
		//editor.nudge(direction,delta);
	    });
    };


    nPanel.showSpNotes = function(sp) {
	//$(nPanel.element).html("Will show notes at sp: " + sp);
	var html = "<ul>";
	notes = hb.getNotes(hb.getInspectableTracks(),{ start: sp, stop: sp });
	var spa = sp;
	var spz = sp;
	$.each(notes, function(index, n) {
		html += '<li>';
		var morehypertext="";
		if ( n.sloc ) {
		    morehypertext = n.sloc;
		}
		var morelink =  "";
		if (n.url) {
		    var base = "";
		    if ( n.track.base ) {
			base = n.track.base;
		    }
		    morelink = "[&nbsp;<a target='newtab' href='" + base + n.url + "'>" + morehypertext + "</a>&nbsp;]"; 
		}
		var content = n.content ? n.content : n.pre;
		var title   = n.title   ? (n.title + "<br/>")  : "";
		var editLink = "";
		if ( n.track.editable ) {
		    editLink = '<div>[ <a href="" data-action="edit" data-note="' + index + '">edit</a> | <a href="" data-action="delete" data-note="' + index + '">delete</a> ]</div>';
		    visEditNotes.push(n);

		}
		html += n.track.name + ": " + title + content + " " + morelink + editLink;
		html += "</li>";
		spa = spa < n.start ? spa : n.start;
		spz = spz > n.stop ?  spz : n.stop;
	    });
	html += "</ul>";
	if ( notes.length === 0 ) {
	    html = "No overlapping notes.";
	}
	$(nPanel.element).html(html);
	return { start: spa, stop: spz };
    };

    attachListeners();
};
