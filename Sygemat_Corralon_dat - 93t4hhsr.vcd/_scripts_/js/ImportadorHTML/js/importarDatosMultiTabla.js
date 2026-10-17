// ============================================================================================
// IMP_DAT_MULTI -- proceso vJavascript (RunInServer) para la importación MULTI-TABLA.
// Gemelo de IMP_DAT (import de una sola tabla), pero para varias tablas relacionadas a la vez a
// partir de un único fichero de origen (p.ej. un fichero de líneas de factura que da de alta o
// modifica, en el mismo import: series, clientes, artículos, cabeceras de factura y líneas).
//
// Deliberadamente NO comparte código con IMP_DAT (mismo criterio que en el resto de este
// proyecto: se prefiere un proceso nuevo y autocontenido antes que complicar uno ya validado).
//
// -----------------------------------------------------------------------------------------------
// FORMATO DEL PAYLOAD (variable "DAT", igual que IMP_DAT: [cabecera, datos])
// -----------------------------------------------------------------------------------------------
// cabecera = {
//   loteNum, totalLotes,        // igual que IMP_DAT: para que LINK_CLICKED sepa cuándo reiniciar
//                                // y cuándo terminar el acumulado de resultados (ver RESULTADO_IMPORT_ACUM)
//   tablas: [                   // una entrada por tabla, EN EL ORDEN DE ESCRITURA elegido por el
//                                // usuario (padres antes que hijos) -- fijo para todo el import,
//                                // se repite igual en cada lote (igual que tablaIdRef/indiceId en IMP_DAT)
//     {
//       tablaIdRef,              // "PROYECTO/TABLA", igual que en IMP_DAT
//       indiceId, indicePartes,  // índice de clave única para comprobar altas/modificaciones de ESTA tabla
//       idEsAlfa,                // tipo del campo "ID" de esta tabla (true=Alfa, false=Numérico) --
//                                // decide con qué método (fieldToString/fieldToDouble) se lee su ID
//                                // ya resuelto, para poder escribirlo en los punteros de tablas
//                                // posteriores de la misma fila
//       punteros: {              // solo los campos puntero que el usuario SÍ decidió resolver
//         CAMPO_PUNTERO: { posicion, tablaReferenciada }
//         // "posicion" = índice (0-based) dentro de este mismo array "tablas" de la tabla a la que
//         // apunta. SIEMPRE es una posición ANTERIOR a la de este descriptor (el asistente cliente
//         // solo permite resolver punteros hacia tablas que ya se han seleccionado Y que van antes
//         // en la secuencia -- ver puntoDeMontajePuntero() en importador_dinamico.js).
//       }
//     }, ...
//   ]
// }
// datos = {
//   filas: [
//     [ {campoId: valor, ...}, {campoId: valor, ...}, ... ],  // un objeto por tabla, EN EL MISMO
//     ...                                                      // ORDEN que cabecera.tablas -- una
//   ]                                                          // fila del fichero de origen = un
// }                                                            // array paralelo a "tablas"
//
// Los objetos de datos de cada tabla NUNCA incluyen los campos puntero (el navegador ya los excluye
// del mapeo normal, ver detectarYConfigurarPunteros() en importador_dinamico.js) -- su valor se
// calcula aquí, no viaja en el payload.
//
// -----------------------------------------------------------------------------------------------
// DECISIÓN DE DISEÑO 1 -- Por qué se procesa "una pasada completa por TABLA", no "una pasada por FILA"
// -----------------------------------------------------------------------------------------------
// El planteamiento más intuitivo sería recorrer las filas del fichero una a una y, para cada fila,
// procesar sus N tablas en orden (Series, luego Cliente, luego Artículo...), leyendo el ID recién
// creado/localizado de una tabla para escribirlo en el puntero de la siguiente, todo dentro de la
// misma fila. Se descartó por un motivo concreto y comprobado: un test real de IMP_DAT (fichero de
// 1000 filas con valores duplicados en un campo de índice único) mostró que TODAS las filas
// duplicadas fallaban como "error de alta" -- ninguna se trató como modificación, que es lo que
// pasaría si un readRegister() viera una fila añadida un instante antes, DENTRO DE LA MISMA
// ejecución/transacción, vía un addRegister() previo. Esto es indicio de que Velneo NO garantiza
// que una lectura vea de forma fiable una escritura hecha justo antes en la misma transacción
// abierta -- y ese es exactamente el mecanismo del que dependería el enfoque "por fila".
//
// Por eso este proceso hace, en su lugar, UNA PASADA COMPLETA POR TABLA a través de TODAS las
// filas del lote (primero todas las filas de la tabla 0, luego todas las de la tabla 1, etc.). El
// ID resuelto de cada fila para la tabla actual se guarda en un array JS en memoria (idsPorFila),
// NUNCA se vuelve a leer de Velneo -- así que el problema de arriba no puede darse: cuando la
// tabla 2 necesita el ID que la tabla 0 resolvió para esa misma fila, lo toma directamente de
// memoria, no hace ninguna lectura a Velneo para conseguirlo.
//
// -----------------------------------------------------------------------------------------------
// DECISIÓN DE DISEÑO 2 -- Caché por tabla dentro del lote (evitar release redundantes a Velneo)
// -----------------------------------------------------------------------------------------------
// En un fichero de líneas de factura, el mismo cliente/artículo/serie puede repetirse en cientos o
// miles de filas. Sin más, cada fila comprobaría/grabaría su tabla "propia" de forma independiente
// -- redundante si ya se ha resuelto esa misma clave un momento antes en el mismo lote. Se usa un
// Map por tabla (clave = valores de su índice de clave única para esa fila, en JSON; valor = ID ya
// resuelto) que vive solo durante la ejecución de este lote (se descarta al terminar el proceso).
// Buscar una clave en un Map es de coste prácticamente constante (tabla hash), así que consultarlo
// no penaliza -- lo que se evita es la comprobación/escritura real contra Velneo, que sí tiene
// coste. Efecto secundario asumido explícitamente: si una misma clave aparece en el mismo lote con
// datos ligeramente distintos en apariciones repetidas (p.ej. un CIF corregido más abajo en el
// fichero), solo la PRIMERA aparición de esa clave en el lote se comprueba/graba de verdad; las
// siguientes reutilizan su ID ya resuelto sin volver a tocar sus propios campos.
//
// -----------------------------------------------------------------------------------------------
// DECISIÓN DE DISEÑO 3 -- Un puntero que no se puede resolver NO bloquea la fila
// -----------------------------------------------------------------------------------------------
// Si el ID de la tabla a la que apunta un puntero no está disponible (porque esa tabla falló al
// grabarse en esta fila, o por cualquier otro motivo), simplemente NO se hace ese setField() -- el
// campo puntero queda vacío -- y se añade un aviso al detalle de errores. El resto de campos de esa
// tabla se intentan grabar igualmente. Si ese campo resultaba ser obligatorio en Velneo, ya lo
// detectará el propio addRegister()/modifyRegister() (que si falla, se informa por su cuenta) --
// no hace falta que este proceso decida de antemano qué campos son obligatorios.
//
// -----------------------------------------------------------------------------------------------
// DECISIÓN DE DISEÑO 4 -- Orden de escritura dentro de cada registro: punteros primero
// -----------------------------------------------------------------------------------------------
// Al construir cada registro se hace primero el setField() de los punteros ya resueltos, y
// DESPUÉS el resto de campos mapeados normalmente -- así el registro queda "conectado" con sus
// relaciones antes de rellenar el resto de sus propios datos.
//
// -----------------------------------------------------------------------------------------------
// CORRECCIÓN 2026-09 -- Un puntero como PARTE del índice de clave de su propia tabla
// -----------------------------------------------------------------------------------------------
// Si el índice de clave única de una tabla incluye, como una de sus partes, un campo que es a su
// vez un puntero resuelto en esta misma importación (p.ej. SER_CNT_M, cuyo índice EMP_SER_EJE
// incluye EMP y SER, ambos punteros hacia EMP_M/SER_M), ese valor NUNCA está en los "datos"
// normales de la fila -- vive aparte, en idsPorFila, resuelto igual que cualquier otro puntero.
// Si se construyen las claves para comprobar existencia/caché mirando solo los datos normales de
// la fila, esas partes salen "undefined" -- lo que provoca dos fallos a la vez: (a) dos filas con
// punteros distintos pero el mismo resto de partes se confunden en la caché (todas comparten la
// misma clave "undefined"), y (b) la comprobación de existencia nunca encuentra el registro real
// (que si tiene esos punteros con su valor de verdad puesto), así que reintenta un alta que la
// base de datos rechaza por duplicado. Por eso ahora los punteros de cada tabla se resuelven
// PRIMERO (antes de construir "claves"), y cualquier parte del índice que sea uno de esos
// punteros toma su valor ya resuelto, no el de los datos normales de la fila.
// ============================================================================================

