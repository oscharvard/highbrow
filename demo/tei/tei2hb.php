<?php 

# horrific little hack to take tei-A input and produce highbrow compatible javascript data structures.
# requires php to be compiled with mbstring to properly handle unicode characters.
# BUT freaks out if "Zend multibyte support" is enabled. Not sure why yet, or how to turn Zend multibyte support off.

function main(){

  $noteCount=0;

  #$file = "ham-1604-22276x-fol-c01.xml"; 
  #$file = "Perseus_text_1999.02.0002.xml";
  #http://www.quartos.org/XML_Orig/ham-1603-22275x-hun-c01_orig.xml

  $url = $_GET['u'];
  if ( ! preg_match("/^http/",$url)  ) {
    # rudimentary security.
    exit();
  }



  $message = "";


  $js_file = "cache/js/" . hash('md5', $url,false) . ".js";
  $js_f ="";

  if ( ! isset($_GET['bust']) and file_exists($js_file) ){
    print file_get_contents($js_file);
    exit();
  } else {
    $js_f = fopen($js_file, 'w');
  }
  
  # very crude caching. note: we could cache the js output too/instead.
  $tei_file = "cache/tei/" . hash('md5', $url,false) . ".xml";

  if (file_exists($tei_file) ){
    $xmlstr = file_get_contents($tei_file);
    $message .= " File exists!";
  } else {
    $message .= " Nah, file does not exist";
    $xmlstr = file_get_contents($url);
    $tei_f = fopen($tei_file, 'w');
    fwrite ($tei_f, $xmlstr, strlen($xmlstr));
    fclose($tei_f);
    $message .= " But I think I just wrote it.";
  }

  $sequence = array();
  $sequence["0debug"] = "Looks AOK. File $tei_file $message";
  $sequence["data"]="";
  $sequence["notes"] = array();
  $sequence["name"]="Untitled TEI Document";
  $notes = array();


  $dom = new DOMDocument();
  #$dom->preserveWhiteSpace = false; #this doesn't do what you want it to.
  $dom->loadXML($xmlstr);
  $xpath = new DOMXpath($dom);
  $xpath->registerNamespace('tei', "http://www.tei-c.org/ns/1.0");
  $tracks = array();

  $sequence["name"] = extract_title($xpath);
  
  # we start in the body to extract text and notes.
  $nodes = $dom->getElementsByTagName('body');

  $conf = array();
  # note: these are required for TEI-A: div, l
  $conf['structureTags']= array("div","div1","div2","div3","div4","div5","div6","lg","l","p", "speaker","ab","sp","head");
  $conf['deadbeatParentStructureTags'] = array("lg"); # yes, these are structure. But we stick any children into it's parent (so grandparent of child). Why? To make sure all ls are on the same tier. Hack. Rethink at some point.
  $conf['bottomStructureTags'] = array("l","ab","p");
  $conf['noteTags'] = array("note","signature","catchword","add","gap","scene","stage");
  $conf['ignoreTags'] = array("fw"); # ignore text in these tags.

  $sructureNoteContainer = array();

#  $topStructureNote["children"]=array();

  //print_r($structureTags);

  //print_r($notes);

  mapText($conf,$sequence,$nodes,$noteCount,$notes,$structureNoteContainer);

  //print_r($notes);

  #print("<pre>");

  #$tracks[]= array("id" => "test", "name" => "Test", "notes" => $notes, "visible" => "true" );
  
  foreach ( $conf['noteTags'] as $tag ) {
    $notesByTag[$tag]=array();
  }

  foreach ( $notes as $note ) {
    $notesByTag[$note['tag']][]=$note;
  }
  
  foreach ( $conf['noteTags'] as $tag ) {
    if ( count($notesByTag[$tag]) > 0)  {
      $tracks[]=array("id" => $tag, "name" => $tag, "notes" => $notesByTag[$tag], "visible" => "true" );
    }
  }
  
  # weird.
  $structureDoc = array();
  $structureDoc["notes"] = $structureNoteContainer;

  $wrapper = array();
  $wrapper[]=$structureDoc;

  $js_str = "";

  $js_str .="var phpSequenceLength = " . mb_strlen($sequence['data'],"utf-8") . ";\n";
  $js_str .="var sequence = "  . my_json_encode($sequence) . ";\n";
  $js_str .="var structure = " . json_encode($wrapper) . ";\n";
  $js_str .="var tracks    = " . json_encode($tracks)  . ";\n";
  $js_str .="var groups = [];\n";
  
  fwrite ($js_f, $js_str, strlen($js_str));
  fclose($js_f);
  print($js_str);
  }

// apparently php 5.3 does not yet support JSON_UNESCAPED_UNICODE flag. This function emulates it.
// lifted from comment at this url: http://php.net/manual/en/function.json-encode.php
function my_json_encode($arr) {
  //convmap since 0x80 char codes so it takes all multibyte codes (above ASCII 127). So such characters are being "hidden" from normal json_encoding
  array_walk_recursive($arr, function (&$item, $key) { if (is_string($item)) $item = mb_encode_numericentity($item, array (0x80, 0xffff, 0, 0xffff), 'UTF-8'); });
  return mb_decode_numericentity(json_encode($arr), array (0x80, 0xffff, 0, 0xffff), 'UTF-8');
}

# reinhard: todo: post run: 
# get friggin structureTags in_array to work.
# add as child of containing structurenote.stags
# spit out minimal json sequence and structure objects.

