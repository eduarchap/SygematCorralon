#include "(CurrentProject)/js/vReport/vReportFicheros.js"

importClass("VFile");

// -------------------------------------------------------
// Guardamos la definición del informe en la tabla
// -------------------------------------------------------
var senda = theApp.clientCachePath() + theRegisterIn.fieldToString("ID") + ".xml";
var xmlInforme = vReportFicheros.leerXml(senda);

var hayTrans = theRoot.existTrans();
if (hayTrans == false)
{
	var nuevaTrans = theRoot.beginTrans("Importando informe externo");
};

if (hayTrans || nuevaTrans)
{
	var registro = new VRegister(theRoot);
	registro.setTable("sygemat_corralon_dat/INF_DEF_W");
	var clave = [];
	clave.push(theRegisterIn.fieldToString("ID"));
	registro.readRegister("ID", clave, VRegister.SearchThis);
	registro.setField("DFN", xmlInforme);
	registro.modifyRegister();
	
	if (nuevaTrans)
	{
		theRoot.commitTrans();
	};
};

// Finalmente se elimina el fichero
var fichero = new VFile(senda);
fichero.remove();
