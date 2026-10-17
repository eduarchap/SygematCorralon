// ---------------------------------------
// Conectar con el API de Afterbanks 5.02
// ---------------------------------------
importClass("XMLHttpRequest");

// ---------------------------------------------------------------
// Asignamos valores a las variables recogiéndolas del formulario
// ---------------------------------------------------------------
	var url 	   = theRoot.varToString("AGB_URL");
	var servicekey = theRoot.varToString("AGB_SRV_KEY");
	var user 	   = theRoot.varToString("AGB_USR");
	var pwd 	   = theRoot.varToString("AGB_PWD");
	var pwd2 	   = theRoot.varToString("AGB_PWD2");
	var service    = theRoot.varToString("AGB_SRV");
	var products   = "GLOBAL";

// ----------------------------------------------------------
// Añadimos los parámetros para realizar la llamada a la API
// ----------------------------------------------------------
    var data = "servicekey=" + servicekey + "&user=" + user + "&pass=" + pwd + "&pass2=" + pwd2 + "&service=" + service + "&products=" + products + "&startdate=&account_id=1";	
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
		objetoJson = JSON.parse(xhr.response);
	}
	
/* Ejemplo de retorno JSON de Afterbanks
[
  {
    "product": "string",
    "type": "string",
    "balance": 0,
    "countable_balance": 0,
    "balance_value": 0,
    "arranged_balance": 0,
    "balance_credit_granted": 0,
    "currency": "string",
    "description": "string",
    "transactions": [
      {
        "date": "2019-03-26",
        "date2": "2019-03-26",
        "amount": 0,
        "balance": 0,
        "description": "string",
        "categoryId": 0,
        "transactionId": "string"
      }
    ],
    "iban": "string",
    "is_owner": 0,
    "holders": [
      {
        "role": "string",
        "name": "string",
        "id": 0
      }
    ]
  }
]
*/	
var productos = objetoJson // Seleccionamos matriz de inicio dentro del objetoJson

// Bucle recorrido de la matríz 	
	for (var i = 0; i < productos.length; i++) 
	{
		var nombre       = productos[i].description
		var producto     = productos[i].product
		
			// Se abre transacción si no existe
			bTransCurso = theRoot.existTrans();
			if ( bTransCurso == false )
				{
				bTransNueva = theRoot.beginTrans( "Añadiendo registros de productos " );
				}

			if ( bTransCurso || bTransNueva )
				{	
				// Alta de registros
				var reg = new VRegister(theRoot);
				var bregistrocreado = reg.setTable("sygemat_corralon_dat/AGB_PRO",true);
				if (bregistrocreado && reg && reg.isOK() )
					{
						// Se asigna valores a las campos de la tabla de productos (PRO)
						reg.setField( "ID", i);
						reg.setField( "NAME", nombre);
						reg.setField( "PRO", producto);
						
						// Se crea el registro
						reg.addRegister();
					}	// Fin de creación de registro													
				}// Fin alta
			else
						alert ("Error. No se ha podido iniciar la transacción.");
	} // Fin del bucle productos