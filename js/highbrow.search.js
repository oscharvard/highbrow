Highbrow.SearchDialog = this.Highbrow.SearchDialog = function(hb,conf) {

    "use strict";

    if (! (this instanceof Highbrow.SearchDialog)) throw "called Highbrow.SearchDialog constructor as if it were a function: missing 'new'.";

    var jqd = null; // jquery dialog object.
    var searchCount=0;

    var regexSearch = function(t,term,additionalModifiers){
	var re = new RegExp(term,"g"+additionalModifiers);
	var m;
	while (  m = re.exec(sequence.data) ) {
	    var n = {};
	    n.start=m.index;
	    n.name=m+"";
	    n.stop=m.index+(m+"").length-1;
	    t.notes.push(n);
	}
    };

    var search = function (term,ignoreCase,useRegExp){
	// for now, add a new track with search term
	var t = hb.initTrack();
	var additionalModifiers = "";
	if ( ignoreCase ) {
	    additionalModifiers = "i";
	}
	if ( useRegExp ) {
	    t.name="/" + term + "/"+additionalModifiers;
	    regexSearch(t,term,additionalModifiers);
	} else {
	    t.name="\"" + term + "\"";
	    regexSearch(t,term,additionalModifiers);
	}
	t.id = "search" + searchCount;
	t.type="search";
	searchCount++;
	hb.addTrack(t);
    };

    
    var init = function(){
	$("#"+hb.prefix + "showSearchDialog").click(function(e) { show() ; e.preventDefault(); });
	initDialog();
    };

    var show = function(){
	jqd.dialog('open');
	return false;
    };

    var initDialog = function(){
	var searchDialogId =  hb.prefix+'searchDialog';
	var searchDialogFormId  = searchDialogId + "Form";
	var searchDialogInputTextId  = searchDialogFormId + "InputText";
	var searchDialogIgnoreCaseId = searchDialogFormId + "IgnoreCase";
	var searchDialogRegexId = searchDialogFormId + "Regex";

	$('body').on("submit",'#'+searchDialogFormId,function(event){
	    event.preventDefault();
	    search($('#'+searchDialogInputTextId).val(),hb.cbChecked('#'+searchDialogIgnoreCaseId),hb.cbChecked('#'+searchDialogRegexId));
	    
	});

	var html ="<div class=\"hb_misc\"><p>Type a term to locate in the text.</p>";
	html+= '<p>Your results will be plotted as a new track.</p>';
	html+='<form id="'+ searchDialogFormId +'"><p><input id="' + searchDialogInputTextId + '" type="text" size="30"/></p>';
	html+="<p>Ignore Case?" + hb.cb(true,{"id" : searchDialogIgnoreCaseId}) + "</p>";
	html+="<p>Regular Expression?" + hb.cb(false,{"id" : searchDialogRegexId}) + "</p>";
	html+="</form></div>";
	jqd = $('<div id="' + searchDialogId + '" class=\"hb_misc\"></div>')


	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Search Highbrow Text',
		height: 290,
		width: 300,
		buttons:
		{
		    "Search": function()  {
			$('#'+searchDialogFormId).submit();

		    }
		    
		}
	    });

    };
    
    init();

};