function mapText( $conf, &$sequence, &$nodes,&$noteCount,&$notes,&$structureNoteContainer){
  if ( ! isset($nodes) ) {
    return;
  }
  foreach ($nodes as $node) {
    $note = array();

    #$note["nodeName"]  = $node->nodeName;
    $isStructureNote = in_array($node->nodeName,$conf['structureTags']);
    $isDeadbeat      = $isStructureNote ? in_array($node->nodeName,$conf['deadbeatParentStructureTags'])  : false;
    
    attach_note_id($node,$note,$noteCount,$isStructureNote);

    $noteCount++;
    $note["children"] = array();
    $note["start"] = mb_strlen($sequence["data"],"utf-8");
    $note["name"] = $node->nodeName;
    if ( $isStructureNote ) {
      if ( true || preg_match("/^div/",$node->nodeName) ) {

	#$note['name']=$a->getNamedItem("id")->nodeValue;

	attach_structure_note_name($node,$note);
	#$note["name"] = $a->getNamedItem("type")->nodeValue . " " . $a->getNamedItem("n")->nodeValue;
      }
    }
    $isOrdinaryNote = in_array($node->nodeName,$conf['noteTags']);

    if ( $node->nodeType == 3 || $node->nodeType == 4 ) {
      # text node. add text.
      if ( $node->nodeValue && (!preg_match("/^\s+$/",$node->nodeValue)) && (! in_array($node->nodeName,$conf['ignoreTags']))) {
	$val = $node->nodeValue; #$node->nodeName;# . "{" . $node->nodeValue . "}"; 
	#$val = preg_replace("/\s+/"," ",$val); # replace all contiguous whitespace with single space.
	$val = trim($val)."\n";
	$note["nodeValue"] = $val;
	$sequence["data"] .= $val;
      }
    } else {
      $childsStructureNoteContainer =  &$structureNoteContainer;
      if ( $isStructureNote && ! $isDeadbeat ) {
	$childsStructureNoteContainer =  &$note["children"];
      } else if ( isset($structureNoteContainer) ) {
	$childsStructureNoteContainer = &$structureNoteContainer;
      }
      if (  in_array($node->nodeName,$conf['bottomStructureTags']) && isset($node->childNodes) && count($node->childNodes)==0){
	$sequence['0debug'].="BOTTOM STRUCTURE TAG WITH CHILDREN: " . $note['id'];
      } else {
	mapText( $conf, $sequence, $node->childNodes,$noteCount,$notes,$childsStructureNoteContainer);
      }
    }
    $note["stop"] = mb_strlen($sequence["data"],"utf-8");
      if ( false && in_array($node->nodeName,array("l","p","speaker"))) {
# Debug. looks fine.
	$note['nodeText'] = "'" . $node->textContent . "'";
	$note['seqText']  = "'" . mb_substr($sequence["data"],$note['start'],$note['stop'],"utf-8") . "'";

      if ( $note['nodeText'] != $note['seqText'] ) {

	$note['textEqual'] = ($note['nodeText'] == $note['seqText']);

	$note['nodeText.length'] = mb_strlen($note['nodeText'],"utf-8");
	$note['seqText.length']  = mb_strlen($note['seqText'],"utf-8");

	print "<pre>";
	print_r($note);
	exit("Error: " . json_encode($note));
	print "</pre>";
      } else {
	#print "OK..." . $note['nodeText'];
      }

      $note['name'] = $note['seqText'];
    }
    if ( $isStructureNote ) {
      #print("Reinhard: REALLY adding structure note to container.\n");
	#print_r($parentStructureNote);
	$structureNoteContainer[]=$note;

	//if (preg_match("/^div/",$node->nodeName)> 0 ) {
	//	  $note['name']="reindiv";
	  //}
	#$note["fruit"]=$parentStructureNote["nodeName"];
	#$notes[]= $note;
      #print("<pre>");
      #print_r($note);
      #print("</pre>");
    } elseif ( $isOrdinaryNote ) {
      $note['tag']=$node->nodeName;
      
      $notes[]= $note;      
    }

  }
}
  
function attach_note_id($node,&$note,$noteCount,$isStructureNote){
  $a = $node->attributes;
  if ( isset($a) and $a->getNamedItem("id") ) {
    $note['id']=$a->getNamedItem("id")->nodeValue;
  } else {
    $note["id"] = $node->nodeName . "." . $noteCount . '.' . ($isStructureNote ? "s" : "n");
  }
}

function attach_structure_note_name($node,&$note){
  # for divs (scenes, acts, chapters, etc.)
  $headNodes = $node->getElementsByTagName('head');
  foreach ($headNodes as $headNode ) {
    $note['name'] = $headNode->nodeValue."";
    return;
  }
  $a = $node->attributes;
  if ( isset($a) ) {
    if ($a->getNamedItem("n")) {
      # for numbered lines
      $note['name']=$a->getNamedItem("n")->nodeValue;
      return;
    } else if ( $a->getNamedItem("who") ) {
      # for speakers
      $note['name']=$a->getNamedItem("who")->nodeValue;
      return;
    }
  } 
  $note['name']=$note['id'];
}

function extract_title($xpath) {
  # TODO: why can't I be more specific? I love the idea of xpath, but can never get it to behave properly.
  # I want: "/TEI/teiHeader/fileDesc/titleStmt/title"
  # now why can't I specify that in any remotely obvious way?
  
  $nodes = $xpath->query("//tei:title");

  foreach ($nodes as $node)
    {
      return $node->nodeValue."";
    }
  return "No Title Found 2";
}



main();

?>

