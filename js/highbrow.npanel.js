
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
		hb.editor.editReply(notes[noteIndex]);
	    } else {
		nPanel.testNote= notes[noteIndex];
		throw "Unknown data-action: " + action;
	    }
	});
    };

    var renderReply = function(noteIndex,note,replyIndex,reply){
	return '<li>' + reply.content + '</li>';
    };

    var renderNote = function(noteIndex,note){
	var html = '<li>';
	var morehypertext="";
	if ( note.sloc ) {
	    morehypertext = note.sloc;
	}
	var morelink =  "";
	if (note.url) {
	    var base = "";
	    if ( note.track.base ) {
		base = note.track.base;
	    }
	    morelink = "[&nbsp;<a target='newtab' href='" + base + note.url + "'>" + morehypertext + "</a>&nbsp;]"; 
	}
	var content = note.content ? note.content : note.pre;
	var title   = note.title   ? (note.title + "<br/>")  : "";
	var addAction = function(action){ return '<a href="" data-action="' + action + '" data-note="' + noteIndex + '">' + action + '</a>'; };
	var editLink = '<div>[ ' + addAction("reply");
	if ( note.track.editable ) {
	    editLink += ' | ' + addAction('edit') + ' | ' + addAction('delete');
	    visEditNotes.push(note);
	}
	editLink += ']</div>';
	html += note.track.name + ": " + title + content + " " + morelink + editLink;
	if ( note.hasOwnProperty("replies") ) {
	    html+="<ul>";
	    var replies = note.replies;
	    $.each(replies, function(replyIndex, reply) {
		html+= renderReply(noteIndex, note,replyIndex,reply);
	    });
	    html+="</ul>";
	}
	html += "</li>";
	return html;
    };

    

    nPanel.showSpNotes = function(sp) {
	//$(nPanel.element).html("Will show notes at sp: " + sp);
	var html = "<ul>";
	notes = hb.getNotes(hb.getInspectableTracks(),{ start: sp, stop: sp });
	var spa = sp;
	var spz = sp;
	$.each(notes, function(noteIndex, note) {
	    html += renderNote(noteIndex, note);
	    spa = spa < note.start ? spa : note.start;
	    spz = spz > note.stop ?  spz : note.stop;
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
