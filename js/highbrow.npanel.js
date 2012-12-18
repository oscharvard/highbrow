
Highbrow.NotesPanel = this.Highbrow.NotesPanel = function(hb,conf) {
    "use strict";
    if (! (this instanceof Highbrow.NotesPanel)) throw "called Highbrow.NotesPanel constructor as if it were a function: missing 'new'.";
    var nPanel = this;

    nPanel.testNote = null;

    var notes=[];

    nPanel.element = document.getElementById(conf.notesPanel);
    nPanel.headerElement = document.getElementById(conf.notesHeader);

    nPanel.showHelp = function() {
	$(nPanel.element).html('<div class="HB_panelHelp"><p>Welcome to the Highbrow Commentary Browser!</p><p>Click on a <span class="HB_noted">note</span> in the text on the right to inspect it here.</p></div>');    
    };

    nPanel.showHelp();

    var noteAtPath = function(notePath) {
	// notePath represends the index for each nest level of notes delimited by period.
	// 1 = first note
	// 2.1.3 = third reply to first reply to second note.
	var indices = notePath.split(".");
	var note = notes[indices[0]]; 
	$.each(indices, function(level, noteIndex) {
	    if ( level > 0 ) {
		note = note.replies[noteIndex];
	    }
	});
	return note;
    };

    var attachListeners = function(){
	$("#"+nPanel.element.id).on("click","a",function(event){
	    var notePath = event.target.getAttribute('data-note');
	    if  ( notePath ) {
		// if no notepath then presumably a regular link.
		event.preventDefault();
		var action    = event.target.getAttribute('data-action');
		var note      = noteAtPath(notePath);
		if ( action === 'edit' ) {
		    if ( note.parent ) {
			hb.editor.editReply(note.parent,note);
		    } else {
			hb.editor.editNote(note);
		    }
		} else if ( action === 'delete' ) {
		    if ( note.parent ) {
			hb.editor.deleteReply(note);
		    } else {
			hb.editor.deleteNote(note);
		    }
		} else if ( action === 'reply' ) {
		    hb.editor.editReply(note);
		} else {
		    nPanel.testNote= notes;
		    throw "Unknown data-action: " + action;
		}
	    }
	});
    };
    
    var noteIsEditable = function(note) {
	if ( note.hasOwnProperty('user_id') ) {
	    return note.user_id === hb.user.id;
	} else if ( note.hasOwnProperty('track') ) {
	    // TODO: get rid of this.
	    return note.track.editable;
	} else {
	    return false;
	}
    };

    var ellipsizeNoteSequence = function(note){
	if (hb.len(note) > 50) {
	    return hb.getRawSequence(note.start,note.start+30) + '...' + hb.getRawSequence(note.stop-20, note.stop);
	}
	return hb.getRawSequence(note.start,note.stop);
    };
    
    var renderEditLinks = function(noteIndex,note){
	var addAction = function(action){
	    return '<a href="" data-action="' + action + '" data-note="' + noteIndex + '">' + action + '</a>';
	};
	var editLinks = '<div>[ ' + addAction("reply");
	if ( noteIsEditable(note) ) {
	    editLinks += ' | ' + addAction('edit') + ' | ' + addAction('delete');
	}
	editLinks += ']</div>';
	return editLinks;
    };

    var renderAttribution = function(note) {
	var html='<div>';
	if ( note.hasOwnProperty('author') ) {
	    html += 'by ' + note.author.name ;
	}
	if ( note.hasOwnProperty('track') ) {
	    if ( note.track.hasOwnProperty('author') ) {
		html += 'by ' + note.track.author.name + ' ';
	    }
	    html += 'in commentary <em>' + note.track.name + '</em>';
	}
	html += '</div>';
	return html;
    };

    var renderReferenceText = function(note){
	// think about.. no time to implement now.
	if ( note.hasOwnProperty('start') ){
	    return '<div>In reference to: &quot;' + ellipsizeNoteSequence(note) + '&quot;</div>';
	}
	return "";
    };

    var renderNote = function(noteIndex,note){
	var html = '<li style="border-top: 1px dotted gray; list-style: none; margin-top: 6px; padding-top: 6px;">';
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
	var title   = note.title   ? ('<div>' + note.title + "<div/>")  : "";
	var editLinks = hb.user ? renderEditLinks(noteIndex,note) : "";
	var attribution = renderAttribution(note);
	var referenceText = renderReferenceText(note);
	html += title + attribution + referenceText + content + " " + morelink + editLinks;
	if ( note.hasOwnProperty("replies") ) {
	    html+='<ul class="$HBnoteList">';
	    var replies = note.replies;
	    $.each(replies, function(replyIndex, reply) {
		if ( reply.hasOwnProperty("parent_id") && ! reply.hasOwnProperty("parent")){
		    //console.log("attaching parent. is the necessary?");
		    reply.parent = note;
		}
		html+= renderNote(""+noteIndex+"."+replyIndex, reply);
	    });
	    html+="</ul>";
	}
	html += "</li>";
	return html;
    };

    nPanel.showSpNotes = function(range) {
	var html = '<ul class="$HBnoteList">';
	notes = hb.getNotes(hb.getInspectableTracks(),range);
	var spa = range.start;
	var spz = range.stop;
	$.each(notes, function(noteIndex, note) {
	    html += renderNote(noteIndex, note);
	    spa = spa < note.start ? spa : note.start;
	    spz = spz > note.stop ?  spz : note.stop;
	});
	html += "</ul>";
	if ( notes.length === 0 ) {
	    html = "No overlapping notes.";
	}
	$(nPanel.element).html(hb.pre(html));
    };

    attachListeners();
};
