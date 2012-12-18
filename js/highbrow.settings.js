
Highbrow.SettingsDialog = this.Highbrow.SettingsDialog = function(hb,conf) {
    
    // Abbreviations: TT = Track Table ; GT = Group Table

    "use strict;"

    if (! (this instanceof Highbrow.SettingsDialog)) throw "called Highbrow.SettingsDialog constructor as if it were a function: missing 'new'.";

    var ttId    = hb.prefix + "tt"; // track table
    var gtId    = hb.prefix + "gt"; // group table

    var ttDivId = ttId + "Div";
    var gtDivId = gtId + "Div";

    var ttData  = [];
    var ttCols  = [];
    var gtData  = [];
    var gtCols  = [];
    
    var newTT   = false; 

    var ttjqd  ="";

    var currentGroup=null;

    // public methods.

    this.onDraw = function(){
	// for some reason this has to happen after a bunch of other stuff.
	// wierd. but whatever. This works. 
	// Actually it doesn't.
	if ( newTT && $('#'+ttId).length > 0 ) {
	    dataTabulate('#'+ttId,ttData,ttCols);
	    dataTabulate('#'+gtId,gtData,gtCols);
	    newTT=false;
	}
    };

    this.trackAdded = function(t){
	var row = [t.id,t.visible,t.order,t.name,t.type,hb.notecount(t)];
	$('#'+ttId).dataTable().fnAddData(row);
	if ( t.type != "group" ) {
	    $('#'+gtId).dataTable().fnAddData(row);
	};
    };

    var showTT = function(){
	dataTabulate(ttId,ttData,ttCols);
	ttjqd.dialog('open');
	return false;
    };

    
    var showGT = function(){
	dataTabulate(gtId,gtData,gtCols);
	gtjqd.dialog('open');
	return false;
    };


    var groupLink = function(trackId){
	var t = hb.trackById[trackId];
	if ( t.type == "group" ) {
	    return hb.pre(t.type + ' (<a href="x" data-track="' + t.id + '" class="$HBgroupEditLink">' + t.trackIds.length  + ' members </a>)');
	}
	return t.type;
    };

    var dataTabulate = function(tableId,tableData,tableColumns){
	// turn data and html table into a jquery datatable.
	// setup for track table and group table is identical.
	//alert("dataTabulating " + tableId + tableData + tableColumns);
	$(tableId).dataTable({
		"bJQueryUI": true,
		"aaData": tableData,
		"aoColumns": tableColumns,
		"aaSorting": [[ 1, "asc" ]],
		"oLanguage": {"sSearch": "Filter:" },
		"bPaginate": false,
		"bAutoWidth": false
	    });
    };

    var initTT = function(){
	newTT=true;
	for ( var i = 1; i < hb.tracks.length; i++ ) {
	    var t = hb.tracks[i];
	    ttData.push( [ t.id, t.visible, t.order, t.name, t.type, hb.notecount(t) ] );
	}
	ttCols = [
    { "sTitle": "id", "bVisible" : false, "width" : "0px" },
    { "width" : "100px", "sTitle": "Show?", "fnRender": function(cell) { return hb.cb( cell.aData[1], { "id" : "cb"+cell.aData[0] }); } },
    { "width" : "100px", "sTitle": "Order" },
    { "width" : "200px", "sTitle": "Name", "fnRender": function(cell) {  return '<span class="'+hb.prefix+'trackTitle" data-track="'+ cell.aData[0] +'" data-row="' + cell.iDataRow + '" data-col="' + cell.iDataColumn + '">' + cell.aData[3] + '</span>'; } },
    { "width" : "200px", "sTitle": "Type", "fnRender": function(cell) { return groupLink(cell.aData[0]);}},
    { "width" : "200px", "sTitle": "Notes" }
		     ];
    };

    var initGT = function(){
	newGT=true;
	for ( var i = 1; i < hb.tracks.length; i++ ) {
	    var t = hb.tracks[i];
	    if ( t.type != "group" ) {
		gtData.push( [ t.id, false, t.order, t.name, t.type, hb.notecount(t) ] );
	    }
	}
	gtCols = [
	    { "sTitle": "id", "bVisible" : false, "width" : "0px" },
	    { "width" : "100px", "sTitle": "Member?", "fnRender": function(cell) { return hb.cb( cell.aData[1], { "id" : "gcb"+cell.aData[0] }); } },
	    { "width" : "100px", "sTitle": "Order" },
	    { "width" : "200px", "sTitle": "Name" },
	    { "width" : "200px", "sTitle": "Type", "fnRender": function(cell) { return groupLink(cell.aData[0]);}},
	    { "width" : "200px", "sTitle": "Notes" }
	];
    };
    
    var init = function(){
	$("#"+hb.prefix + "showSettingsDialog").click(function(e) { showTT() ; e.preventDefault(); });
	initTT();
	initTTJQD();
	initGT();
	initGTJQD();
	attachListeners();
    };

    var attachListeners = function(){
	var selector = '.' + hb.prefix +'trackTitle';
	$("#"+ttDivId).on("click",selector,function(event){
	    // make clicked title editable.
	    event.preventDefault();
	    var target = event.target;
	    var trackId = target.getAttribute('data-track');
	    if ( ! trackId ) {
		return;
	    }
	    var row = target.getAttribute('data-row');
	    var col = target.getAttribute('data-col');
	    var track = hb.trackById[trackId];
	    if ( ! track.editable ){
		return;
	    }
	    event.target.innerHTML = tag('input', 
					 {'type': 'text',
					  'value': track.name, 
					  'data-track': trackId,
					  'data-row':row,
					  'data-col':col
					 });   
	});
	$("#"+ttDivId).on("blur",selector+" input",function(event){
		updateTrackName(event);
	});
	$("#"+ttDivId).on("keydown",selector+" input",function(event){
	    hb.event=event;
	    if ( event.keyCode === 13 ) {
		updateTrackName(event);
	    }
	});
	$("#"+gtDivId).on("click",hb.pre('$HBgroupEditLink href'),function(event){
	    alert("REINOS: group link click!");
	    currentGroup = trackById[event.target.getAttribute('data-track')];
	    // REINOS: update selection state of track in group.
	    //for ( var i = 1; i < allTracks.length; i++ ) {
	    //	var t = allTracks[i];
	    //	boolean isTrackInGroup = $.inArray(t.id,currentGroup.trackIds) > -1;
	    //	$("#gcb"+t.id).prop("checked",isTrackInGroup);
	    //}
	    //return openDialog(groupEditDialog);
	    showGT();
	    event.preventDefault();
	});
    };
    
    var updateTrackName = function(event){
	var target = event.target;
	var trackId = target.getAttribute('data-track');
	var row = parseInt(target.getAttribute('data-row'));
	var col = parseInt(target.getAttribute('data-col'));
	var t = hb.trackById[trackId];
	t.name = target.value;
	$('#'+ttId).dataTable().fnUpdate( t.name, row, col );
	hb.editor.queueSave("update","commentary",t,t);
    };

    var tag = function(name,attributes,text){
	var html='<'+name;
	$.each(attributes, function(key,value) {
		html+= ' ' + key + ' = ' + '"' + value + '"'; 
	    });
	if ( text !== undefined) {
	    html += text + '</' + name + '>';
	} else {
	    html += ' />';
	}
	return html;
    }; 

    var initGTJQD = function(){
	var html = '<p class="hb_misc">Check the annotation tracks that you would like to include in this group.</p>';
	html += '<div id="'+gtDivId + '"><table cellpadding="0" cellspacing="0" border="0" class="display" id="$HBgroupEditTable"></table></div>';
	gtjqd = $('<div class="hb_misc"></div>')
	    .html(hb.pre(html))
	    .dialog({
		autoOpen: false,
		title: 'Configure Commentary Group',
		height: 520,
		width: 650,
		buttons:
		{
		    "Apply": function()  {
			var groupTrackIds = [];
			currentGroup.notecount=0;
			for (var i=1; i < hb.tracks.length; i++ ) {
			    var t = hb.tracks[i];
			    var isSelected = $("#gcb"+t.id+":checked").val() !== undefined;
			    if ( isSelected ) {
				groupTrackIds.push(t.id);
				currentGroup.notecount += hb.notecount(t);
			    }
			}
			currentGroup.trackIds = groupTrackIds;
			// REINOS: this might need to be fixed.
			//refreshTrackTables();
			hb.filterTracks();
			hb.adjustBounds();
		    }
		}
	    });
    };

    var initTTJQD = function(){
	// initialized track table jquery dialog widget.
	var html = "";
	html += '<p>A commentary is a collection of comments or annotations on a text. In Highbrow, each commentary is drawn as a horizontal band plotting annotation density against the referenced text.'
	html += 'Toggle commentaries on and off by ticking the box in the "show" column.</p>';
	html += '<p>Commentaries may be grouped. Click on the "member" count for commentary groups to add or remove member commentaries.</p>';
	html += '<p>Create new commentaries or groups using the buttons at the bottom of this window.</p>';
	html += '<div id="' + ttDivId +'"><table cellpadding="0" cellspacing="0" border="0" class="display" id="'+ ttId + '"></table></div>';
	ttjqd = $('<div class="hb_misc"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Configure Highbrow Commentaries',
		height: 520,
		width: 650,
		buttons:
		{
		    "New Commentary" : function() {
			hb.createOrdinaryTrack();
			//alert("Created new track " + t.name);
		    },
		    "New Group" : function() {
			var g = hb.initTrack();
			g.name = "New Group";
			g.id = "group"+hb.tracks.length;
			g.type="group";
			g.trackIds=[];
			hb.addTrack(g);
			alert("Created new group " + g.name);
		    },
		    "Apply": function()  {
			var debug="";
			for (var i=1; i < hb.tracks.length; i++ ) {
			    var t = hb.tracks[i];
			    t.visible = $("#cb"+t.id+":checked").val() !== undefined;
			    debug+="t.id: " + t.id + " visible? " + t.visible;
			    debug+="\n";
			}
			hb.filterTracks();
			hb.adjustBounds();
		    }
		}
	    });
    };

    init();

};
