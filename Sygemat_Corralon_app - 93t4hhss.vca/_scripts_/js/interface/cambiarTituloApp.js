// Cambiar el título de la ventana

// Si hay un nombre de aplciación configurado se aplica, en caso contrario no se cambia el título de la ventana
if (theApp.globalVarToString("sygemat_corralon_dat/APP_NOM") != "")
{
	var nombre  = theApp.globalVarToString("sygemat_corralon_dat/APP_NOM");
	var empresa = theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM");
	//theMainWindow.setTitle( "" + nombre  + " - " + empresa);
	theMainWindow.setTitle( " " );
};
