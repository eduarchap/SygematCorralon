importClass("XMLHttpRequest");

var url = theRoot.varToString("URL");
var nom = theRoot.varToString("NOM");

var xhr = new XMLHttpRequest();
xhr.open("GET", url + "name=" + nom +"&background=random&color=fff&size=128" , true);
xhr.responseType = "arraybuffer";
xhr.send();

while(xhr.readyState != 4) { // 4: Done
    theApp.processEvents();
}

if ( (xhr.errorCode==0) && (xhr.status == 200) ) {
    var respuestaBA = new VByteArray();
	respuestaBA = xhr.response;
	theRoot.setVar("OK",1);
	theRoot.setVar("RES", respuestaBA.toBase64().toLatin1String() );	
}else{
	theRoot.setVar("OK",0);
	theRoot.setVar("ERR","Error obteniendo avatar \n\n " + xhr.responseText);
}