var payload = JSON.parse(theRoot.varToString("DAT"));
var cabecera = payload[0];
var descriptoresTablas = cabecera.tablas;
var filas = payload[1].filas;

var altas = 0;
var modificaciones = 0;
var errores = 0;
var mensajesError = [];

// Desglose por tabla, para que el resumen final no mezcle en un solo total lo que ha pasado en
// las N tablas del import -- una sola cifra agregada puede esconder, p.ej., que una tabla ha
// tenido una alta inesperada mientras el resto eran todo modificaciones (ver LINK_CLICKED).
var porTabla = {};
function contarPorTabla(tablaIdRef, tipo) {
    if (!porTabla[tablaIdRef]) porTabla[tablaIdRef] = { altas: 0, modificaciones: 0, errores: 0 };
    porTabla[tablaIdRef][tipo] = porTabla[tablaIdRef][tipo] + 1;
};

var hayTransPrevia = theRoot.existTrans();
if (!hayTransPrevia) {
    var nuevaTrans = theRoot.beginTrans("Importación multi-tabla");
};

// Traza completa del registro que se ha intentado grabar -- mismo criterio que importarDatos.js:
// como los datos ya llegan en JSON sea cual sea el formato de origen, sirve para localizar la fila
// en el fichero buscando esos valores, sin depender de contar filas/líneas.
function construirTrazaRegistro(datosTabla) {
    var partes = [];
    for (var campoId in datosTabla) {
        partes.push(campoId + "=" + datosTabla[campoId]);
    };
    return " [" + partes.join(", ") + "]";
};

