importClass("XMLHttpRequest");

var url = theRoot.varToString("URL");
var opc = theRoot.varToString("OPC");
var bod = theRoot.varToString("BOD");
var met = theRoot.varToString("MET");
var idopc = theRoot.varToInt("ID_OPC");

var xhr = new XMLHttpRequest();
xhr.timeout=15000;
xhr.open(met, url, true);
xhr.setRequestHeader('Accept', '*/*');
xhr.setRequestHeader('User-Agent', 'SygematREST');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(bod);


while(xhr.readyState != 4) {
    xhr.processEvents();
	
}

if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
    var oJson = JSON.parse(xhr.responseText);

	if( opc == "Autenticar" ){		
		if( typeof oJson.d !== "undefined" ){
			if( oJson.d.tipo !== 0 ){
				theRoot.setVar("ERR" , 1);			
				theRoot.setVar("MSJ_ERR" , oJson.d.mensaje );
			}else{
				theRoot.setVar("ERR" , 0);			
				theRoot.setVar("SES" , JSON.stringify(oJson.d.sesion) );
				theRoot.setVar("MSJ" , JSON.stringify(oJson.d.mensaje) );
			}
		}else{
			theRoot.setVar("ERR" , 1);			
			theRoot.setVar("MSJ_ERR" , JSON.stringify(oJson) );
		}		
	}else {
		if( typeof oJson.d !== "undefined" ){
			theRoot.setVar("ERR" , 0);			
			theRoot.setVar("RET" , JSON.stringify(oJson) );
			theRoot.setVar("LEN",oJson.d.length);
			if((idopc==1)){
				theRoot.setVar("TIP",oJson.d[0].tipo);
				}
			
		}else{
			theRoot.setVar("ERR" , 1);			
			theRoot.setVar("MSJ_ERR" , JSON.stringify(oJson) );
		}
		
	}
}	
