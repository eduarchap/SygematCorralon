// Actualizar cotización de una divisa
importClass("XMLHttpRequest");
importClass("VXmlReader");

// Declaramos las variables
var lista = new VRegisterList(theRoot),
	ano,
	claves = [],
	cotizacion,
	dia,
	divisas = "",
	fecha,
	index,
	mes,
	monedaDestino,
	monedaOrigen,
	monedas,
	monedasArray,
	registroCotizacion,
	registroDivisa,
	registroMoneda,
	response,
	transActual,
	transNueva,
	url,
	xhr,
	xml;

// Leemos todas las divisas a solicitar su cotización
lista.setTable("sygemat_corralon_dat/DIV_M");
lista.load("MON_ORI_DES", []);

for (index = 0; index < lista.size(); index++) {
	registroDivisa = lista.readAt(index);
	if (divisas !== "") { divisas += "," };
	divisas += '"' + registroDivisa.fieldToString("MON_ORI.ISO") + registroDivisa.fieldToString("MON_DES.ISO") + '"';
}

// Preparamos la URL y ejecutamos la llamada al webservice
url="http://query.yahooapis.com/v1/public/yql?q=select * from yahoo.finance.xchange where pair in (" + divisas + ")&env=store://datatables.org/alltableswithkeys";

xhr = new XMLHttpRequest();
xhr.open("GET", url, false);
xhr.send();

if ( (xhr.errorCode==0) && (xhr.status == 200) ) {
	response = xhr.response;
}

// Creamos la transacción si no hay ninguna abierta
transActual = theRoot.existTrans();
if (transActual === false) {
	transNueva = theRoot.beginTrans("Importando cotizaciones de divisas");
}

// Preparamos el registro de monedas para hacer las lecturas
registroMoneda = new VRegister(theRoot);
registroMoneda.setTable("sygemat_corralon_dat/MON_M");

// Procesamos el retorno XML para leer las cotizaciones
xml = new VXmlReader();
xml.addDataString(response);

if(xml.readNextStartElement()) {
	while(xml.readNext() && !xml.atEnd()) {
		if (xml.name() === "Name"){
			monedas = xml.readElementText();
		}
		if (xml.name() === "Rate"){
			cotizacion = xml.readElementText();
		}
		if (xml.name() === "Date"){
			fecha = xml.readElementText();
			dia = ("00" + fecha.split("/")[1]).slice(-2);
			mes = ("00" + fecha.split("/")[0]).slice(-2);
			ano = fecha.split("/")[2];

			// Leemos las monedas origen y destino
			monedasArray = monedas.split("/");
			monedaOrigen = 0;
			monedaDestino = 0;
			if (registroMoneda.readRegister("ISO", [monedasArray[0]], VRegister.SearchThis) === true) { 
				monedaOrigen = registroMoneda.fieldToInt("ID");
			}
			if (registroMoneda.readRegister("ISO", [monedasArray[1]], VRegister.SearchThis) === true) { 
				monedaDestino = registroMoneda.fieldToInt("ID");
			}

			// Creamos o modificamos el registro de cotización
			registroCotizacion = new VRegister(theRoot);
			registroCotizacion.setTable("sygemat_corralon_dat/DIV_COT_M");
			claves[0] = monedaOrigen;
			claves[1] = monedaDestino;
			claves[2] = ano + "-" + mes + "-" + dia;
			if (registroCotizacion.readRegister("MON_ORI_DES", claves, VRegister.SearchThis) === true) {
				registroCotizacion.setField("COT", cotizacion);
				registroCotizacion.modifyRegister();
			} else {
				registroCotizacion.setField("MON_ORI", monedaOrigen);
				registroCotizacion.setField("MON_DES", monedaDestino);
				registroCotizacion.setField("FCH", ano + "-" + mes + "-" + dia);
				registroCotizacion.setField("COT", cotizacion);
				registroCotizacion.addRegister();				
			}
		}
	}
}

// Cerramos la transacción si es nueva
if (transNueva) {
	theRoot.commitTrans();
}
