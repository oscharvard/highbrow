
Highbrow.NotesPanel = this.Highbrow.NotesPanel = function(hb,conf) {
    "use strict";
    if (! (this instanceof Highbrow.NotesPanel)) throw "called Highbrow.NotesPanel constructor as if it were a function: missing 'new'.";
    var nPanel = this;

    nPanel.testNote = null;

    var notes=[];

    nPanel.element = document.getElementById(conf.notesPanel);
    nPanel.headerElement = document.getElementById(conf.notesHeader);

    nPanel.showHelp = function() {
	$(nPanel.element).html('<p class="HB_panelHelp">Click on a <span class="HB_noted">note</span> in the text on the right to inspect it here.</p>');    
    };

    nPanel.showHelp();

    var attachListeners = function(){
	$("#"+nPanel.element.id).on("click","a",function(event){
	    event.preventDefault();
	    var action    = event.target.getAttribute('data-action');
	    var noteIndex = parseInt(event.target.getAttribute('data-note'));
	    if ( action === 'edit' ) {
		hb.editor.editNote(notes[noteIndex]);
	    } else if ( action === 'delete' ) {
		hb.editor.deleteNote(notes[noteIndex]);
	    } else if ( action === 'reply' ) {
		alert("Placeholder for reply!");
	    } else {
		nPanel.testNote= notes[noteIndex];
		throw "Unknown data-action: " + action;
	    }
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
	    var addAction = function(action){ return '<a href="" data-action="' + action + '" data-note="' + index + '">' + action + '</a>'; };
	    var editLink = '<div>[ ' + addAction("reply");
	    if ( n.track.editable ) {
		editLink += ' | ' + addAction('edit') + ' | ' + addAction('delete');
		visEditNotes.push(n);
	    }
	    editLink += ']</div>';
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
