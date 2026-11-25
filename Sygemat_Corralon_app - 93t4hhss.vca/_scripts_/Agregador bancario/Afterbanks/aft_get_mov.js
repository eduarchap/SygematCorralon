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
	var empresa     = theApp.globalVarToString("sygemat_corralon_dat/EMP_REA_ID")
	var pgc_bco		= theRoot.varToString("PGC_BCO");
	var aux_bco 	= theRoot.varToString("AUX_BCO");
	var id_cab   	= theRoot.varToString("ID_CAB");

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
        "date": "2019-03-16",
        "date2": "2019-03-16",
        "amount": 0,
        "balance": 0,
        "description": "string",
        "categoryId": 0,
        "transactionId": "string"
      }
    ]
  }
]
*/	
	var mov_ban = objetoJson // Seleccionams matriz de inicio dentro del objetoJson
	
// Bucle recorrido de la matríz 
for (var i = 0; i < mov_ban.length; i++) 
{
		var producto    = mov_ban[i].product
		var descripcion = mov_ban[i].description
		var balance     = mov_ban[i].balance
		var currency    = mov_ban[i].currency
		
		var movimientos = mov_ban[i].transactions;
	
	if (producto == products)
	{
		
		if (movimientos != undefined)
		{	

			for (var j = 0; j < movimientos.length; j++)
			{		
			// Variables locales de los campos de la matríz
			var fec_mov = movimientos[j].date
			var fec_val = movimientos[j].date2
			var imp_mov = movimientos[j].amount
			var dsc_mov = movimientos[j].description
			var sal_ban = movimientos[j].balance
			var trn_id  = movimientos[j].transactionId
			var cat_id	= movimientos[j].categoryId
				
				// Asignamos la categoría del API a la de la conciliación
				
				// Comprobamos si el tipo de movimiento es de entrada o salida en función del signo
				if (imp_mov < 0)
				{
					var importe = imp_mov * -1;
					var tip_mov = "2"
				}
				else {
					var importe = imp_mov;
					var tip_mov = "1"
				}
				
				// Formateamos las fechas en formato yyyy-mm-dd para las tablas de Velneo
				var fec_mov_for = fec_mov.split('-').reverse().join('-');
				var fec_val_for = fec_val.split('-').reverse().join('-');
				
			// Se abre transacción si no existe
			bTransCurso = theRoot.existTrans();
			if ( bTransCurso == false )
				{
				bTransNueva = theRoot.beginTrans( "Añadiendo registros de movimientos bancarios " );
				}

			if ( bTransCurso || bTransNueva )
				{	
				// Alta de registros
				var registro = new VRegister(theRoot);
				var bregistrocreado = registro.setTable ("sygemat_corralon_dat/CBA_DET_C",true);
				
				// Leemos el id de la moneda en curso
				var registroScript = new VRegister(theRoot);
				registroScript.setTable("sygemat_corralon_dat/MON_M");
				var registroScriptOk = registroScript.readRegister("ISO", [currency], VRegister.SearchThis);
				var moneda_mov = registroScript.fieldToInt("ID");	
					
					if (bregistrocreado && registro && registro.isOK() )
					{
						// Se asigna valores a las campos de la tabla de detalle de conciliaciones
						registro.setField( "CBA_CAB", id_cab);
						registro.setField( "EMP", empresa);
						registro.setField( "PGC_BCO", pgc_bco);
						registro.setField( "AUX_BCO", aux_bco);
						registro.setField( "FCH_OPE", fec_mov_for);
						registro.setField( "FCH_VAL", fec_val_for);
						registro.setField( "CBA_CNC_COM", categoria_conciliacion(cat_id));
						registro.setField( "DEB_HAB", tip_mov);
						registro.setField( "IMP", importe);
						registro.setField( "SAL", sal_ban);
						registro.setField( "MON", moneda_mov);
						registro.setField( "CNC_01", dsc_mov);
						registro.setField( "CNC_02", trn_id);
						registro.setField( "IMP_DIV", importe);
						registro.setField( "NUM_REG_FCH_OPE", j+1);
						registro.setField( "MD5", trn_id);

						// Se crea el registro
						registro.addRegister();
						
					}	// Fin de creación de registro													
				}// Fin alta
			else
						alert ("Error. No se ha podido iniciar la transacción.");
			} // Fin bucle transacciones
		}
						if (bTransNueva) 
						{
							theRoot.commitTrans();
						}

	} // Fin comprobación números de cuenta idénticos
} // Fin del bucle productos

// --------------------------------------------------------
// Devuelve la categoría asignada en función de la del API
// --------------------------------------------------------
function categoria_conciliacion(cat_id)
{
	var cat_id_con ="";

	switch (cat_id)
	{
		case 1:
			cat_id_con = "10";
			break;
		case 6:
			cat_id_con = "17";
			break;
		case 7:
			cat_id_con = "02";
			break;
		case 8:
			cat_id_con = "14";
			break;
		case 9:
			cat_id_con = "15";
			break;
		case 36:
			cat_id_con = "09";
			break;
		case 10:
			cat_id_con = "17";
			break;
		case 11:
			cat_id_con = "17";
			break;
		default:
			cat_id_con = "99";
	}

	return cat_id_con;
};