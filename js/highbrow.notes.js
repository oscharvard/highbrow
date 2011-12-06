
var HighbrowNotesPanel = this.HighbrowNotesPanel = function(hb,conf) {
    if (! (this instanceof HighbrowNotesPanel)) throw "called HighbrowNotesPanel constructor as if it were a function: missing 'new'.";
    var nPanel = this;
    nPanel.element = document.getElementById(conf.notesPanel);
    nPanel.headerElement = document.getElementById(conf.notesHeader);

    nPanel.showSpNotes = function(sp) {
	//$(nPanel.element).html("Will show notes at sp: " + sp);
	var html = "";
	var notes = hb.getNotes(hb.getInspectableTracks(),{ start: sp, stop: sp });
	$.each(notes, function(index, n) {
		html += '<div class="HB_note">';
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
		    editLink = '<div>[ <a href="" onclick="HB.editNote(' + visEditNotes.length + '); return false;">edit</a> | <a href="" onclick="HB.deleteNote(' + visEditNotes.length + '); return false;">delete</a> ]</div>';
		    visEditNotes.push(n);
		}
		html += n.track.name + ": " + title + content + " " + morelink + editLink;
		html += "</div>";
	    });
	if ( notes.length === 0 ) {
	    html = "No overlapping notes.";
	}
	$(nPanel.element).html(html);
    };

};