// Lee el ID ya resuelto (autokey) de un registro que se acaba de localizar o dar de alta, con el
// método correcto según el tipo de ese campo en ESTA tabla (ver idEsAlfa en importador_dinamico.js
// -- la mayoría de tablas tienen ID numérico, pero alguna, como una tabla arbolada de familias,
// puede tener un ID alfanumérico; no se puede asumir siempre el mismo método de lectura).
function leerIdResuelto(registro, idEsAlfa) {
    return idEsAlfa ? registro.fieldToString("ID") : registro.fieldToDouble("ID");
};

// idsPorFila[f][t] = ID ya resuelto (autokey) de la tabla en la posición "t" para la fila "f" del
// lote, o null si esa tabla falló/no se pudo resolver en esa fila. Vive en memoria durante toda la
// ejecución de este lote -- es precisamente lo que evita tener que releer nada de Velneo entre
// tablas (ver DECISIÓN DE DISEÑO 1 más arriba).
var idsPorFila = filas.map(function () { return {}; });

for (var t = 0; t < descriptoresTablas.length; t++) {
    var desc = descriptoresTablas[t];
    var cache = {}; // clave de índice (JSON) -> ID ya resuelto, o null si esa clave falló. Solo dura este lote.

    for (var f = 0; f < filas.length; f++) {
        var datosTabla = filas[f][t];
        try {
            // Resolver PRIMERO los punteros de esta tabla para esta fila -- hace falta antes de
            // construir "claves", por si alguna parte del índice de esta tabla es uno de ellos
            // (ver CORRECCIÓN 2026-09 más arriba). "valoresPuntero" no cuesta nada de calcular
            // (son lecturas de un array en memoria, idsPorFila), así que se hace siempre, aunque
            // luego solo se use de verdad la primera vez que aparece esta clave en el lote.
            var valoresPuntero = {};
            for (var campoPuntero in (desc.punteros || {})) {
                var idPadreCalc = idsPorFila[f][desc.punteros[campoPuntero].posicion];
                valoresPuntero[campoPuntero] = (idPadreCalc === null || idPadreCalc === undefined) ? null : idPadreCalc;
            };

            var claves = (desc.indicePartes || []).map(function (parte) {
                return valoresPuntero.hasOwnProperty(parte) ? valoresPuntero[parte] : datosTabla[parte];
            });
            var claveCache = JSON.stringify(claves);
            var idResuelto = cache.hasOwnProperty(claveCache) ? cache[claveCache] : undefined;

            if (idResuelto === undefined) {
                // Primera vez que aparece esta clave en este lote: comprobación real contra Velneo.
                var registroExistente = new VRegister(theRoot);
                registroExistente.setTable(desc.tablaIdRef);
                var existe = false;
                if (desc.indiceId && claves.length) {
                    existe = registroExistente.readRegister(desc.indiceId, claves, VRegister.SearchThis);
                };
                var registro = existe ? registroExistente : new VRegister(theRoot);
                if (!existe) registro.setTable(desc.tablaIdRef);

                // 1º los punteros ya resueltos hacia tablas anteriores de esta misma fila.
                for (var campoPuntero2 in valoresPuntero) {
                    if (valoresPuntero[campoPuntero2] !== null) {
                        registro.setField(campoPuntero2, valoresPuntero[campoPuntero2]);
                    } else {
                        errores = errores + 1;
                        contarPorTabla(desc.tablaIdRef, "errores");
                        mensajesError.push(desc.tablaIdRef + " -- no se ha podido resolver el puntero " +
                            campoPuntero2 + " hacia " + desc.punteros[campoPuntero2].tablaReferenciada + construirTrazaRegistro(datosTabla));
                    };
                };
                // 2º el resto de campos mapeados normalmente.
                for (var campoId in datosTabla) {
                    registro.setField(campoId, datosTabla[campoId]);
                };

                var ok = existe ? registro.modifyRegister() : registro.addRegister();
                if (ok) {
                    if (existe) { modificaciones = modificaciones + 1; contarPorTabla(desc.tablaIdRef, "modificaciones"); }
                    else { altas = altas + 1; contarPorTabla(desc.tablaIdRef, "altas"); };
                    idResuelto = leerIdResuelto(registro, desc.idEsAlfa);
                } else {
                    errores = errores + 1;
                    contarPorTabla(desc.tablaIdRef, "errores");
                    mensajesError.push(desc.tablaIdRef + " -- error " + registro.errorNumber() + " -- " +
                        registro.errorMessage() + construirTrazaRegistro(datosTabla));
                    idResuelto = null;
                };
                cache[claveCache] = idResuelto;
            };

            idsPorFila[f][t] = idResuelto;
        } catch (e) {
            errores = errores + 1;
            contarPorTabla(desc.tablaIdRef, "errores");
            mensajesError.push(desc.tablaIdRef + " -- error -- " + e + construirTrazaRegistro(datosTabla));
            idsPorFila[f][t] = null;
        };
    };
};

if (nuevaTrans) {
    theRoot.commitTrans();
};

theRoot.setVar("DAT", JSON.stringify({
    altas: altas, modificaciones: modificaciones, errores: errores, mensajesError: mensajesError, porTabla: porTabla
}));
