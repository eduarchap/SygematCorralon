// ----------------------------
// Dejar la lista con los seleccionados
// ----------------------------
var setListaSeleccionados = function (control)
{
	if (control)
	{
		var lista = new VRegisterList(theRoot);
		control.getMultiSelection(lista);
		control.clear();
		control.setList(lista);
	};
};
