
// from http://simonwillison.net/2006/Jan/20/escape/

RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			};

$(document).ready(function() {
	w = document.width;
	HB=null;
	$("#zoomIn").click(function(e)   { HB.zoomIn()   ; e.preventDefault(); });
	$("#zoomOut").click(function(e)  { HB.zoomOut()  ; e.preventDefault(); });
	$("#panLeft").click(function(e)  { HB.panLeft()  ; e.preventDefault(); });
	$("#panRight").click(function(e) { HB.panRight() ; e.preventDefault(); });
	$("#search").click(function(e)   { HB.openSearchDialog() ; e.preventDefault(); });
	$("#settings").click(function(e) { HB.openSettingsDialog() ; e.preventDefault(); });
	$("#addNote").click(function(e) { HB.openEditDialog() ; e.preventDefault(); });
	$(window).resize(function() {
		var p = HB;		    
		p.adjustBounds();
	    });
    });

var minCharPerPx = .01; /// minimum characters per pixel. make configurable at some point.

var editNoteDialog;
var settingsDialog;
var searchDialog;
var groupEditDialog;

var trackTableData=[]; 
var trackTableColumns=[];

var groupEditTableData=[];
var groupEditTableColumns=[];

var editStart=0;
var editStop=0;

// very crude. but hopefully good enough for now.
function stretchInts(oldInts, newSize) {
    var oldSize = oldInts.length;
    var newInts = [];
    var new2old = oldSize / (newSize+0.0);
    for (var i=0; i < newSize; i++ ) {
	var oldIA=  Math.round(i*new2old-.5);
	//newInts[i]=oldIA;
	newInts[i]= oldInts[oldIA < oldSize ? oldIA : oldSize-1];
    }
    return newInts;
}

function prettyCacheString(object){
    // make arrays of numbers all on one row. hacky but good enough.
    var string = JSON.stringify(object,null,"  ");
    string = string.replace(/ +(\d+),\n/g,"$1,");
    string = string.replace(/\[\n/g,"[");
    string = string.replace(/\n\s*\]/g,"]");
    return string;
}

function getLevels(textsize,tilesize){
    var levels = [];
    var number =0;
    var charPerPx = textsize / tilesize;
    var pxPerChar = tilesize / textsize;
    vat tilecount=1;
    while ( charPerPx >= minCharPerPx ) {

	charPerPx = textsize / (tilesize * tilecount);
	pxPerChar = (tilesize * tilecount ) / textsize;

        ok = tilecount*tilesize*charPerPx == textsize;
        levels.push( { "ok" : ok, "number" : number, "charPerPx" : charPerPx, "pxPerChar" : pxPerChar, "tilecount" : tilecount } );
	tilecount *=2;
        number++;
    }
    return levels;
}

function getLevel(levels,desiredCharPerPx){
    // todo: what if you are below the deepest level of the pyramid?
    // todo: or above the highest? (for latter, blurr as with other levels)
    for (var i=0; i < levels.length; i++ ) {        
        if ( levels[i].charPerPx <= desiredCharPerPx ) {
            return levels[i];
        }
    }
    return null;
}

var tileCache = { 'json.stringifiable' : true };
var requestCache = { 'json.stringifiable' : true };

function ajaxTile(track,level,tileType,tileNumber){
    
    // user real LRU cache after you get simple hash table caching working.
    // there are at least 2 js libraries to do this.
    // 2 kinds of tiles: score tiles and note tiles.

    var suffix = "";
    if ( tileType != "scores") {
	suffix = "_" + tileType;
    }
    var url = track.pyramid+"/" + level.number + "/" + tileNumber + "/" + track.group + suffix +".json";
    if ( tileCache[url] ) {
	return tileCache[url];
    } else {
	if ( ! requestCache[url] ) {
	    // send request
	    requestCache[url]="requesting...";
	    $.ajax({
		    url: url,
			dataType: 'json',
			success: function (data, textStatus, jqXHR){ requestCache[url]="Done."; tileCache[url] = data; checkUpdateSelection(level,tileType,tileNumber); },
			error: function (jqXHR, textStatus, errorThrown){ requestCache[url]="Error: " + textStatus; alert("AJAX TILE FAILURE: " + JSON.stringify( { "url" : url, "textStatus" : textStatus, "errorThrown" : errorThrown })); } 
			});

	}
	// return null as flag to display indication that tile is loading.
	return LOADING_TILE;
    }
}

function getTiles(track,tileRange,tileType){
    var tiles = [];
    for (int tileNumber=tileRange.startTile; tileNumber <= tileRange.stopTile; tileNumber++; ) {
	var tile = ajaxTile(track,tileRange.level,tileType,tileNumber);
	tiles.push(tile[track.id]);
    }
    return tiles;
}

// Processing stuff. Convert to js.

// G_lobal variables
int RED  = [206,15,37];
int GOLD = [207,181,59]; //[245,217,77];
int BLUE = [19,83,180];

var normalized = {};
var mouseIsOver = false;
var isDragging = false;
var grabTp =0;
var grabPx =0;

int delay = 16;
int mapY  = 30;
int mapX  = 0; // make 100
int labelWidth = 135;
int minLabelWidth = 100;
int mapWidth = width-mapX-labelWidth;
int mapHeight = height-mapY;
int tileSize = 400; //hack
int minWidth = tileSize*4; // hack

String reinos = "Debug Message";
PFont monoFont;
PFont fancyFont;
PFont fancyFontItalic;
int defaultTrackSize=20;
Object selectedSN;
Object levels;
var currentLevel;
var currentGroup;
int maxPreTiledLevel=8; // hard coded for now. fix pronto because KJV is 10 and dante is 8. REINHARD TODO.
var lutherScores = []; // debug
var lutherDone=false;

var trackById={};
// virtual "tile" without any score or feature content
var LOADING_TILE = -1;
var newTrackTable=false;

// Setup the Processing Canvas
void setup(){
  size(width, height );
  maxPreTiledLevel = highbrow_maxPreTiledLevel;
  tpa=1;
  initSequence(sequence);
  tpz=sequence.length;
  //alert(JSON.stringify(sequence,null,"  " ));
  levels = getLevels(tpz,tileSize);
  //alert(JSON.stringify(levels,null,"  " ));
  monoFont = loadFont("courier");
  fancyFont = loadFont("baskerville");
  fancyFontItalic = loadFont("Baskerville-Italic");
  strokeWeight( 1 );
  frameRate( 5 );
  //smooth();
  initTracks(tracks);
  updateBottomHtml("<div style=\"text-align: center;\" class=\"hbw\"><p>Welcome to the Highbrow Text Annotation Browser!</p><p>Click to select a region or navigate using the links above.</p><p>Use the settings link to select more tracks to view.</p></div>");
  adjustBounds();
}

