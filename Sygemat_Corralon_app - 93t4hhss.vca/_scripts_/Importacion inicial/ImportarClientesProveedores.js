importClass("VProcess");

var datos = JSON.parse(theRoot.varToString("DATA"));
var es_clt = theRoot.varToBool("ES_CLT");
var es_prv = theRoot.varToBool("ES_PRV");

var columnas = datos.table.cols;
var filas = datos.table.rows;

// Iniciamos las posiciones clientes y proveedores
if (es_clt) {
    var POS_codigoClt = 0;
    var POS_nombreClt = 1;
    var POS_CondicionIva = 2;
    var POS_DNIcuit = 3;
    var POS_Telefono = 4;
    var POS_mail = 5;
    var POS_domfiscal = 6;
    var POS_ListaprecioClt = 7;
	var POS_Vendedor = 8;
	var POS_ArquitectoRelacionado = 9;
	var POS_TipoCliente = 10;
    var POS_saldoWhite = 11;
    var POS_saldoBlack = 12;
}
if (es_prv) {
    var POS_codigoClt = 0;
    var POS_nombrePrv = 1;
    var POS_tipProveedor = 2;
    var POS_CondicionIva = 3;
    var POS_DNIcuit = 4;
    var POS_Telefono = 5;
    var POS_mail = 6;
    var POS_domfiscal = 7;
    var POS_CostoTonelada = 8;
    var POS_saldoWhite = 9;
    var POS_saldoBlack = 10;
}

var nuevaTrans = false;
var hayTrans = theRoot.existTrans();
if ( hayTrans == false ) 
{
  var nuevaTrans = theRoot.beginTrans("Importando datos");
};


if ( hayTrans || nuevaTrans )
{
	try {
		for (var i = 0; i < filas.length; i++) {
			var registroJson = filas[i].c;
			var registroSaldoImportar = new VRegister(theRoot);
			registroSaldoImportar.setTable("sygemat_corralon_dat/SAL_IMP");

			// Función para obtener valores de forma segura
			function safeSetField(registro, field, pos, transform) {
				try {
					var value = (registroJson[pos] && registroJson[pos].v) ? registroJson[pos].v : "";
					value = transform ? transform(value) : value;
					registro.setField(field, value);
				} catch (e) {
					registro.setField(field, "");
				}
			}

			// Función para limpiar números (elimina todo excepto dígitos)
			function sanitizeNumber(value) {
				return value.replace(/[^\d]/g, ""); 
			}

			//safeSetField(registroSaldoImportar, "SUC", 11);
			registroSaldoImportar.setField("SUC", 11 );

			if (es_clt) {
				safeSetField(registroSaldoImportar, "ID_ENT_IMP", POS_codigoClt);
				safeSetField(registroSaldoImportar, "NAME", POS_nombreClt);
				registroSaldoImportar.setField("ES_CLT", 1 );
				safeSetField(registroSaldoImportar, "LST_PRE_CLT", POS_ListaprecioClt);

			}
			if (es_prv) {
				safeSetField(registroSaldoImportar, "ID_ENT_IMP", POS_codigoClt);
				safeSetField(registroSaldoImportar, "NAME", POS_nombrePrv);
				registroSaldoImportar.setField("ES_PRV", 1 );
				safeSetField(registroSaldoImportar, "TIP_PRV", POS_tipProveedor, (v) => (v.split("-")[0] || "").trim());
			}

			safeSetField(registroSaldoImportar, "SAL_W", POS_saldoWhite);
			safeSetField(registroSaldoImportar, "SAL_B", POS_saldoBlack);
			// Se eliminan caracteres no numéricos en saldos
			

			//safeSetField(registroSaldoImportar, "SAL_W", POS_saldoWhite, (v) => { alert("white " + v);})
			//parseFloat(v.replace(/\./g, "").replace(",", ".")))
			
			/*safeSetField(registroSaldoImportar, "SAL_W", POS_saldoWhite, (v) =>
				parseFloat(v.replace("$", "").replace(",", ".")) || 0
			);
			safeSetField(registroSaldoImportar, "SAL_B", POS_saldoBlack, (v) =>
				parseFloat(v.replace("$", "").replace(",", ".")) || 0
			);*/

			// Sanitización de CIF (DNI/CUIT) y Teléfono
			safeSetField(registroSaldoImportar, "CIF", POS_DNIcuit, sanitizeNumber);
			safeSetField(registroSaldoImportar, "TLF", POS_Telefono, sanitizeNumber);

			// Otros datos
			safeSetField(registroSaldoImportar, "MAIL", POS_mail);
			safeSetField(registroSaldoImportar, "CON_IVA", POS_CondicionIva, (v) => (v.split("-")[0] || "").trim());
			safeSetField(registroSaldoImportar, "DOM_FIS", POS_domfiscal);
			safeSetField(registroSaldoImportar, "VND", POS_Vendedor);
			safeSetField(registroSaldoImportar, "ARQ_REL", POS_ArquitectoRelacionado);
			safeSetField(registroSaldoImportar, "TIP_CLT", POS_TipoCliente);
			registroSaldoImportar.addRegister();
		}
	}
	catch (error) {
		theRoot.rollbackTrans();
		alert("Error en la importación: " + error.message);
	}
}
		// Si se creó una nueva transacción se finaliza
	if ( nuevaTrans )
	{
	  theRoot.commitTrans();
	};

