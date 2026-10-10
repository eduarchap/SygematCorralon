/**
 * --------------------------------------------------------------------------------
 * Devuelve el tipo de tabla según el enum
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function enumTipoTabla(tipo)
{
	switch (tipo)
	{
		case VTableInfo.TypeMaster:		return "Maestra"; 				break;
		case VTableInfo.TypeHistorical:	return "Histórica";				break;
		case VTableInfo.TypeMasterSub:	return "Submaestra"; 			break;
		case VTableInfo.TypeMasterTree:	return "Arbolada"; 				break;
		case VTableInfo.TypeMasterExt:	return "Maestra de extensión";	break;
		default: 						return "";						break;
	};	
};

/**
 * --------------------------------------------------------------------------------
 * Devuelve el tipo de campos según el enum
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function enumTipoCampo(tipo)
{
	switch (tipo)
	{
		case VTableInfo.FieldTypeAlpha128		: return "Alfa 128"; 			break;
		case VTableInfo.FieldTypeAlpha256		: return "Alfa 256";			break;
		case VTableInfo.FieldTypeAlpha40		: return "Alfa 40"; 	   		break;
		case VTableInfo.FieldTypeAlpha64		: return "Alfa 64"; 			break;
		case VTableInfo.FieldTypeAlphaLatin1	: return "Alfa Latin 1";		break;
		case VTableInfo.FieldTypeAlphaUtf16	 	: return "Alfa UTF-16";			break;
		case VTableInfo.FieldTypeBool			: return "Booleano";			break;
		case VTableInfo.FieldTypeDate			: return "Fecha";				break;
		case VTableInfo.FieldTypeDateTime		: return "Tiempo";				break;
		case VTableInfo.FieldTypeFormulaAlfa	: return "Fórmula alfabética";	break;
		case VTableInfo.FieldTypeFormulaDate	: return "Fórmula fecha";		break;
		case VTableInfo.FieldTypeFormulaDateTime: return "Fórmula tiempo";		break;
		case VTableInfo.FieldTypeFormulaNumeric : return "Fórmula numérica";	break;
		case VTableInfo.FieldTypeNumeric		: return "Numérico";			break;
		case VTableInfo.FieldTypeObject			: return "Objeto";				break;
		case VTableInfo.FieldTypeTime			: return "Hora";				break;
		case VTableInfo.FieldTypeVirtualBind	: return "Enlace";				break;
		default: 								  return "";					break;
	};	
};

/**
 * --------------------------------------------------------------------------------
 * Devuelve el tipo de objeto según el enum
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function enumTipoObjeto(tipo)
{
	switch (tipo)
	{
		case VTableInfo.ObjectTypePicture : return "Dibujo"; 			break;
		case VTableInfo.ObjectTypeText	  : return "Texto";				break;
		case VTableInfo.ObjectTypeRichText: return "Texto enriquecido";	break;
		case VTableInfo.ObjectTypeBinary  : return "Binario"; 			break;
		case VTableInfo.ObjectTypeFormula : return "Fórmula dinámica";	break;
	};	
};

/**
 * --------------------------------------------------------------------------------
 * Devuelve el tipo de enlace según el enum
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function enumTipoEnlace(tipo)
{
	switch (tipo)
	{
		case VTableInfo.BindTypeNone                : return "Ninguno"; 						break;
		case VTableInfo.BindTypeMaster              : return "Tabla maestra";					break;
		case VTableInfo.BindTypeStatic              : return "Tabla estática";					break;
		case VTableInfo.BindTypeIndirectReal        : return "Indirecto real"; 					break;
		case VTableInfo.BindTypeIndirectVirtual     : return "Indirecto virtual";				break;
		case VTableInfo.BindTypeSingularPluralPos   : return "Singular de plural por posición";	break;
		case VTableInfo.BindTypeSingularPluralIndex : return "Singular de plural por índice";	break;
		case VTableInfo.BindTypeAdjacentSibling     : return "Hermano contiguo";				break;
		case VTableInfo.BindTypeMasterExt           : return "Maestro de extensión";			break;
	};	
};

/**
 * --------------------------------------------------------------------------------
 * Devuelve el tipo de índice según el enum
 *
 * 14/06/2016 - Versión 1.0
 * --------------------------------------------------------------------------------
 */
function enumTipoIndice(tipo)
{
	switch (tipo)
	{
		case VTableInfo.IndexTypeSingleKey    : return "Clave única";			break;
		case VTableInfo.IndexTypeWords        : return "Palabras";				break;
		case VTableInfo.IndexTypeMultiKey     : return "Múltiples claves";		break;
		case VTableInfo.IndexTypeAcceptRepeat : return "Acepta repetidas"; 		break;
		case VTableInfo.IndexTypeWordParts    : return "Trozos de palabras";	break;
	};	
};