void setEditStart(startVerseStart){
    editStart=startVerseStart;
}

void setEditStopAndOpen(stopVerseStart){
    // this edit start/stop stuff actually seems to work in Chrome, Firefox, Safari!
    // we get a range object which gives us character offsets within the start and stop verses.
    var selectedRange = getSelectedRange();
    editStart = editStart + selectedRange.anchorOffset;
    stop = stopVerseStart + selectedRange.focusOffset;
    editStop = stop;
    openEditDialog();
}

void adjustBounds() {
    // reset the height after a track has been added/resized/removed or window resized.
    // right now, take up entire window space. Maybe make configurable.
    // hacky: the selector names/classes are hard coded. Should be able to run multiple highbrows in same window. 
    // yeah, this would be weird, but forces us to keep code cleaner.

    HB = Processing.getInstanceById('hbcanvas');

    var w = $(window).width()-10;

    //if ( w < minWidth ) {
    //	w = minWidth;
    //}

    var h = height;
    $('body').width(w);				
    $("#hbcanvas").width(w);

    width=w;	
    h=mapY+(defaultTrackSize/2);
    for (var i=1; i < tracks.length; i++ ) {
	h+=tracks[i].size;
    } 
    height=h;
    width=w;
    size(width,height);
    mapHeight = height-mapY;
    $("hbcanvas").height(height);
    mapWidth = width-mapX-minLabelWidth;

    snapToPyramidLevel();

    $(".hbw").width(mapWidth);
    $(".hbw4").width(mapWidth/4);
    $(".hbw2").width(mapWidth/2);
    $(".w").width(w);
    $(".w2").width(w/2);
    $(".w4").width(w/4);

    // now deal with heights
    var wh  = $(window).height()-$("#hbheader").height()-10;
    // old. Pre-friday jason happel talk.
    //$("#selectionPanel").height(wh/2);
    //$("#plotPanel").height(wh/2);
    

    // option for minimum seleciton panel height... would be nice to drag resize eventually.

    var minSelectionPanelHeight = 50;

    if ( wh-h < minSelectionPanelHeight) {
	h=wh-minSelectionPanelHeight;
    }

    // new post talk

    $("#plotPanel").height(h);    
    $("#selectionPanel").height(wh-h);


    updateCurrentLevel();

    //$("#selectionPanel").height($(window).height()-h-$('#hbheader').height());
}


void snapToPyramidLevel(){
    // now make sure mapwidth is multiple of tilesize
    //int remainder = mapWidth % tileSize;
    //mapWidth-=remainder;
    //labelWidth+=remainder;
    // make sure mapWidth corresponds to a *full* pyramid level of tiles.
    // question: is this really necessary?
    // see how blurring looks/performs. If ok, then vastly preferable.
    int tiles = mapWidth / tileSize;
    var lastLevel=levels[0];
    for (var i=0; i< levels.length; i++ ){
	var level = levels[i];
	if ( level.tilecount > tiles ) {
	    break;
	} else {
	    lastLevel=level;
	}
    }
    int reduceMap = mapWidth - (lastLevel.tilecount * tileSize);
    mapWidth -= reduceMap;
    labelWidth += reduceMap;
}

void updateCurrentLevel(){
    currentLevel = getLevel(levels,(tpz-tpa+1) / (mapWidth + 0.0));
}

// Main draw loop
void draw(){
  background( 255 );
  fill( 0 );
  textFont(monoFont);			
  textSize("9");
  drawRawSequence();
  drawTracks();
  drawSelections();
  drawPlaybackPosition();
  noFill();
  stroke(0);
  // reinos: this is messing it up.
  // weird that this has to be here. Probably doesn't. dialog issue.
  if ( newTrackTable && $('#trackTable').length > 0 ) {
      try {
	  dataTabulate('#trackTable',trackTableData,trackTableColumns);
	  dataTabulate('#groupEditTable',groupEditTableData,groupEditTableColumns);
      } catch(err) {
	  // not sure what is going on. video bug. figure out asap.
      }
      newTrackTable=false;
  }

  //rect( 0, 0, mapWidth, height );                  
}


void makeTrackNameEditable(e,trackId,row,col){
    // replace event target with text input.
    //alert("trackId: " + trackId + "row: " + row + " col: " + col);
    var t = trackById[trackId];
    var eventHTML = "\"HB.updateTrackName(event,'" + trackId + "'," + row + "," + col + ")\"";
    e.target.innerHTML ="<input type=\"text\" value=\"" + t.name + "\" onblur=" + eventHTML + " onkeyup=" + eventHTML + "/>";    
    //alert("event: a" + e);
    //alert("editTrackName:" +trackId);
}

void updateTrackName(e,trackId,row,col){
    if ( e.type === "blur" || e.keyCode === 13 ) {
	var t = trackById[trackId];
	t.name = e.target.value;
	$('#trackTable').dataTable().fnUpdate( t.name, row, col );
	e.target.parentElement.innerHTML=t.name;
    }
}

function initSequence(sequence){
    if ( sequence.type === "video" ) {
	sequence.length = duration2position(sequence.length);
    }
    if ( sequence.data ) {
	sequence.length = sequence.data.length;
    }
}

function duration2position(duration){
    if ( duration.indexOf(":") > -1 ) {
        var t = duration.split(":");
        var h = parseInt(t[0]);
        var m = parseInt(t[1]);
        var s = parseInt(t[2]);
        return (h*60*60)+(m*60)+(s);        
    }
    return duration;
}

void positionDurationNotes(){
    for (int ti=0; ti < tracks.length(); ti++ ) {
	var t = tracks[ti];
	for ( int ri=0; ri < t.notes.length(); ri++ ) {
	    var n = t.notes[ri];
	    n.start = duration2position(n.start);
	    n.stop  = duration2position(n.stop);
	}
    }
}

void initTracks(tracks){
    if ( sequence.type == "video" ) {
	positionDurationNotes();
    }
    // add track groups to tracks. also rethink as with structure.
    for (int gi=groups.length-1; gi > -1; gi-- ) {
	groups[gi].type="group";
	tracks.unshift(groups[gi]);
    }
    // add structure to tracks. Rethink. Probably cleaner to keep separate? 
    for (int si=0; si < structure.length(); si++ ) {
	structure[si].type="structure";
	tracks.unshift(structure[si]);
    }

    for (int ti=0; ti < tracks.length(); ti++ ) {
	var t = tracks[ti];
	t.size = defaultTrackSize;
	t.order = ti;
	if ( ! t.notes ) {
	    t.notes = [];
	}
	// todo: this is confusing. now we've got aggregation groups
	// and pyramid groups.
	if ( t.pyramid && ! t.group ) {
	    t.group = 'tile';
	}
	if ( ! t.type ) {
	    t.type = "ref";
	}
	//t.visible = true;
	trackById[t.id]=t;
	//alert(t.id + "=> " + t.name);
    }
    allTracks = tracks;
    filterTracks();
    createEditDialog();
    createSettingsDialog();
    createSearchDialog();
    createGroupEditDialog();
}

