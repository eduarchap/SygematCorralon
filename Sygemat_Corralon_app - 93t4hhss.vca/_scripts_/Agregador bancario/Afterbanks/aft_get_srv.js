// ----------------------------------
// Conectar con el API de Afterbanks
// ----------------------------------
	importClass("XMLHttpRequest");

// ----------------------------------
// Asignamos valores a las variables 
// ----------------------------------
	var url = "https://api.afterbanks.com/forms/";
	var bic_swf = theRoot.varToString("BIC");

// ------------------------------------------
// Ejecutamos la petición por el método POST
// ------------------------------------------
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;
	xhr.open("GET", url, false);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.setRequestHeader("cache-control", "no-cache");
	xhr.send();
	
// -------------------------------------
// Atrapamos el retorno, si es correcto
// -------------------------------------
	var retorno = "";
	if ( (xhr.errorCode==0) && (xhr.status == 200) )
	{
		retorno = xhr.response ;
		objetoJson = JSON.parse(xhr.response);
	}
	
/* Ejemplo de retorno JSON de Afterbanks
[
	{
		"country_code":"ES"
		"service":"N26"
		"swift":"NTSBDEB1"
		"fullname":"N26"
		"business":"0"
		"documenttype":"0"
		"user":"Correo electr\u00f3nico"
		"pass":"Contrase\u00f1a"
		"pass2":"0"
		"userdesc":""
		"passdesc":""
		"pass2desc":""
		"usertype":"text"
		"passtype":"text"
		"pass2type":"text"
		"image":"https:\/\/www.afterbanks.com\/api\/icons\/n26.min.png"
		"color":"DBF8FC"
	}
]
*/	
		var bancos = objetoJson // Seleccionams matriz de inicio dentro del objetoJson
		var bco_txt  = ""
		
// Bucle recorrido de la matríz 
	for (var i = 0; i < bancos.length; i++) 
	{
		var bco_srv  = bancos[i].service
		var bco_swi  = bancos[i].swift
		
		// Comprobamos que los servicios recibidos correspondan al código SWIFT del banco
		if (bancos != undefined)
		{
			if (bco_swi === bic_swf)
			{
				bco_txt = bco_txt + bco_srv + "|" ;
				theRoot.setVar("AGB_SRV", bco_txt);
			}
		}
	} // Fin del bucle productos