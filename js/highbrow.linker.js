Highbrow.Linker = this.Highbrow.Linker = function(hb,conf) {

    "use strict";

    if (! (this instanceof Highbrow.Linker)) throw "called Highbrow.Linker constructor as if it were a function: missing 'new'.";

    var jqd = null; // jquery dialog object.
    var searchCount=0;

    var createLink = function(){
	// create permalink or deep link.
	// get the selected section if any.
	var sid = hb.selectedSection ? hb.selectedSection.id : null;
	// get the zoom a and z.
	var spa = Math.round(hb.map.spa);
	var spz = Math.round(hb.map.spz);
	// todo: note selection state.
	return("#"+ (sid ? 'select=' + sid : '')  + '&start=' + spa + '&stop=' +spz);
    };

    var updateNavState = function(){
	// on init, set zoom and selection state based on url parameters passed after the "#"
	var fragment = $.deparam.fragment();
	var sid = fragment.select ? fragment.select : "";
	var zid = fragment.zoom   ? fragment.zoom : ""; // could be multiple.
	var spa = fragment.start ? fragment.start : "";
	var spz = fragment.stop ? fragment.stop : "";
	// noteSection ?
	if ( sid ) {
	    var s = hb.sectionById[sid];
	    hb.selectSection(s);
	}
	if ( zid ) {
	    // if zoom id is set, it overrides start and stop.
	    var z = hb.sectionById[zid];
	    hb.map.setVisibleRange(z.start,z.stop);
	} else if ( spa && spz ) {
	    hb.map.setVisibleRange(parseInt(spa),parseInt(spz));
	}
    };
    
    var init = function(){
	$(hb.pre('#$HBshowLinker')).click(function(e) { show() ; e.preventDefault(); });
	updateNavState();
	// re-apply state if the hash parameters are changed.
	$(window).bind( 'hashchange', function(){ updateNavState();   });
	initDialog();
    };

    var show = function(){
	var link = createLink();
	jQuery.bbq.pushState(  link  );
	$(hb.pre('#$HBlink')).html(document.location.href);
	$(hb.pre('#$HBlink')).attr('href',document.location.href);
	jqd.dialog('open');
	return false;
    };

    var initDialog = function(){
	var html ="Deep linking allows you to specify precise zoom and selection states in highbrow for bookmarking and sharing.";
	html += '<p>The deep link for your current highbrow state is:</p><p><a href="" id="$HBlink"></a></p>';
	html += '<p>The url in your web browser has been updated to reflect this.</p>';
	jqd = $(hb.pre('<div id="$HBlinkerDialog" class="$HBmisc"></div>'))
	    .html(hb.pre(html))
	    .dialog({
		autoOpen: false,
		title: 'Create Deep Link To Highbrow',
		height: 300,
		width: 350,
		buttons:
		{
		    "Close": function()  {
			$(this).dialog("close");
		    }
		}
	    });
    };
  
    init();
    
};