void filterTracks(){
    tracks = [ allTracks[0] ];
    for (int i=1; i < allTracks.length(); i++ ) {
	var t = allTracks[i];
	if ( t.visible ){
	    tracks.push(t);
	    t.order = tracks.length-1;
	}
    }
}

void regexSearch(t,term,additionalModifiers){
    var re = new RegExp(term,"g"+additionalModifiers);
    var m;
    while (  m = re.exec(sequence.data) ) {
	var ref = {};
	ref.start=m.index;
	ref.name=m+"";
	ref.stop=m.index+(m+"").length-1;
	t.notes.push(ref);
    }
}

void search(term,ignoreCase,useRegExp){
    // for now, add a new track with search term
    var t = initTrack();
    var additionalModifiers = "";
    if ( ignoreCase ) {
	additionalModifiers = "i";
    }
    //simpleSearch(t,term);
    if ( useRegExp ) {
	t.name="/" + term + "/"+additionalModifiers;
	regexSearch(t,term,additionalModifiers);
    } else {
	t.name="\"" + term + "\"";
	regexSearch(t,term,additionalModifiers);
    }
    //t.name += " (" + t.notes.length + ")";
    t.id = "search:" + t.name;
    t.type="search";
    addTrack(t);
}

Object initTrack(){
    var t ={};
    t.size = defaultTrackSize;
    t.notes = [];
    t.visible = true;
    return t;
}

void addTrack(t) {
    // add a track to the myriad places it needs to go.
    t.order = allTracks.length();
    tracks.push(t);
    allTracks.push(t);
    var row = [t.id,t.visible,t.order,t.name,t.type,notecount(t)];
    trackById[t.id]=t;
    $('#trackTable').dataTable().fnAddData(row);
    if ( t.type != "group" ) {
	$('#groupEditTable').dataTable().fnAddData(row);
    }
    adjustBounds();
    filterTracks();
}

function refreshTrackTables(){
    // get the track ui tables in sync with the underlying data.
    $('#trackTable').dataTable().fnClearTable();
    $('#groupEditTable').dataTable().fnClearTable();
    for ( var i=1; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	var row = [t.id,t.visible,t.order,t.name,t.type,notecount(t)];
	$('#trackTable').dataTable().fnAddData(row);
	if ( t.type != "group" ) {
	    $('#groupEditTable').dataTable().fnAddData(row);
	} 
    }
    adjustBounds();
    filterTracks();
}


void drawSelections(){
  if ( selectedSN ) {
     Object sn = selectedSN;
     //text("There is a selected SN",100,100);
     int a = visiblePxInt(sn.start);
     int z = visiblePxInt(sn.stop);
     stroke(BLUE[0],BLUE[1],BLUE[2],100);
     fill(BLUE[0],BLUE[1],BLUE[2],100);
     rect(a,0,z-a+1,height);
  }
}

void drawPlaybackPosition(){
    if ( $("#hbv").length > 0 ) {
	var position = document.getElementById("hbv").currentTime;
	if ( position === undefined ) {
	    position = 0;
	} else {
	    position = parseInt(position,10);
	}
	int a = visiblePxInt(position);
	int z = visiblePxInt(position+1);

	int alpha = 100;

	if ( z-a < 3 ) {
	    alpha=200;
	    z=a;
	}

	stroke(RED[0],RED[1],RED[2],alpha);
	fill(RED[0],RED[1],RED[2],alpha);
	rect(a,0,z-a+1,height);
    }
}

void labelTracks(tracks){
    int y= mapY;//+defaultTrackSize;
    for (int ti=0; ti < tracks.length(); ti++ ) {
	var t = tracks[ti];
	alternateColor(ti,RED,[0]);
	if ( ! ( t.type && t.type == 'structure') ) {
	    textFont(fancyFontItalic);			
	    textSize("13");
	    text(t.name,mapWidth+20,y);
	    textFont(monoFont);			
	    textSize("8");
	    textAlign(RIGHT);
	    //text(getBound('max',t),mapWidth+18,y-t.size+4);
	    //text(getBound('min',t),mapWidth+18,y-4);
	    textAlign(LEFT);
	}
	y+=t.size;
    }
}

void alternateColor(i,evensColor,oddsColor){
  if ( i == 0 || i % 2 == 0 ) {
    arraystrokefill(evensColor);
  } else {
    arraystrokefill(oddsColor);
  }
}

void arraystrokefill(a){
  if ( a instanceof Array ) {
    if (a.length()==4) {
      stroke(a[0],a[1],a[2],a[3]);
      fill(a[0],a[1],a[2],a[3]);
    } else if (a.length()==3 ) {
      stroke(a[0],a[1],a[2]);
      fill(a[0],a[1],a[2]);
    } else {
      stroke(a[0]);
      fill(a[0]);
    }
  } else {
    stroke(a);
    fill(a);      
  }
}

function getTiledNotes(t,tileRange){
    var tiles = getTiles(t,tileRange,"notes");
    var uniqueNotes = [];
    var seenRefIds = {};
    for (int tileNumber=0; tileNumber < tiles.length; tileNumber++){
	var tileNotes = tiles[tileNumber];
	if ( tileNotes ) {
	    for (int refNumber=0; refNumber < tileNotes.length; refNumber++ ) {
		var ref = tileNotes[refNumber]; // .data
		// hack. fix data.
		if ( ! ref.id && ref.id != 0 ) {
		    ref.id = ref.url; 
		}
		if ( ! seenRefIds[ref.id] ) {
		    uniqueNotes.push(ref);
		    seenRefIds[ref.id]=true;
		}
	    }
	}
    }
    return uniqueNotes;
}

void scoreTiledNotes(t,tileRange){
    countPxNotes(t,getTiledNotes(t,tileRange));
}

int[] getTiledScores(t,tileRange){
    var tiles = getTiles(t,tileRange,"scores");
    int[] pixelScores = new int[mapWidth];
    int pixel =0;
    for (int tileNumber=0; tileNumber < tiles.length; tileNumber++){
	var tile = tiles[tileNumber];
	int binA = tileNumber == 0 ? tileRange.startTilePx : 0;
	int binZ = tileNumber == tiles.length -1 ? tileRange.stopTilePx : tileSize-1;
	for (int bin=binA; bin<=binZ; bin++ ) {
	    if ( tile ) {
		pixelScores[pixel]=tile[bin]; // data
	    } else {
		pixelScores[pixel]=0;
	    }
	    pixel++;
	}
    }
    return pixelScores;
}

