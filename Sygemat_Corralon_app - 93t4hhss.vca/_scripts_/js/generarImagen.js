importClass("XMLHttpRequest");

//https://ui-avatars.com/api/?name=John+sDoe&background=random&size=96&font-size=0.4&length=3&rounded=true
var url = theRoot.varToString("URL");

var xhr = new XMLHttpRequest();
xhr.open("GET", url, true);
xhr.responseType = "arraybuffer";
xhr.send();

// Al ser una llamada asíncrona, esperamos a que la petición termine. Esto es obligatorio si este código se ejecuta en tercer plano. Tenemos dos opciones para ello:

// Opcion 1: Hacemos uso de processEvents para poder mostrar o guardar información mientras esperamos
while(xhr.readyState != 4) { // 4: Done
    xhr.processEvents();
}


if ( (xhr.errorCode==0) && (xhr.status == 200) ) {
    var respuestaBA = new VByteArray();
    respuestaBA = xhr.response;
    respuesta = respuestaBA.toBase64().toLatin1String();
	theRoot.setVar("IMG", respuesta);
}