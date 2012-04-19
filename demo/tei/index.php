<?php
$u = "http://thestudyhabit.org/highbrow/dev/git/highbrow/demo/tei/data/mac.xml";
if ( isset($_GET["u"])){
  $u=$_GET['u'];
}
 ?>
<html>
<head>
<title>Highbrow: TEI-A</title>

<!-- 3rd party libraries -->
<script src="../../lib/js/jquery.min.js"></script>
<script type="text/javascript" language="javascript" src="../../lib/js/jquery.dataTables.min.js"></script> 
<script type="text/javascript" src="../../lib/js/jquery-ui.min.js"></script> 
<link rel="stylesheet" type="text/css" href="../../lib/css/jquery-ui.css" /> 
<script language="javascript" src="../../lib/js/processing.min.js"></script>
<script language="javascript" src="../../lib/js/jquery.ba-bbq.min.js"></script>

<!-- highbrow code -->
<script src="../../js/highbrow.main.js"></script>
<script src="../../js/highbrow.settings.js"></script>
<script src="../../js/highbrow.search.js"></script>
<script src="../../js/highbrow.spanel.js"></script>
<script src="../../js/highbrow.npanel.js"></script>
<script src="../../js/highbrow.map.js"></script>

<link type="text/css" href="../../highbrow.css" rel="stylesheet" />

<!-- highbrow data and configuration -->
<script language="javascript" src="tei2hb.php?u=<?php echo $u;?>"></script>

<!-- tei data source selection widget -->

<script language="javascript" src="tei-select.js"></script>

</head>

<body>

<div id="HB_container"></div>

<script language="javascript">
var hbconf= {};
hbconf.sequence = sequence;
hbconf.tracks = tracks;
hbconf.structure = structure;
hbconf.container = "HB_container";
var hb = new Highbrow(hbconf);


$(document).ready(function() {
    $('.HB_title').append('<div class="HB_nav" style="vertical-align: text-middle; margin: 5px;"> [&nbsp;<a id="HB_tei_select" href="#s">Load&nbsp;Text</a>&nbsp;] </div>');
    var dialog =  new HighbrowTEISelectionDialog('<?php echo $u; ?>');
  }); 


</script>

</body>
</html>
