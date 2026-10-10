importClass("VProcess");

var datos = JSON.parse(theRoot.varToString("DATA"));

var columnas = datos.table.cols;
var filas = datos.table.rows;

// Posiciones definidas
var POS_referenciaArticulo  = 0;
var POS_unimedOri        	= 2;
var POS_unimedDes           = 3;
var POS_valconv           = 4;


var bloqueTranscacion       = 500;

var contadorRegistroOK      = 0;
var contadorRegistroKO      = 0;
var detallesError           = "";

var nuevaTrans = false;
var hayTrans = theRoot.existTrans();
if (!hayTrans) {
  nuevaTrans = theRoot.beginTrans("Importando datos bloque 0");
}

if (hayTrans || nuevaTrans) {
  for (var i = 1; i < filas.length; i++) {
    var registoJson = filas[i].c;
    var ref = "";
	var uni_med_ori = "";
	var uni_med_des = "";
    var codigoArticulo = 0;
	var valor = 0;

    try {
      ref = (registoJson[POS_referenciaArticulo] && registoJson[POS_referenciaArticulo].v)
        ? registoJson[POS_referenciaArticulo].v.toString().trim()
        : "";
      if (!ref) throw "Referencia vacía";
      codigoArticulo = verificarArticulo(ref);
    } catch (err) {
      codigoArticulo = "";
    }
	uni_med_ori = registoJson[ POS_unimedOri ].v.toString();
	uni_med_des = registoJson[ POS_unimedDes ].v.toString();
	valor = registoJson[ POS_valconv ].v;
    if (codigoArticulo !== "") {
      // damos de alta las equivalencias
		var registroMovimientos = new VRegister(theRoot);
          registroMovimientos.setTable("sygemat_corralon_dat/ART_EQU_IMP");
          registroMovimientos.setField("REF", ref);
          registroMovimientos.setField("UND_MED_DES", uni_med_des);
          registroMovimientos.setField("UND_MED_ORI", uni_med_ori);
          registroMovimientos.setField("VAL_CON",valor);
          registroMovimientos.addRegister();

      contadorRegistroOK++;
    } else {
      contadorRegistroKO++;
      detallesError += "Registro " + (i + 1) + " => REF: " + ref + "\n";
    }

    if ((i % bloqueTranscacion) === 0 && i > 0) {
      theRoot.commitTrans();
      nuevaTrans = theRoot.beginTrans("Importando datos bloque " + (i / bloqueTranscacion));
    }
  }
}

if (nuevaTrans) {
  theRoot.commitTrans();
}

theRoot.setVar("CON_OK", contadorRegistroOK);
theRoot.setVar("CON_KO", contadorRegistroKO);
theRoot.setVar("RES", detallesError);


function verificarArticulo(codigoArticulo) {
  var listaArticulo = new VRegisterList(theRoot);
  listaArticulo.setTable("sygemat_corralon_dat/ART_M");
  listaArticulo.load("SKU", [codigoArticulo]);
  return (listaArticulo.size() > 0) ? listaArticulo.readAt(0).fieldToString("ID") : "";
}
