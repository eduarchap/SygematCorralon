// -------------------------------
// Sincronización de entidad
// -------------------------------

var idRefProceso = theRoot.varToString("ID_REF_PRC");

// Ejecutamos el proceso
if (idRefProceso != "" )
{
	importClass("VProcess");

	var proceso = new VProcess(theRoot);
	proceso.setProcess(idRefProceso);
	proceso.setRegisterIn(theRegisterIn);
	proceso.exec();
};