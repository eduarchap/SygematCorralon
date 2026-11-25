// ---------------------------------------
// Conectar con el API de Afterbanks 5.02
// ---------------------------------------
importClass("XMLHttpRequest");

// ---------------------------------------------------------------
// Asignamos valores a las variables recogiéndolas del formulario
// ---------------------------------------------------------------
	var url 		= theRoot.varToString("URL");
	var servicekey  = theRoot.varToString("SRV_KEY");
	var user 		= theRoot.varToString("USR");
	var pwd 		= theRoot.varToString("PWD");
	var pwd2 	   	= theRoot.varToString("PWD2");
	var service 	= theRoot.varToString("SRV");
	var products 	= theRoot.varToString("PRO_IBA");
	var fch_ini 	= theRoot.varToString("FCH_AGB");

// ----------------------------------------------------------
// Añadimos los parámetros para realizar la llamada a la API
// ----------------------------------------------------------
	var data = "servicekey=" + servicekey + "&user=" + user + "&pass=" + pwd + "&pass2=" + pwd2 + "&service=" + service + "&products=" + products + "&startdate=" + fch_ini + "&get_iban=1";	

// ------------------------------------------
// Ejecutamos la petición por el método POST
// ------------------------------------------
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;
	xhr.open("POST", url, false);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.setRequestHeader("cache-control", "no-cache");
	xhr.send(data);
	
// -------------------------------------
// Atrapamos el retorno, si es correcto
// -------------------------------------
	var retorno = "";
if ( (xhr.errorCode==0) && (xhr.status == 200) )
	{
	
		retorno = xhr.response ;
		theRoot.setVar("RES", retorno);
		
		objetoJson = JSON.parse(xhr.response);
	}

	
/* Ejemplo de retorno JSON de Afterbanks
{
    "file_name": {
      "description": "string",
      "file_path": "string",
      "file_status": "string"
    }
  }
*/	
	
	
	var fic_ban = Object.keys(objetoJson)[0];
	var nombre_fichero = objetoJson[fic_ban].description || "" ;
	var fic_n43 = objetoJson[fic_ban].file_path || "" ;

	theRoot.setVar("NOM_FIC", nombre_fichero);							
	theRoot.setVar("FIC_N43", fic_n43);			