int getTextLength(){
    return sequence.length;
}


function getSequenceRangeForTile(level,tileNumber) {
    var tile = { "id" : "tile:" + level.number + ":" + tileNumber };
    tile.start = (int)(tileSize * tileNumber * level.charPerPx);
    tile.stop  = (int)((tileSize * (tileNumber+1) * level.charPerPx)-1);
    return tile;
}

Object textRangeToTileRange(a,z,level) {

    // returns the start and stop tile number
    // and the bounding pixel positions within the start and stop tiles.
    // also some other meta data.

    boolean loadPreTiledScores = true;

    if ( ! level ) {
	level = currentLevel;
    }

    float c2p = level.charPerPx; 

    if ( level.number >  maxPreTiledLevel ) {
	loadPreTiledScores = false;
	level = levels[maxPreTiledLevel];
	c2p = level.charPerPx; 
    }

    var tileRange = { 'json.stringifiable' : true };

    tileRange.level = level;
    tileRange.loadPreTiledScores = loadPreTiledScores;
    tileRange.startTile   = int(((a-1)/c2p) / tileSize); 
    tileRange.stopTile    = int(((z-1)/c2p) / tileSize); 
    tileRange.startTilePx = int(((a-1)/c2p) % tileSize);
    tileRange.stopTilePx  = int(((z-1)/c2p) % tileSize);

    return tileRange;

}

void loadTiles(t){
    var tileRange = textRangeToTileRange(tpa,tpz);
    if ( tileRange.loadPreTiledScores ) {
	t['min'] = Number.MAX_VALUE;
	t['max'] = 0;    		
	t.pxScore = getTiledScores(t,tileRange);
	for ( int i =0; i < t.pxScore.length; i++ ) {
	    updateMinMax(t.pxScore[i],t);
	}
    } else {
	scoreTiledNotes(t,tileRange);
    }
}

void countPxNotes(t,notes){
    // count number of ref characters overlapping each visible pixel.
    t['min'] = 0;
    t['max'] = 0;    		      
    int[] pxScore = new int[mapWidth];
    t.pxScore = pxScore;
    for (int ai=0; ai < notes.length(); ai++){  
	var n =  notes[ai];
	if ( overlaps(n.start,n.stop,tpa,tpz)){
	    // get pixels with ANY overlap
	    int a = visiblePxInt(n.start);
	    int z = visiblePxInt(n.stop)+1;
	    for (int i=a; i <=z; i++ ) {
		int pxStart = tp(i);
		int pxStop  = tp(i+1);
		if ( true || overlaps(n.start,n.stop,pxStart,pxStop)) {
		    pxScore[i]+=getOverlapCharCount(n.start,n.stop,pxStart,pxStop);
		    updateMinMax(pxScore[i],t);
		}
	    }
	}
    }
}

function getOverlapCharCount(a,z,aa,zz) {
    var oa = a > aa ? a : aa;
    var oz = z < zz ? z : zz;
    return Math.max(0,oz - oa +1);
}

void updateMax(score,t){
    if ( score > normalized['max'] ) {
	normalized['max'] = score;
    }
    if ( score > t['max'] ) {
	t['max'] = score;
    }
}

void updateMinMax(score,t) {
    updateMax(score,t);
    if ( score < normalized['min'] ) {
	normalized['min'] = score;
    }
    if ( score < t['min'] ) {
	t['min'] = score;
    }
}

void drawScoredTrack(t){
  alternateColor(t.order,RED,0);
  var min = getBound('min',t);
  var max = getBound('max',t);
  int y = mapY+(t.size*(t.order+0));
  beginShape();
  vertex(mapX, y);
  int lastScore=-1;
  for (int i=0; i < mapWidth; i++ ) {
    int score = t.pxScore[i];
    if ( false && i+1 < mapWidth && (score == lastScore == t.pxScore[i+1]) ) {
	// assuming saving vertices will render faster?
	// looks like it.
    } else {
	int x = mapX + i;
	float scorePercent = (score-min) / (max-min+0.0);
	float scoreHeight  = (t.size-1) * scorePercent;
	vertex(x, y+(int)scoreHeight*-1);
    }
    lastScore = score;
  }	    
  vertex(mapX+mapWidth, y);
  endShape(CLOSE);
  line(mapX,y,mapX+mapWidth,y);
}

void drawStructuralFeature(t,f,fi,min,max){
  // draw structural features appropriate for current zoom level
  // Bible: book -> chapter -> verse
  // Plato: dialog -> [book number] -> stephanus number -> section letter.
  // http://plato-dialogues.org/faq/faq007.htm
  // Make good use of space. No more than 2 horizontal bands at a time.
  // Top band can show combined info for multiple levels.
  // thresholds at which to show each level of subfeature could be set in the data.
  // for now, hard code (need a default anyway).
  // works great for bible (3 tiers). But will break on other number of tiers.
  // actually, logic should be simple. bottom tier shows finest visible granulatity.
  // top tier shows concatenation of all above tiers. 
  int y = mapY+(t.size*(t.order+0)); 
  int height = t.size;
  var bottomFeatures = [];
  var topFeatures = [];
  var topPrefix = "";
  if (  pxPerChar() > .005 ) {
    if ( pxPerChar() > .1 ) {
      // show verses on bottom and book-chapters on top.
      topPrefix = f.name + " : ";
      topFeatures = f.children;
      for ( int i=0; i < topFeatures.length(); i++ ) {
        for ( int ii=0; ii < topFeatures[i].children.length(); ii++ ) {      
          bottomFeatures.push(topFeatures[i].children[ii]);
        }
      }
    } else {
      // show chapters on bottom and books on top.
      drawSimpleStructuralFeature(f,fi,y-(t.size/2),height/2,f.name);  
      bottomFeatures = f.children;
    }
  } else {
    // only show books.
    drawSimpleStructuralFeature(f,fi,y,height,f.name);  
  }
  int height = t.size / 2;
  drawSimpleFeatures(topFeatures,y-height,height,topPrefix);
  drawSimpleFeatures(bottomFeatures,y,height,"");
}

void drawSimpleFeatures(features,y,height,labelPrefix) {
  for (int i=0; i < features.length(); i++){  
    var f = features[i];
    drawSimpleStructuralFeature(f,i,y,height,labelPrefix + f.name);  
  }
}

