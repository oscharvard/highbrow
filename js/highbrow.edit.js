Highbrow.NoteEditor = this.Highbrow.NoteEditor = function(hb,conf) {
    
    "use strict";
    
    if (! (this instanceof Highbrow.NoteEditor)) throw "called Highbrow.NoteEditor constructor as if it were a function: missing 'new'.";
    var editor = this;
    var note_jqd = null; // jquery dialog object for note edit widget.
    var reply_jqd = null; // jquery dialog object for reply edit widget.
    var pendingSaves = [];

    //alert("Hi Edit");

    var selectiveClone = function(source,seedKey,ignoreKeys) {
	// hack. must be better way. no time.
	// processing.js seems to be doing something weird with JSON.stringify.
	// we need to instantiate the object with a seedKey or JSON.stringify
	// returns empty array. suspect strange processing.js interaction.
	// one more reason to get out of this weird hybrid situation.
	// todo: is this still necessary?
	var target = { "id" : source.id };
	$.each(source, function(key, value) { 
		if ( key !== seedKey && ($.inArray(key,ignoreKeys) === -1) ) {
		    target[key] = source[key];
		}
	    });
	return target;
    };
    
    var pushPendingSaves = function() {
	var pushedSaves = [];
	// hard coded. could be multiple "track manager" urls. fix eventually.
	var url = hb.editService;
	var commands = [];
	for (var i=0; i < pendingSaves.length; i++ ) {
	    var ps = pendingSaves[i];
	    if ( ps.pushed ) {
		continue;
	    }
	    //alert("ps id: " + ps.verb + " " +  ps.type + " " + ps.object.id);
	    ps.pushed = new Date();
	    pushedSaves.push(ps);
	    var command = {};
	    command.verb = ps.verb;
	    command.type = ps.type;
	    // clone the object so we can remove fields that don't need to be saved.
	    // unsafe: should be explicit which fields to save, not the reverse.
	    var ignoreKeys = [];
	    if ( ps.type === "note" && ps.context ) {
		ignoreKeys = [ 'track','replies' ];
	    } else if ( ps.type === "commentary" ) {
		ignoreKeys = ['size','order','min','max','pxScore','notes','debug'];
	    } else if ( ps.type === 'reply') {
		ignoreKeys = ["parent","replies"];
	    } else {
		alert("Strange error.");
	    }
	    //alert("Command: " + command.verb);
	    var meta = {};
	    if ( command.verb==="add" || command.verb==="update"){
		meta = selectiveClone(ps.object,"id",ignoreKeys);
		if ( ps.type === 'reply' ) {
		    meta.parent_id = ps.object.parent.id;
		    meta.thread_id = getRootNote(ps.object).id;
		}
		//alert("meta id: " + meta.id);
		//alert("meta(a): " + JSON.stringify(meta,null,2));
		if ( ps.type === "note" && ps.context ) {
		    meta.commentary_id = ps.context.id;
		}
	    } else {
		meta = { 'id' : ps.object.id };
	    }
	    command.meta = meta;
	    commands.push(command);
	}
	if ( commands.length > 0 ) {
	    var commandsJSON = JSON.stringify(commands,null,2);
	    //alert("sending following to server: commands=" +  commandsJSON +"\n"+url+"?commands="+escape(commandsJSON));
	    $.ajax({
		type: 'POST',
		url: url,
		dataType: 'json',
		data: { "commands" : commandsJSON},
		success: function(data, textStatus, jqXHR) {
		    $.each(data, function(index, commandResponse) {
			// update object ids for inserts.
			if ( pushedSaves[index].verb === 'add' ) {
			    pushedSaves[index].object.id = commandResponse.id;
			    if ( pushedSaves[index].type === 'commentary' ) {
				hb.indexTracks();
			    }
			}
		    });
		    //var alert="Your edits have been saved to the server.\nServer says:\n" + textStatus;
		},
		error: function(jqXHR, textStatus, errorThrown) { alert("Error saving edits to server.\nServer says:\nerrorThrown: \n" + errorThrown + "\ntextStatus:\n" + textStatus + "\njqXHR.reponseText: \n" + jqXHR.responseText); }
	    });
	}
    };


    var initNoteEditDialog = function(){
	var html="";
	var trackSelector = '<select id="' + hb.prefix +'trackSelector" style="align: right;"></select>';
	html+= '<form id="' + hb.prefix + 'noteEditForm">';
	html+='Annotating from position <span><a data-dir="0" data-delta="-1" href="">&lt;</a> <span id="' + hb.prefix + 'editStartDisplay"></span> <a data-dir="0" data-delta="1" href="">&gt;</a> to  <a data-dir="1" data-delta="-1" href="">&lt;</a> <span id="' + hb.prefix + 'editStopDisplay"></span>  <a data-dir="1" data-delta="1" href="">&gt;</a></span><span id="' + hb.prefix + 'editText"></span>';
	html+='<div> <input type="text" id="' + hb.prefix + 'editNoteTitle" style="width: 300px;" value="Untitled Note"></input> ' + trackSelector + '</div>';
	html+='<div><textarea class="jquery_ckeditor" style="width:600px;" id="' + hb.prefix + 'editNoteContent">"+"</textarea></div>';
	html+= '</form>';
	note_jqd = $('<div class="'+hb.prefix+'misc" id="'+hb.prefix+'editor"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Edit Note',
		height: 450,
		width: 650,
		buttons:
		{
		    "Done" : function() {
			var t = hb.trackById[ $('#' + hb.prefix + 'trackSelector').val() ];
			editor.lastEditedTrackId = t.id;
			var n = { "start" : editor.editStart };
			n.stop     = editor.editStop;
			n.content  = $('#' + hb.prefix + 'editNoteContent').val();
			n.title    = $('#' + hb.prefix + 'editNoteTitle').val();
			var verb = null;
			if (  ! editor.note ) {
			    verb = "add";
			    t.notes.push(n);
			} else {
			    verb = "update";
			    n.id       = editor.note.id;
			    editor.note.start = n.start;
			    editor.note.stop  = n.stop;
			    editor.note.title = n.title;
			    editor.note.content = n.content;
			}
			editor.queueSave(verb,"note",n,t);
			hb.sPanel.update();
			hb.sPanel.showSpNotes(n.start);
			note_jqd.dialog("close");
		    }
		}});
	var config = { toolbar: [ 
				 ['Bold', 'Italic', '-', 'NumberedList', 'BulletedList', '-', 'Link', 'Unlink', 'Image', 'Youtube'], 
				 ['UIColor']
				  ]
	};
	$('.jquery_ckeditor').ckeditor(config);
    };


    var getRootNote = function(note) {
	if ( note.hasOwnProperty("parent") ) {
	    console.log("reinos: has parent...");
	    return getRootNote(note.parent);
	} else {
	    console.log("reinos: no parent. returning note.");
	    return note;
	}
    };
    
    var initReplyEditDialog = function(){
	var html="";
	html+= '<form id="$HBreplyEditForm">';
	html+= '<div><input type="text" id="$HBeditReplyTitle" style="width: 300px;" value=""></input> </div>';
	html+= '<div><textarea class="jquery_ckeditor" style="width:600px;" id="$HBeditReplyContent">"+"</textarea></div>';
	html+= '</form>';
	reply_jqd = $(hb.pre('<div class="$HBmisc" id="$HBreplyEditor"></div>'))
	    .html(hb.pre(html))
	    .dialog({
		autoOpen: false,
		title: 'Edit Reply',
		height: 450,
		width: 650,
		buttons:
		{
		    "Done" : function() {
			var reply = {};
			reply.content  = $('#' + hb.prefix + 'editReplyContent').val();
			reply.title    = $('#' + hb.prefix + 'editReplyTitle').val();
			var verb = null;
			if ( editor.reply ) {
			    // update existing note.
			    reply.id = editor.reply.id;
			    editor.reply.content = reply.content;
			    editor.reply.title   = reply.title;
			    reply.parent = editor.reply.parent;
			    verb = "update";
			} else {
			    // create new note.
			    reply.parent = editor.replyTo;
			    reply.user_id = hb.user.id;
			    reply.author = hb.user;
			    if ( ! editor.replyTo.hasOwnProperty("replies")){
				editor.replyTo.replies=[];
			    }
			    editor.replyTo.replies.push(reply);
			    verb = "add";
			}
			editor.queueSave(verb,"reply",reply);
			hb.sPanel.update();
			hb.sPanel.showSpNotes(getRootNote(reply).start);
			reply_jqd.dialog("close");
		    }
		}});
	var config = { toolbar: [ 
				 ['Bold', 'Italic', '-', 'NumberedList', 'BulletedList', '-', 'Link', 'Unlink', 'Image', 'Youtube'], 
				 ['UIColor']
				  ]
	};
	$('.jquery_ckeditor').ckeditor(config);
    };


    var attachListeners = function(){
	$("#"+hb.prefix+"editor").on("click","a",function(event){
		// adjust bounds of annotated region.
		event.preventDefault();
		var direction = parseInt(event.target.getAttribute('data-dir'));
		var delta = parseInt(event.target.getAttribute('data-delta'));
		//alert("nudge: " + direction + "," + delta);
		editor.nudge(direction,delta);
	    });
    };

    var updateReplyEditDialog = function(note,reply){
	editor.replyTo = note;
	if ( reply ) {
	    // edit existing reply.
	    editor.reply = reply;
	    $(hb.pre('#$HBeditReplyTitle')).val( reply.title );
	    $(hb.pre('#$HBeditReplyContent')).val( reply.content );
	} else {
	    // this is a new reply.
	    editor.reply = null;
	    $(hb.pre('#$HBeditReplyTitle')).val( 'Re:' + note.title );
	    $(hb.pre('#$HBeditReplyContent')).val( '' );
	}
    };

    var updateNoteEditDialog = function(note){
	// fill in note edit fields with current note values (or clear).
	editor.editStart = note.start;
	editor.editStop  = note.stop;
	var defaultTrackId=null;
	if ( note.id ) {
	    // editing existing note.
	    editor.note = note;
	    $('#' + hb.prefix + 'editNoteTitle').val( note.title );
	    $('#' + hb.prefix + 'editNoteContent').val( note.content );
	    defaultTrackId = note.track.id;
	} else {
	    // editing empty (new) note.
	    editor.note=null;
	    $('#' + hb.prefix + 'editNoteTitle').val( 'Untitled Note' );
	    $('#' + hb.prefix + 'editNoteContent').val( '' );
	    defaultTrackId = editor.lastEditedTrackId;
	}
	updateNoteEditSelection();
	updateTrackSelector(defaultTrackId);
    };

    var updateNoteEditSelection = function(){
	$('#' + hb.prefix + 'editStartDisplay').html(editor.editStart);
	$('#' + hb.prefix + 'editStopDisplay').html(editor.editStop);
	$('#' + hb.prefix + 'editText').html( '<pre>&#8220;' + sequence.data.substr(editor.editStart-1,(editor.editStop-editor.editStart)+1)  + '&#8221;</pre>');
    };

    editor.queueSave= function(verb,type,object,context){
	var save = { "verb" : verb };
	//alert("queueing save of type : " + type);
	save.type = type;
	save.object = object;
	save.context = context;
	pendingSaves.push( save );
	pushPendingSaves(); // why is this a 2 step process? I guess so we could batch them at some point.
    };

    var updateTrackSelector = function(defaultTrackId){
	var html ="";
	for (var i=0; i < hb.editableTracks.length; i++ ) {
	    html+='<option value="' + hb.editableTracks[i].id;
	    if ( defaultTrackId && hb.editableTracks[i].id === defaultTrackId ) {
		html += '" selected="selected';
	    }
	    html+= '">' + hb.editableTracks[i].name + '</option>\n';
	}
	$('#' + hb.prefix + 'trackSelector').html(html);
    };

    editor.nudge = function(direction, delta){
	if ( direction  === 0 ) {
	    editor.editStart += delta;
	} else if ( direction === 1 ) {
	    editor.editStop += delta;
	}
	updateNoteEditSelection();
	return false;
    };

    editor.editNote = function(note){
	note_jqd.dialog('open');
	updateNoteEditDialog(note);
	return false;
    };
    
    editor.editReply = function(note,reply){
	reply_jqd.dialog('open');
	updateReplyEditDialog(note,reply);
	return false;
    };

    editor.deleteNote = function(note){
	editor.queueSave("delete","note",note,note.track);	
	var notes = note.track.notes;
	for ( var i=0; i < notes.length; i++ ) {
	    if (note.id === notes[i].id ) {
		notes.splice(i,1);
		break;
	    }
	}
	hb.sPanel.update();
	hb.sPanel.showSpNotes(note.start);
    };

    editor.deleteReply = function(note){
	// REINOS: track argument is problematic.
	//editor.queueSave("delete","reply",note, note.track);	
	var notes = note.parent.replies;
	for ( var i=0; i < notes.length; i++ ) {
	    if (note.id === notes[i].id ) {
		notes.splice(i,1);
		break;
	    }
	}
	hb.sPanel.update();
	hb.sPanel.showSpNotes(note.start);
    };

    initNoteEditDialog();
    initReplyEditDialog();
    attachListeners();
};


