var jsonStr = theRoot.varToString("JSON");
var rows = JSON.parse(jsonStr).table.rows;

var incluyeIVA = false;
var preciosConIVA = false;

for (var i = 0; i < rows.length; i++) {
  var cells = rows[i].c;
  var label = cells[6] && cells[6].v;
  var valor = cells[5] && cells[5].v === true;

  if (label === "¿Costo base incluye IVA?") incluyeIVA = valor;
  if (label === "¿Precios incluyen IVA?")   preciosConIVA = valor;
}

theRoot.setVar("RET", JSON.stringify({
  incluyeIVA: incluyeIVA,
  preciosConIVA: preciosConIVA
}));