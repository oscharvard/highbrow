var HighbrowNoteEditor = this.HighbrowNoteEditor = function(hb,conf) {
    
    "use strict";
    
    if (! (this instanceof HighbrowNoteEditor)) throw "called HighbrowNoteEditor constructor as if it were a function: missing 'new'.";
    var editor = this;
    var jqd = null; // jquery dialog object.
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
	    var command = {"id": ps.object.id};
	    command.verb = ps.verb;
	    command.type = ps.type;
	    // clone the object so we can remove fields that don't need to be saved.
	    var ignoreKeys = [];
	    if ( ps.type === "note" && ps.context ) {
		ignoreKeys = [ "track" ];
	    } else if ( ps.type === "track" ) {
		ignoreKeys = ['size','order','min','max','pxScore','notes','debug'];
	    } else {
		alert("Strange error.");
	    }
	    //alert("Command: " + command.verb);
	    if ( command.verb==="replace"){
		var meta = selectiveClone(ps.object,"id",ignoreKeys);
		//alert("meta id: " + meta.id);
		//alert("meta(a): " + JSON.stringify(meta,null,2));
		if ( ps.type === "note" && ps.context ) {
		    meta.trackid = ps.context.id;
		}
	    }
	    command.meta = meta;
	    commands.push(command);
	}
	if ( commands.length > 0 ) {
	    var commandsJSON = JSON.stringify(commands,null,2)
	    alert("sending following to server: commands=" +  commandsJSON +"\n"+url+"?commands="+escape(commandsJSON));
	    $.ajax({
		    type: 'POST',
		    url: url,
		    data: { "commands" : commandsJSON},
		    success: function(data, textStatus, jqXHR) { var alert="Your edits have been saved to the server.\nServer says:\n" + textStatus; },
		    error: function(jqXHR, textStatus, errorThrown) { alert("Error saving edits to server.\nServer says:\nerrorThrown: \n" + errorThrown + "\ntextStatus:\n" + textStatus + "\njqXHR.reponseText: \n" + jqXHR.responseText); }
		});
	}
    };


    var initDialog = function(){
	var html="";
	var trackSelector = '<select id="' + hb.prefix +'trackSelector" style="align: right;"></select>';
	html+= '<form id="' + hb.prefix + 'editForm">';
	html+='Annotating from position <span><a data-dir="0" data-delta="-1" href="">&lt;</a> <span id="' + hb.prefix + 'editStartDisplay"></span> <a data-dir="0" data-delta="1" href="">&gt;</a> to  <a data-dir="1" data-delta="-1" href="">&lt;</a> <span id="' + hb.prefix + 'editStopDisplay"></span>  <a data-dir="1" data-delta="1" href="">&gt;</a></span><span id="' + hb.prefix + 'editText"></span>';
	html+='<div> <input type="text" id="' + hb.prefix + 'editNoteTitle" style="width: 300px;" value="Untitled Note"></input> ' + trackSelector + '</div>';
	html+='<div><textarea class="jquery_ckeditor" style="width:600px;" id="' + hb.prefix + 'editNoteContent">"+"</textarea></div>';
	html+= '</form>';
	jqd = $('<div class="'+hb.prefix+'misc" id="'+hb.prefix+'editor"></div>')
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
			n.id       = editor.editId ? editor.editId : (t.id + "_" + hb.notecount(t)+1);
			n.content  = $('#' + hb.prefix + 'editNoteContent').val();
			n.title    = $('#' + hb.prefix + 'editNoteTitle').val();
			n.updated = Date.now();
			if (  ! editor.editId ) {
			    n.created  = Date.now();
			    t.notes.push(n);
			}
			editor.queueSave("replace","note",n,t);
			hb.sPanel.update();
			jqd.dialog("close");
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

    var updateEditDialog = function(note){
	// fill in note edit fields with current note values (or clear).
	editor.editStart = note.start;
	editor.editStop  = note.stop;
	var defaultTrackId=null;
	if ( note.id ) {
	    // editing existing note.
	    editor.editId = note.id;
	    $('#' + hb.prefix + 'editNoteTitle').val( note.title );
	    $('#' + hb.prefix + 'editNoteContent').val( note.content );
	    defaultTrackId = note.track.id;
	} else {
	    // editing empty (new) note.
	    editor.editId='';
	    $('#' + hb.prefix + 'editNoteTitle').val( 'Untitled Note' );
	    $('#' + hb.prefix + 'editNoteContent').val( '' );
	    defaultTrackId = editor.lastEditedTrackId;
	}
	updateEditSelection();
	updateTrackSelector(defaultTrackId);
    };

    var updateEditSelection = function(){
	$('#' + hb.prefix + 'editStartDisplay').html(editor.editStart);
	$('#' + hb.prefix + 'editStopDisplay').html(editor.editStop);
	$('#' + hb.prefix + 'editText').html( '<pre>&#8220;' + sequence.data.substr(editor.editStart-1,(editor.editStop-editor.editStart)+1)  + '&#8221;</pre>');
    };

    editor.queueSave= function(verb,type,object,context){
	var save = { "verb" : verb };
	alert("queueing save of type : " + type);
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
	updateEditSelection();
	return false;
    };

    editor.editNote = function(note){
	jqd.dialog('open');
	updateEditDialog(note);
	return false;
    };
    
    editor.deleteNote = function(note){
	editor.queueSave("delete","note",note,note.track);	
    };

    initDialog();
    attachListeners();
};