void drawSimpleStructuralFeature(f,fi,y,h,label) {
  // label must be a STRING.
  alternateColor(fi,GOLD,153);
  int start = visiblePxInt(f.start);
  int stop  = visiblePxInt(f.stop);
  int visibleRegion = stop - start +1;
  int x = (start + stop) /2;
  rect( start, y-h, stop-start+1, h-1 );
  if ( visibleRegion > 4.1*label.length ) {
    stroke(0);
    fill(0);
    // todo: fix substring visitble chars.
    // int visibleChars = Math.min(4, label.length);
    // text(label.substr(0,visibleChars),x,y-h/2);
    text(label,x,y-h/2-2);
  }
}

void drawRef(t,drawMethod){
  int[] pxScore = new int[mapWidth];
  t.pxScore = pxScore;
  var min = getBound('min',t);
  var max = getBound('max',t);
  for (int ai=0; ai < t['notes'].length(); ai++){  
    var n =  t['notes'][ai];
    if ( overlaps(n.start,n.stop,tpa,tpz)){
      drawMethod(t,n,ai,min,max);
    }
  }
}

// rename to scorePixels
void scorePixels(tracks){
    for (int i=0; i < tracks.length(); i++ ) {
	Object t = tracks[i];
	//alert("t:" + JSON.stringify(t,null,"  "));
	if ( t.type === "group" ) {
	    scorePixelsForGroup(t);

	} else {
	    scorePixelsForTrack(t);
	}
    }
}

void scorePixelsForGroup(g){
    g.min=Number.MAX_VALUE;
    g.max=0;
    g.pxScore = new int[mapWidth];
    for (int i=0; i < g.trackIds.length(); i++ ) {
	var t = getTrackById(g.trackIds[i]);
	scorePixelsForTrack(t);
	addTrackPixelScoresToGroup(g,t,i+1==g.trackIds.length());
    }
    if (g.min > g.max) {
	g.min = g.max;
    }
}

void addTrackPixelScoresToGroup(g,t,updateMin){
    for ( int i=0; i < mapWidth; i++ ) {
	g.pxScore[i]+= t.pxScore[i];
	if ( updateMin ) {
	    updateMinMax(g.pxScore[i],g);
	} else {
	    updateMax(g.pxScore[i],g);
	}
    }

}

void scorePixelsForTrack(t){
    var gaga = t.id;
    if ( t.pyramid) {
	loadTiles(t);
    } else {
	countPxNotes(t,t.notes);
    }
}

function getTrackById(trackId){
    return trackById[trackId];
}

int getBound(bound,track){
  if ( $('#bounds').val() == 'normal'  ){
    return normalized[bound];
  } else {
    return track[bound];
  }
}

void drawTracks(){
  normalized.min = Number.MAX_VALUE;
  normalized.max = 0;	
  scorePixels(tracks);
  for (int ti=0; ti < tracks.length(); ti++ ) {
    var t = tracks[ti];
    if ( t.type == 'structure') {
	drawAlternatingColorRef(t);
    } else {
	drawScoredTrack(t);
    }
  }
  labelTracks(tracks);
}


void drawAlternatingColorRef(t){
    textFont(fancyFont);			
    textSize(9);
    textAlign(CENTER,CENTER);
    drawRef(t,drawStructuralFeature);
    textAlign(LEFT,BOTTOM)
}

boolean overlaps(a,z,aa,zz){
  if (a <= zz && z >= aa) {
    return true;
  }
  return false;
}

void drawRuler(){
  // get logic for K, M etc from argo
  // also draw ticks.
  for ( int px=0; px <= mapWidth; px+=(mapWidth/5) ) {
    text(""+(int)tp(px), px,10);
    textAlign(CENTER); // skip first time
  }
 textAlign(LEFT);
}

void drawRawSequence(){
  if ( pxPerChar() > 4 && sequence.data) {
    int a = (int)tp(0);
    int z = (int)tp(mapWidth);
    var str = sequence.data.substr(a,(z-a+1));
    for ( int i =0; i < str.length(); i++) {
      var c = str.charAt(i);	
      var px = i*pxPerChar(); 
      text(""+ c, px,10);
    }  
  }
}

int visiblePxInt(tp){
  return Math.floor(visiblePx(tp));
}

float visiblePx(tp){
  float p = px(tp);
  p = Math.max(p,0);
  p = Math.min(p,mapWidth);
  return p;  
}

// text to pixel position
float px(tp){
  return (tp - tpa) * pxPerChar();
} 

// pixel to text position 
float tp(px) {
  return (px / pxPerChar()) + tpa;
}

float pxPerChar(){
    return currentLevel.pxPerChar;
    //return mapWidth / ((tpz-tpa+1) + 0.0);
}

float charPerPx(){
    return currentLevel.charPerPx;
    //return (tpz-tpa+1) / (mapWidth + 0.0);
}


void zoom(factor){
  // todo: take mouse position into account.
  // if no mouse, center.
  float oldMouseSp = tp(mouseX);
  float old_tps = (tpz - tpa +1);
  float new_tps = (tpz - tpa +1) * factor;
  if ( new_tps > sequence.length ) {
    new_tps =  sequence.length;
  }
  var new_tpa = Math.max(1,tpa - (new_tps/2));
  var new_tpz = new_tpa + new_tps;
  setVisibleRange(new_tpa,new_tpz);
  float newMouseSp = tp(mouseX);
  float delta = oldMouseSp - newMouseSp;
  setVisibleRange(new_tpa+delta,new_tpz+delta);
}

void setVisibleRange(new_tpa,new_tpz){
    var oldLength = tpz - tpa +1;
    var new_tps = new_tpz-new_tpa+1;
    if ( new_tpa <= 0 ) {
	new_tpa=1;
	new_tpz=new_tps;
    }
    if ( new_tpz > sequence.length ) {
	new_tpz =  sequence.length;
	new_tpa =  new_tpz - new_tps;
    }
    // semi-redundant checks. rewrite this method so it works withouth this crap.
    // shouldn't be necessary.
    if ( new_tpa <= 0 ||  new_tpz > sequence.length ) {
	new_tpa=1;
	new_tpz=sequence.length();
    }
    // TODO: why *2???????
    if ( (new_tpz - new_tpa ) / mapWidth  > minCharPerPx*2 ) {
	tpa = new_tpa;
	tpz = new_tpz;
    }
    var newLength = tpz - tpa +1;
    if ( oldLength != newLength ) {
	updateCurrentLevel();
    }

}

void pan(factor){
  float tps = (tpz - tpa +1);
  var delta = factor * tps;
  var new_tpa = tpa+delta; 
  var new_tpz = tpz+delta;
  setVisibleRange(new_tpa,new_tpz);
}

float currentZoom(){
  return sequence.length / (tpz - tpa +1);
}


