/**
 * Devuelve el icono de un formulario (objeto)
 *
 * @param {VObjectInfo} formulario Objeto de la clase VObjectInfo del formulario
  * @return {VImage} icono Objeto de la clase VImage con el icono del formulario
 */
function iconoFormulario(formulario)
{
	if (formulario)
	{
		importClass("VImage");
		var icono = new VImage();
		var iconoIdRef = formulario.propertyData(6).replace("@", "/");
		icono.loadResource(iconoIdRef);
		return icono;
	};
};

/**
 * Devuelve el icono de un formulario (idRef)
 *
 * @param {[String]} formIdRef identificador de referencia del formulario
  * @return {VImage} icono Objeto de la clase VImage con el icono del formulario
 */
function iconoFormularioIdRef(formIdRef)
{
	var proyectoInfo = theApp.projectInfo(formIdRef.split("/")[0]);
	if (proyectoInfo)
	{
		var formInfo = proyectoInfo.objectInfo(VObjectInfo.TypeForm, formIdRef.split("/")[1]);
		if (formInfo)
		{
			importClass("VImage");
			var icono = new VImage();
			var iconoIdRef = formInfo.propertyData(6).replace("@", "/");
			icono.loadResource(iconoIdRef);
			return icono;
		};
	};
};
