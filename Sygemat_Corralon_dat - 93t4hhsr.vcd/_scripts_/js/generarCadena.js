function agruparDe2(cadena) {
  const sinEspacios = cadena.replace(/ /g, '');
  const pares = [];
  for (let i = 0; i < sinEspacios.length - 1; i++) {
    pares.push(sinEspacios[i] + sinEspacios[i + 1]);
  }
  return pares.join(' ');
}

function separarPalabras(cadena) {
  var palabras = cadena.split(/\s+/).filter(Boolean);
  var largas = palabras.filter(p => p.length > 2).join(" ");
  var cortas = palabras.filter(p => p.length <= 2).join(" ");
  return { largas, cortas };
}


var cadenaOriginal = theRoot.varToString("CAD_ORI");
var resultado      = separarPalabras(cadenaOriginal);

theRoot.setVar("RES", agruparDe2(cadenaOriginal));
theRoot.setVar("RES_COR", resultado.cortas );
theRoot.setVar("RES_LAR", resultado.largas );

// Ejemplo
//console.log(agruparDe2("casa azul")); // "ca as sa aa az zu ul"