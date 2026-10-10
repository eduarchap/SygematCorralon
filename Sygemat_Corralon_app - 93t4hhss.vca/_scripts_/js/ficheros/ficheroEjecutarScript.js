// ------------------
// Ejecutar script
// ------------------

// Importamos clases de uso general
importClass("VQuery");

// Leemos las variables de entada
var script   = theRoot.varToString("SCR");
var formula  = theRoot.varToString("FOR");
var ficId    = theRoot.varToInt("FIC_ID");
var ficRegId = theRoot.varToInt("FIC_REG_ID");

// Leemos el fichero
var registroFic = new VRegister(theRoot);
registroFic.setTable("sygemat_corralon_dat/FIC_W");
registroFic.readRegister("ID", [ficId], VRegister.SearchThis);

// Leemos el registro de fichero
var registroFicReg = new VRegister(theRoot);
registroFicReg.setTable("sygemat_corralon_dat/FIC_REG_W");
registroFicReg.readRegister("ID", [ficRegId], VRegister.SearchThis);

// Leemos el registro de la plantilla del registro de fichero
if (registroFicReg)
{
	registroPlantilla = registroFicReg.readMaster("PLF");
	
	// Leemos los campos (plurales) de la plantilla del registro de fichero
	if (registroPlantilla)
		listaCampos = registroPlantilla.loadPlurals("PLF_W_PLF");
};

// Si hay fórmula
if (formula != "")
{
	// Preparamos el objeto JSON con los parámetros
	var parametros = eval('(' + formula.substring(1, formula.length - 1) + ')');
	
	// Si hay cálculos añadimos a los parámetros de calculos la propiedad valor
	if (parametros.calculos != undefined) {
		for (var numCalculo = 0; numCalculo < parametros.calculos.length; numCalculo++) {
			parametros.calculos[numCalculo].valor = 0;
		};
	};	
};

// Iniciar transacción
var hayTrans = theRoot.existTrans();
if (hayTrans == false)
{
	 var newTrans = theRoot.beginTrans("Cálculo script registro de fichero " + ficRegId);
};

// Ejecutamos el script
eval(script);

// Finalizar transacción
if (newTrans) {
	theRoot.commitTrans();
};
