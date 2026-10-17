// Lista negra de comandos vJavascript que pueden comprometer la base de datos
// Se devuelve true o false en función de si en el texto existe alguna de las palabras de la lista negra

var listaNegra = [];
listaNegra.push("deleteRegister");
listaNegra.push("deleteRegisterWhithoutDeupdating");
listaNegra.push("modifyRegister");
listaNegra.push("emptyTable");
listaNegra.push("addRegister");

function containsAnySubstring(array, text) {
  if (!text || !array || array.length === 0) return false;

  for (let i = 0; i < array.length; i++) {
    if (text.includes(array[i])) {
      return true; 
    }
  }
  return false;
}

theRoot.setVar("TIE", containsAnySubstring(listaNegra, theRoot.varToString("SCR")));