void zoomIn(){
    zoom(.5);
}

void zoomOut(){
    zoom(2.0);
}

void panLeft(){
    pan(-.10);
}

void panRight(){
    pan(.10);
}

void mouseOver() {
    //alert("Mouseover!");
    // using jquery, remove focus from any other elements that may have it.
    // now we can take keyboard and mousewheel focus.
    mouseIsOver = true;
    $("#hbcanvas").focus();
}


void mouseOut() {
    //alert("Mouseout!");
    // we no longer take focus.
    mouseIsOver = false;
}

void keyPressed(){
    //$('#selectionPanel').html("key pressed: " + key + " at: " + new Date());
    if ( mouseIsOver ) {
	if (key == CODED) {
	    if (keyCode == UP ) {
		zoomIn();
	    } else if (keyCode == DOWN) {
		zoomOut();
	    } else if (keyCode == LEFT) {
		panLeft();
	    } else if ( keyCode == RIGHT) {
		panRight();
	    }
	}
    }
}

void mouseScrolled(){
    if ( mouseIsOver ) {
	if ( mouseY < height ) {
	    if ( mouseScroll < 0 ) {
		zoomOut();
	    } else if ( mouseScroll > 0 ) {
		zoomIn();
	    }
	}
    }
}

void mouseMoved(){
    // why is this cursor stuff so flakey?
    //if ( isOnDragPanArea() ) {
	//$('#selectionPanel').html("Hot Damn: " + mouseY + " " + isDragging);
    //	$("body").css('cursor','pointer');
    //} else {
    //$("body").css('cursor','auto');
    //}
}

void mouseDragged(){
    if ( isDragging ) {
	//$("body").css('cursor','crosshair');
	var mouseTp = tpa + (charPerPx() * mouseX);
	var deltaTp = grabTp - mouseTp;
	var deltaPx = grabPx - mouseX;
	  if ( deltaTp ) {
	      //reinos
	      setVisibleRange(tpa+deltaTp,tpz+deltaTp);
	      //setVisibleRange(charPerPx()*deltaPx,charPerPx()*(mapWidth+deltaPx));
	      //$('#selectionPanel').html("deltaTp: " + deltaTp);
	  }
    }
}

boolean isOnDragPanArea(){
    return mouseY < (defaultTrackSize*.5);
}

boolean isOnTopStucturalBand(){
    if ( ! isOnDragPanArea() ) {
	return mouseY < (defaultTrackSize*1);
    }
    return false;
}

boolean isOnBottomStructuralBand(){
    if ( ! ( isOnDragPanArea() || isOnBottomStructuralBand ) ) {
	return mouseY < (defaultTrackSize*1.5);
    }
    return false;
}

void mousePressed(){
    if ( isOnDragPanArea() ) {
	isDragging = true;
	grapPx = mouseX;
	grabTp = tpa + (charPerPx()*mouseX);
    }
}

void mouseReleased(){
    isDragging = false;
}

void mouseClicked(){
    if ( isOnDragPanArea() ) {
	return;
    }
    int a = tp(mouseX);
    int z = tp(mouseX+1);
    // get the biggest structural feature that is smaller than some threshold in this region.
    // if not structural features or nothing suitable, just get some default range of characters centered on click point.  
    // hack for now for bible.
    var sn;
    var sntrack = tracks[0];
    for (int i =0; i < sntrack.notes.length; i++ ) {
	if ( sn ) {
	    break;
	}
	var book = sntrack.notes[i];
	if ( overlaps(a,z,book.start,book.stop) ) {
	    for (int ii =0; ii < book.children.length; ii++ ) {
		var chapter = book.children[ii];
		if ( overlaps(a,z,chapter.start,chapter.stop) ) {
		    if ( pxPerChar() > .1 ) {
			// zoomed in enough to see verses and actually clicked on one.
			// question: do you have to click on an sn to select it? I think so. 
			// clicking elsewhere should deselect (or possibly do something else)
			for (int iii =0; iii < chapter.children.length; iii++ ) {
			    var verse = chapter.children[iii];
			    if ( overlaps(a,z,verse.start,verse.stop) ) {
				sn = verse;
				break;
			    }
			} 
		    } else {
			sn = chapter;
		    }
		    break;
		}
	    }
	}
    }
    updateSelectionPanel(sn);
}

function tag(t,args){
    var contents = "";
    var attributes = "";
    for (var i=0; i < args.length; i++ ) {
	if ( args[i] instanceof Object) {
	    for ( var key in args[i] ){
		attributes+= " " + key + "=" + "\"" + args[i][key] + "\"";
	    }
	} else {
	    contents+=args[i];
	}
    }
    var html = "<" + t + attributes + ">" + contents + "</" + t + ">";
    //alert(html);
    return html;
}

function td(){
    return tag("td",td.arguments);
}

function tr(){
    return tag("tr",tr.arguments);
}

function div(){
    return tag("div",div.arguments);
}

function cb(){
    var args = [];
    args.push( { "type": "checkbox" });
    var i = 0;
    if (cb.arguments[0]==true){
	args.push( { "checked" : "checked" } );
    }
    i=1;
    for ( i; i<arguments.length; i++ ) {
	args.push(arguments[i]);
    }
    return tag("input",args);
}

function cbChecked(id){
    return $(id+":checked").val() !== undefined; 
}



void openDialog(d){
    d.dialog('open');
    return false;
}

void openEditDialog(){
    createEditDialog();
    return openDialog(editDialog);
}

void openSettingsDialog(){
    openDialog(settingsDialog);
}

void openSearchDialog(){
    return openDialog(searchDialog);
}

void openGroupEditDialog(groupId){
    currentGroup = trackById[groupId];
    int foundCount=0;
    for ( var i = 1; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	boolean isTrackInGroup = $.inArray(t.id,currentGroup.trackIds) > -1;
	$("#gcb"+t.id).prop("checked",isTrackInGroup);
	if ( isTrackInGroup ) {
	    foundCount++;
	}
    }
    return openDialog(groupEditDialog);
}


void createSearchDialog(){
    var html ="<div class=\"hb_misc\"><p>Type a term to locate in the text.</p>";
    html+= "<p>Your results will be plotted as a new track.</p>";
    html+="<form><p><input id=\"sb\" type=\"text\" size=\"30\"/></p>";
    html+="<p>Ignore Case?" + cb(true,{"id" : "scase"}) + "</p>";
    html+="<p>Regular Expression?" + cb(false,{"id" : "sregexp"}) + "</p>";
    html+="</form></div>";
	
    searchDialog = $('<div class=\"hb_misc\"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Search Highbrow Text',
		height: 290,
		width: 300,
		buttons:
		{
		    "Search": function()  {
			search($("#sb").val(),cbChecked("#scase"),cbChecked("#sregexp"));
		    }
		}
	    });

}

