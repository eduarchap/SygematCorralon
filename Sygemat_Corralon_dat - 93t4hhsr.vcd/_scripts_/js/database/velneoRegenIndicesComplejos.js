/* 
 * Regenerar todos los índices complejos
 * de todos los proyectos de datos 
 */

alert("<---------- INICIO DE REGENERACIÓN DE ÍNDICES COMPLEJOS ---------->");
var proyectoInfo = theApp.mainProjectInfo();
var totalIndicesComplejos = proyectoInfo.allObjectCount(VObjectInfo.TypeComplexIndex);
for (var i = 0; i < totalIndicesComplejos; i++) {
	var indiceComplejoInfo = proyectoInfo.allObjectInfo(VObjectInfo.TypeComplexIndex, i);
	alert("Regenerando índice complejo " + (i + 1) + " de " + totalIndicesComplejos + " : " + indiceComplejoInfo.idRef());
	theApp.regenComplexIndex(indiceComplejoInfo.idRef(), false);
}
alert("<---------- FIN DE LA REGENERACIÓN DE ÍNDICES COMPLEJOS ---------->");