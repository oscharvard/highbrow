var HighbrowSearchDialog = this.HighbrowSearchDialog = function(hb,conf) {

    "use strict";

    if (! (this instanceof HighbrowSearchDialog)) throw "called HighbrowSearchDialog constructor as if it were a function: missing 'new'.";

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
	var html ="<div class=\"hb_misc\"><p>Type a term to locate in the text.</p>";
	html+= "<p>Your results will be plotted as a new track.</p>";
	html+="<form><p><input id=\"sb\" type=\"text\" size=\"30\"/></p>";
	html+="<p>Ignore Case?" + hb.cb(true,{"id" : "scase"}) + "</p>";
	html+="<p>Regular Expression?" + hb.cb(false,{"id" : "sregexp"}) + "</p>";
	html+="</form></div>";
	jqd = $('<div class=\"hb_misc\"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Search Highbrow Text',
		height: 290,
		width: 300,
		buttons:
		{
		    "Search": function()  {
			search($("#sb").val(),hb.cbChecked("#scase"),hb.cbChecked("#sregexp"));
		    }
		}
	    });
    };
    
    init();

};