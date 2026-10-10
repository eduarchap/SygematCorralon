// Personalización de la barra de menú

// Se limpia la barra de menú
theMainWindow.clearMenuBar();

// Se añaden las opciones generales comunes para todos los usuarios
theMainWindow.addMenuToMenuBar("sygemat_corralon_app/PRN_APL");
theMainWindow.addMenuToMenuBar("sygemat_corralon_app/PRN_LST");

// El menú configuración solo para supervisores
if (theApp.isAdministrator()) {
	theMainWindow.addMenuToMenuBar("sygemat_corralon_app/PRN_SUP");
}

// Se añaden una opción "..." como punto de inserción
theMainWindow.addMenuToMenuBar("sygemat_corralon_app/PRN_INS");