String groupLink(trackId){
    var t = trackById[trackId];
    if ( t.type == "group" ) {
	var onclick = "HB.openGroupEditDialog('" + t.id + "'); return false;";
	return t.type + " (<a href=\"x\" class=\"groupEditLink\" onclick=\""+onclick+"\">" + t.trackIds.length  + " members </a>)";
    } else if ( t.type == "ref" ) {
	return "annotations";
    }
    return t.type;
}

void createGroupEditDialog(){
    // the table is created once and appended to if new tracks are added, but group membership is updated depending on clicked group.

    var html = '<p class="hb_misc">Check the annotation tracks that you would like to include in this group.</p>';

    html += '<div id="groupEditTableDiv"><table cellpadding="0" cellspacing="0" border="0" class="display" id="groupEditTable"></table></div>';

    for ( var i = 1; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	if ( t.type != "group" ) {
	    groupEditTableData.push( [ t.id, false, t.order, t.name, t.type, notecount(t) ] );
	}
    }
    groupEditTableColumns = [
			 { "sTitle": "id", "bVisible" : false, "width" : "0px" },
			 { "width" : "100px", "sTitle": "Member?", "fnRender": function(cell) { return cb( cell.aData[1], { "id" : "gcb"+cell.aData[0] }); } },
			 { "width" : "100px", "sTitle": "Order" },
			 { "width" : "200px", "sTitle": "Name" },
			 { "width" : "200px", "sTitle": "Type", "fnRender": function(cell) { return groupLink(cell.aData[0]);}},
			 { "width" : "200px", "sTitle": "Notes" }
			];

    groupEditDialog = $('<div></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Edit Track Group',
		height: 520,
		width: 650,
		buttons:
		{
		    "Apply": function()  {
			var groupTrackIds = [];
			currentGroup.notecount=0;
			for (int i=1; i < allTracks.length(); i++ ) {
			    var t = allTracks[i];
			    var isSelected = $("#gcb"+t.id+":checked").val() !== undefined;
			    if ( isSelected ) {
				groupTrackIds.push(t.id);
				currentGroup.notecount+= notecount(t);
			    }
			}
			currentGroup.trackIds = groupTrackIds;
			refreshTrackTables();
		    }
		}
	    });
    
}

void dataTabulate(tableId,tableData,tableColumns){
    // setup for trackTable and groupEdit table is identical.
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
}

void createEditDialog(){
    var html="";

    $("#editForm").remove();

    html+= "<form id=\"editForm\" name=\"editForm\"><table>";
    html+="<tr><th>Location</th><td>" + editStart + " to " + editStop + "</td></tr>";
    html+="<tr><th>Text</th><td><span>"+ sequence.data.substr(editStart,(editStop-editStart)+1) + "</span></td></tr>";
    html+="<tr><th>Note</th><td><span><textarea rows=\"8\" cols=\"40\" name=\"noteText\" id=\"noteText\">Type your note here." +"</textarea></span></td></tr>";
    html+= "</table></form>";

    editDialog = $('<div class="hb_misc"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Edit Note',
		height: 520,
		width: 650,
		buttons:
		{
		    "Save" : function() {
			var t = tracks[2];
			var n = { };
			n.start = editStart;
			n.stop  = editStop;
			n.id    = t.notes.length+1;
			n.pre   = $('#noteText').val();
			n.name  = "A note";
			t.notes.push(n);
			updateSelectionPanel(selectedSN);
			editDialog.dialog("close");
		    }
		}});
}

function notecount(track){
    if (track.notes.length > 0 ) {
	return track.notes.length;
    } else if ( track.notecount ) {
	return track.notecount;
    }
    return 0;
}


void createSettingsDialog(){
    newTrackTable=true;
    var html = "";
    html += "<div>Bounds: <select id=\"bounds\"><option value=\"indy\" selected=\"selected\">Independent</option><option value=\"normal\">Normalized</option></select></div>";
    html += '<h3>Annotation Tracks</h3>';
    html += '<p>Toggle annotation tracks on and off by ticking the box in the "show" column.</p>';
    html += '<p>Click on the "member" count for track groups to add or remove member tracks.</p>';
    html += '<div id="trackTableDiv"><table cellpadding="0" cellspacing="0" border="0" class="display" id="trackTable"></table></div>';
    for ( var i = 1; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	trackTableData.push( [ t.id, t.visible, t.order, t.name, t.type, notecount(t) ] );
    }
    trackTableColumns = [
			 { "sTitle": "id", "bVisible" : false, "width" : "0px" },
			 { "width" : "100px", "sTitle": "Show?", "fnRender": function(cell) { return cb( cell.aData[1], { "id" : "cb"+cell.aData[0] }); } },
			 { "width" : "100px", "sTitle": "Order" },
{ "width" : "200px", "sTitle": "Name", "fnRender": function(cell) { return "<span onclick=\"HB.makeTrackNameEditable(event,'" + cell.aData[0] + "'," + cell.iDataRow + "," + cell.iDataColumn + ")\">" + cell.aData[3] + "</span>"; } },
			 { "width" : "200px", "sTitle": "Type", "fnRender": function(cell) { return groupLink(cell.aData[0]);}},
			 { "width" : "200px", "sTitle": "Notes" }
			];
    settingsDialog = $('<div class="hb_misc"></div>')
	.html(html)
	.dialog({
		autoOpen: false,
		title: 'Highbrow Settings',
		height: 520,
		width: 650,
		buttons:
		{
		    "New Group" : function() {
			var g = initTrack();
			g.name = "New Group";
			g.id = "group"+allTracks.length;
			g.type="group";
			g.trackIds=[];
			addTrack(g);
			alert("Created new group " + g.name);
		    },
		    "Apply": function()  {
			for (int i=1; i < allTracks.length(); i++ ) {
			    var t = allTracks[i];
			    t.visible = $("#cb"+t.id+":checked").val() !== undefined;
			}
			filterTracks();
			adjustBounds();
		    }
		}
	    });

}

void checkUpdateSelection(level,tileType,tileNumber){
    if ( selectedSN ) {
	if ( tileType == "notes" ) {
	    var tile = getSequenceRangeForTile(level,tileNumber);
	    if ( overlaps(tile.start,tile.stop,selectedSN.start,selectedSN.stop) ) {
		//alert("UPDATING SELECTION: " + JSON.stringify(tile));
		updateSelectionPanel(selectedSN);
		return;
	    }
	}
    }
}

