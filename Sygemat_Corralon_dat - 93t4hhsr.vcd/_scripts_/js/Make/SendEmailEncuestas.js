importClass("XMLHttpRequest");

var mail = theRoot.varToString("MAIL");
var nombre = theRoot.varToString("NOMBRE");
var vendedor= theRoot.varToString("VENDEDOR");
var tipoentrega = theRoot.varToString("TIPOENTREGA");
var idpedido = theRoot.varToInt("ID_VTA_PED");


var obj = new Object();
   obj.mail = mail;
   obj.nombre = nombre;
   obj.vendedor= vendedor;
   obj.tipoentrega = tipoentrega;
   obj.idpedido = idpedido;

var data = JSON.stringify(obj);


var xhr = new XMLHttpRequest();
xhr.timeout=15000;
xhr.open("POST", "https://hook.us1.make.com/fwlo3fpn8woo26j5jpdlkrpo3valj81g", true);
xhr.setRequestHeader('Accept', '*/*');
//xhr.setRequestHeader('User-Agent', 'SygematREST');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(data);

while(xhr.readyState != 4) {
    xhr.processEvents();
}

if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
	
	 theRoot.setVar("RET" ,JSON.stringify(xhr.response));
	
}