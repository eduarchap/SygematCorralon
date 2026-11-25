importClass("VTextFile");
importClass("VFile");

var payload = JSON.parse(theRoot.varToString("DAT"));
var nombreArchivo = payload.nombreArchivo;
var contenidoJson = JSON.stringify(payload.plantilla, null, 2);

var ruta = theApp.globalVarToString("sygemat_corralon_dat/SND_DES").trim();
if (ruta.length && (ruta.charAt(ruta.length - 1) === "/" || ruta.charAt(ruta.length - 1) === "\\")) {
    ruta = ruta.substring(0, ruta.length - 1);
};

if (!ruta) {
    alert("No se ha configurado ninguna senda de descargas.\nRevisa la variable global \"Senda descargas\".");
} else {
    var fi = new VTextFile(ruta + "/" + nombreArchivo);
    fi.setCodec("UTF-8");
    if (fi.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate)) {
        fi.write(contenidoJson);
        fi.close();
        alert("Plantilla guardada en:\n" + ruta + "/" + nombreArchivo);
    } else {
        alert("No se ha podido guardar la plantilla en:\n" + ruta + "/" + nombreArchivo + "\n\nComprueba que la carpeta exista y que tengas permisos de escritura.");
    };
};