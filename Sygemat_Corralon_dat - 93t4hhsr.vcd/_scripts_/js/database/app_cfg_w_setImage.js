// Modificar campo icono de aplicación con imagen de proyecto
importClass("VImage");

// Modificar campo icono de aplicación
if (theRegisterIn.fieldToImage("APP_ICO") == null) {
	var iconoApp = new VImage();
	iconoApp.loadResource("sygemat_corralon_app/APP_LOG");
	theRegisterIn.setFieldImage("APP_ICO", iconoApp);
}

// Modificar campo icono de aplicación en dock de menú
if (theRegisterIn.fieldToImage("APP_ICO_MEN") == null) {
	var iconoAppMenu = new VImage();
	iconoAppMenu.loadResource("sygemat_corralon_app/MEN_APP_LOG_APP");
	theRegisterIn.setFieldImage("APP_ICO_MEN", iconoAppMenu);
}
