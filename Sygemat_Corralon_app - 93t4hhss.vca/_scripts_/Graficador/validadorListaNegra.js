var listaNegra = [];
listaNegra.push("deleteRegister");
listaNegra.push("deleteRegisterWhithoutDeupdating");
listaNegra.push("modifyRegister");
listaNegra.push("emptyTable");

function containsAnySubstring(array, text) {
  if (!text || !array || array.length === 0) return false;

  for (let i = 0; i < array.length; i++) {
    if (text.includes(array[i])) {
      return true; // Early exit = máximo rendimiento
    }
  }
  return false;
}

theRoot.setVar("TIE", containsAnySubstring(listaNegra, theRoot.varToString("SCR")));