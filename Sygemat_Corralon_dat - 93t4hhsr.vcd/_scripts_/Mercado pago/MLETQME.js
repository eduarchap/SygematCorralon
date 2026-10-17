importClass("XMLHttpRequest");
importClass("VFile");

var token = theRoot.varToString("TKN");
var get_id = theRoot.varToString("GET_ID");
var xhr = new XMLHttpRequest();
xhr.withCredentials = true;


xhr.open("GET", "https://api.mercadolibre.com/shipment_labels?shipment_ids="+get_id+"&savePdf=Y");
xhr.setRequestHeader("Authorization", "Bearer "+token);
xhr.responseType = "arraybuffer";
xhr.send();


while(xhr.readyState != 4) {
    xhr.processEvents();
}


if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
	
	generarFicheroDisco(theApp.clientCachePath()+'etiqueta.pdf',xhr.response);
	//alert(theApp.clientCachePath()+'respuesta.pdf');
	//var oJson = JSON.parse(xhr.responseText);
    
}
else {
	alert("No se encontro nada para imprimir, ya se envio el pedido");
	}

function generarFicheroDisco( sendaFichero , contenido ){
	var fp = new VFile( sendaFichero );		
	if (fp.open ( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate ) ){	
		fp.write( contenido );	
	}
	fp.close();	
}