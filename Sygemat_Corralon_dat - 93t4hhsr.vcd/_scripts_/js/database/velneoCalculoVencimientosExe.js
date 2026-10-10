// ------------------------------------------------------
// Llamada al proceso de cálculo de vencimientos
// ------------------------------------------------------

//Se crea el manejador de objeto del proceso
var procesoCalculoPrecio = new VProcess(theRoot);

//Se alimenta con las variables necesarias
procesoCalculoPrecio.setProcess("gestion.dat/CAL_PRE_ART");
procesoCalculoPrecio.setVar("PRM_TRF_TIP", 2);
procesoCalculoPrecio.setVar("PRM_FCH", currentDate());
procesoCalculoPrecio.setVar("PRM_CLF", CLF);
procesoCalculoPrecio.setVar("PRM_ENT_GES", ENT_GES);
procesoCalculoPrecio.setVar("PRM_ART", ART);
procesoCalculoPrecio.setVar("PRM_CNT", 1);

//Se dispara el proceso con los parametros indicados
if (procesoCalculoPrecio.exec())
{
  //Leemos las variables de los resultados de la ejecucion de l proceso
  var precioPRE = procesoCalculoPrecio.varToDouble("PRE");
  var precioDTO_1 = procesoCalculoPrecio.varToDouble("DTO_1");
  var precioDTO_2 = procesoCalculoPrecio.varToDouble("DTO_2");
  var precioDTO_3 = procesoCalculoPrecio.varToDouble("DTO_3");
  var precioDTO_4 = procesoCalculoPrecio.varToDouble("DTO_4");
  var precioDTO_5 = procesoCalculoPrecio.varToDouble("DTO_5");
}
else
{
  var precioPRE = 0;
  var precioDTO_1 = 0;
  var precioDTO_2 = 0;
  var precioDTO_3 = 0;
  var precioDTO_4 = 0;
  var precioDTO_5 = 0;
};
