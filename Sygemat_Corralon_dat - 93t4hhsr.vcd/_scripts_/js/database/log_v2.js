/*
 * ------------------------------------------------------------------
 * Log transaccional (auditoría) — 1 registro por operación
 * ------------------------------------------------------------------
 * Inserta UNA sola fila en LOG_TRN_CAB por cada operación de guardado
 * (alta / modificacion / baja). Los campos afectados se guardan en el
 * campo CAMBIOS como un JSON:
 *
 *   [ { "campo": "PRECIO", "anterior": "10.00", "nuevo": "12.50" },
 *     { "campo": "NOMBRE", "anterior": "abc",   "nuevo": "abd"   } ]
 *
 * Un único addRegister por operación (no 1 + N): una tabla de 500
 * campos genera 1 alta, no 501.
 *
 * Es append-only (sin read-modify-write, sin condición de carrera) y
 * atómico con la transacción del guardado que dispara el trigger.
 *
 * IMPORTANTE (verificado contra el motor de Velneo):
 *   - El script NO sabe por sí mismo qué operación lo disparó ni cuál
 *     es la clave del registro; los aporta el manejador del trigger:
 *        sygemat_corralon_dat/LOG_TRN      -> activo (bool)
 *        sygemat_corralon_dat/LOG_TRN_OPE  -> "A" (alta) | "M" (modificacion) | "B" (baja)
 *        sygemat_corralon_dat/LOG_TRN_CLV  -> clave del registro auditado
 *   - COLOCACIÓN DE LOS TRIGGERS (los tres POSTERIORES):
 *        alta         -> POSTERIOR a crear     (código ya asignado)
 *        modificacion -> POSTERIOR a modificar  (valor anterior disponible)
 *        baja         -> POSTERIOR a eliminar   (ver nota)
 *     NOTA baja: el motor re-lee el registro de disco justo antes del
 *     borrado físico, y ese re-read ocurre DESPUÉS del trigger anterior.
 *     Por eso en el trigger ANTERIOR los buffers pueden salir vacíos; en
 *     el POSTERIOR ya están poblados y el borrado físico no los limpia.
 *     El valor a borrar se lee con oldFieldToString (buffer "sin modificar",
 *     que es el que Velneo usa como contenido del registro al eliminarlo).
 *   - CAMBIOS debe ser un campo OBJETO TEXTO (sin tope de tamaño).
 *   - LOG_TRN_CAB NO debe tener triggers de auditoría (evitar recursión).
 * ------------------------------------------------------------------
 */

// ¿Módulo de log activo?
if( true === theApp.globalVarToBool("sygemat_corralon_dat/LOG_TRN") )
{
	// Datos que la plataforma no expone al script: los aporta el trigger
	var operacion = theApp.globalVarToString("sygemat_corralon_dat/LOG_TRN_OPE");
	var claves    = theApp.globalVarToString("sygemat_corralon_dat/LOG_TRN_CLV");

	// Metadatos de la tabla auditada
	var tablaInfo  = theRegisterIn.tableInfo();
	var tablaIdRef = tablaInfo.idRef();
	var numCampos  = tablaInfo.fieldCount();

	// 1) Reunir los cambios en un array:
	//    - baja: snapshot de lo que se borra. En baja no hay campos
	//            "modificados" (isFieldModified siempre da false), así que
	//            recorremos TODOS los campos y leemos el valor original con
	//            oldFieldToString (con fallback al buffer actual). El trigger
	//            debe ser el POSTERIOR a la baja (ver cabecera).
	//    - alta / modificacion: solo los campos modificados (anterior -> nuevo)
	var cambios = [];
	for (var numCampo = 0; numCampo < numCampos; numCampo++)
	{
		if (operacion === "B")   // baja
		{
			var valorBaja = theRegisterIn.oldFieldToString(numCampo);   // contenido del registro borrado
			if (valorBaja === "")
				valorBaja = theRegisterIn.fieldToString(numCampo);      // fallback al buffer actual
			if (valorBaja !== "")   // omitimos vacíos para no inflar el JSON
			{
				cambios.push({
					campo:    tablaInfo.fieldId(numCampo),
					anterior: valorBaja,   // valor borrado
					nuevo:    ""
				});
			}
		}
		else if (theRegisterIn.isFieldModified(numCampo))
		{
			cambios.push({
				campo:    tablaInfo.fieldId(numCampo),
				anterior: theRegisterIn.oldFieldToString(numCampo),  // valor previo (nativo)
				nuevo:    theRegisterIn.fieldToString(numCampo)       // valor nuevo
			});
		}
	}

	// En una modificación sin cambios reales no registramos nada.
	// En alta y baja siempre dejamos constancia de la operación.
	if (operacion !== "M" || cambios.length > 0)
	{
		// 2) Una única fila por operación; los campos afectados van en CAMBIOS (JSON)
		var cab = new VRegister(theRoot);
		cab.setTable("sygemat_corralon_dat/LOG_TRN_CAB");
		//cab.setField("FECHA_HORA", new Date());              // campo fecha-hora nativo
		cab.setField("TABLA",      tablaIdRef);
		cab.setField("CLAVE",      claves);
		cab.setField("OPERACION",  operacion);
		cab.setField("USUARIO",    theApp.userName());
		cab.setField("MAQUINA",    theApp.sysMachineName());
		cab.setField("CAMBIOS",    JSON.stringify(cambios));  // campo objeto texto
		cab.addRegister();
	}
}