function getInspectableTracks(){
    var inspectableTracks = [];
    var inspectableTrackIdSet = getInspectableTrackIdSet();
    //alert("inspectableTrackIdSet: " + JSON.stringify(inspectableTrackIdSet,null,"  "));
    for ( var i = 0; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	if ( inspectableTrackIdSet[t.id] ) {
	    inspectableTracks.push(t);
	}
    }
    return inspectableTracks;
}

function getInspectableTrackIdSet(){
    var inspectableIdSet = {};
    for ( var i = 0; i < allTracks.length; i++ ) {
	var t = allTracks[i];
	if ( t.visible ) {
	    if ( t.type === "group" ) {
		for ( var ii=0; ii < t.trackIds.length; ii++ ) {
		    var tid = t.trackIds[ii];
		    inspectableIdSet[tid]=1;
		    //alert("Matched tid: " + tid + " set: " + inspecteableIdSet[tid]);
		}
	    } else {
		inspectableIdSet[t.id]=1;
	    }
	}
    }
    return inspectableIdSet;
}


function getNotesBySN(ssn,inspectTracks,refTileRange){
    var notesBySN={};
    // bucket annotations by sn. Is this what is slow and blocks ui with lots of notes (like dante)?
    for (int i=0; i < inspectTracks.length; i++ ) {
	var t = inspectTracks[i];
	var notes = [];
	if ( t.pyramid ) {
	    notes = getTiledNotes(t,refTileRange);
	} else {
	    notes = t.notes;
	}
	for (int ii=0; ii < notes.length; ii++ ) {
	    var r = notes[ii];
	    if (overlaps(ssn.start,ssn.stop,r.start,r.stop)){
		for (int iii=0; iii < ssn.children.length; iii++ ) {
		    // overlaps sn?
		    var sn = ssn.children[iii];
		    if (overlaps(sn.start,sn.stop,r.start,r.stop)){
			if ( ! notesBySN[sn.id ] ) {
			    notesBySN[sn.id] = new Array();
			}
			r.track = t;
			notesBySN[sn.id].push(r);
		    }
		}
	    }
	}
    }
    return notesBySN;
}

function buildSelectionRows(ssn, notesBySN){
    var rows = [];
    var maxNoteCount=0;
    var minNoteCount=Number.MAX_VALUE;
    for (int i=0; i < ssn.children.length; i++ ) {
	var sn = ssn.children[i];
	var textString = sequence.data ? sequence.data.substr(sn.start,(sn.stop-sn.start+1)) : "Not sure what to show here instead of raw text."; 
	var notes = notesBySN[sn.id];
	if ( ! notes ) {
	    notes = new Array();
	}
	String annotationString="<ul>";
	for (int ii=0; ii < notes.length; ii++ ) {
	    var morehypertext = "more";
	    var n = notes[ii];
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
	    var img = "";
	    // question: what do we want to allow here?
	    // an image? a video url? arbitrary html?
	    // 
	    if ( n.img ) {
		if (n.img.src) {
		    img = "<img src=\"" +  n.img.src + "\" />";
		    //alert("reinos: " + img);
		}
	    }
	    annotationString += "<li>" + n.track.name + ": " + n.pre + " " + morelink + img +"</li>";
	}
	annotationString+="</li>";
	var row = {};
	row.sn=sn;
	row.textString=textString;
	row.noteCount = notes.length;
	row.annotationString = annotationString;
	if ( row.noteCount > maxNoteCount ) {
	    maxNoteCount = row.noteCount;
	}
	if ( row.noteCount < minNoteCount ) {
	    minNoteCount = row.noteCount;
	}
	rows.push(row);
    }
    return [rows,minNoteCount,maxNoteCount];
}

// the plan
// find all sns in ssn (selected sn)
// find all annotations overlapping sn, bucket by loc. PROBLEM: loc range complicates.
// create 2 panel div for each ssn text| annotations
// this is a monster method. break up. isn't even core highbrow.

void updateSelectionPanel(ssn){
  selectedSN= ssn;
  // if ssn is verse, then make it a child of itself just to keep the rest of the code below consistent.
  if (! ssn.children) {
      ssn.children = [ ssn ];
  }
  var inspectTracks = getInspectableTracks();
  // the tileRange for selected sequence range at close enough zoom to extract notes.
  var refTileRange = textRangeToTileRange(ssn.start,ssn.stop,levels[maxPreTiledLevel+1]);
  var notesBySN = getNotesBySN(ssn,inspectTracks,refTileRange);
  var tileRange = textRangeToTileRange(ssn.start,ssn.stop);
  String canvasString = charPerPx()+"";
  var selectionString = "<p class=\"hbl\"><table><tr><th id=\"seqcol\">" + ssn.id + "</th><th>Notes</th></tr>";
  if ( $("#hbv").length > 0 ) {
      document.getElementById("hbv").currentTime=ssn.start;
  }
  var rows, minNoteCount, maxNoteCount;
  var mv = buildSelectionRows(ssn,notesBySN);
  rows = mv[0];
  minNoteCount = mv[1];
  maxNoteCount = mv[2];
  for (int i=0; i < rows.length(); i++ ) {
      var row = rows[i];
      var opacity = maxNoteCount > 0 ? (row.noteCount+0.0-minNoteCount) / (maxNoteCount-minNoteCount) : 0;
      if ( opacity < .20 ) {
	  opacity = .20;
      }
      if ( row.noteCount === 0 ) {
	  opacity = 0;
      }
      selectionString += "<tr class=\"ssn\"><td class=\"ssnt hbw2\"><span onmousedown=\"HB.setEditStart(" + row.sn.start + ");\" onmouseup=\"HB.setEditStopAndOpen(" + row.sn.start + ")\">" + row.textString + "</span></td><td class=\"hbw2\"><div class=\"accordion\"><div style=\"opacity: " + opacity + ";\" class=\"exp\">" + row.noteCount + "</div><div>" + row.annotationString + "</div></td></tr>";
  }

  selectionString += "</table></p>";
  updateBottomHtml(selectionString);
  $('.accordion .exp').click(function() {
	  $(this).next().toggle('slow');
	  return false;
      }).next().hide();
}

void updateBottomHtml(selectionString){
    var bottomHtml = selectionString;
    // not sure why, but jquery is significantly slower than raw js here.
    //$('#selectionPanel').html(bottomHtml); 
    document.getElementById('selectionPanel').innerHTML=bottomHtml;
    $(".hbw2").width(mapWidth/2);
}

function getSelectedRange(){
    if(window.getSelection){ 
	return window.getSelection(); 
    } 
    else if(document.selection){ 
        return document.selection.createRange(); 
    } else if(document.getSelection){ 
	alert("Problem getting selected range. Are you using IE or something?");
        return document.getSelection(); 
    } 
    alert("Big problem getting selected range.");
}
