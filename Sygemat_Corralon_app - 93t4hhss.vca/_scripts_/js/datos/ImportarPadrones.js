////////////////////////////////////////////////////////////
// Ejemplo de lectura de un fichero de texto
var content = theRoot.varToString("SND");
var lines = content.split("\n");


				
// Para usar las funciones de la clase VFile primero hay que importarla
/*importClass( "VTextFile" );
importClass( "VFile" );


var tablaIdRef = function (tablaId)
{
    // Se lee el proyecto principal
    var proyecto = theApp.mainProjectInfo();
    
    // Se repasan todas las tablas buscando la recibida en el parámetro
    for (var numTabla = 0; numTabla < proyecto.allTableCount(); numTabla++) {
        if (proyecto.allTableInfo(numTabla).id() == tablaId) {
            return proyecto.allTableInfo(numTabla).idRef();
        }
    }

    // Si no se ha encontrado se devuelve null
    return null;
};

 // Se prepara el idRef de la tabla destino de la importación
var ficheroIdRef = tablaIdRef("PAD_ARBA");
alert(theRoot.varToString("SND"));
// Se declara el objeto fichero
var fi = new VTextFile( theRoot.varToString("SND") );
var batch = 1000;
var content = "";
var lines;

// Se abre el fichero en modo de sólo lectura
if ( fi.open( VFile.OpenModeReadOnly ) )
{
    // Leer todo el fichero
    alert( "Tamaño del fichero = " + fi.size() + " bytes" );

    // Leer todo el fichero
    content= fi.readAll();

    
    // Se cierra el fichero
    fi.close();
}
else {
    // Si no ha sido posible abrir el fichero se muestra error
    alert( "No se pudo abrir el fichero " + fi.fileName() + ", error " + fi.error(), "Error" );
}

// Dividir el contenido en líneas y procesar de a lotes
//alert(content);
lines = content.split("\n");
for (var i = 0; i < lines.length; i += batch) {
  var batchLines = lines.slice(i, i + batch);
  
  // Procesar las líneas del lote actual
  for (var j = 0; j < batchLines.length; j++) {
    var line = batchLines[j];
    var fields = line.split(";");
    // Procesar los campos de la línea actual
    
    // Si llegamos al final del archivo, salir del loop
    if (i + j >= lines.length - 1) {
      break;
    }
  }
  
  // Si ya procesamos todas las líneas, salir del loop
  if (i + batch >= lines.length - 1) {
    break;
  }
}*/

