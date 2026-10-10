importClass("XMLHttpRequest");
//Seteamos las variables para generar el QR

var total = theRoot.varToInt("TOT_PED");
var num_ped = theRoot.varToString("NUM_PED");
var tkn = theRoot.varToString("TKN");
var usr_id = theRoot.varToInt("USR_ID");
var id_suc = theRoot.varToString("ID_SUC");
var id_cja = theRoot.varToString("ID_CJA");

var data = JSON.stringify({
  "cash_out": {
    "amount": 0
  },
  "description": "Boton de pago",
  "external_reference": num_ped,
  "items": [
    {
      "sku_number": "999999",
      "category": "Salon",
      "title": "Ventas QR salon",
      "description": "Ventas QR salon",
      "unit_price": total,
      "quantity": 1,
      "unit_measure": "unit",
      "total_amount": total
    }
  ],
  "notification_url": "http://www.yourserver.com/notification",
  "title": "Product order",
  "total_amount": total
});

var xhr = new XMLHttpRequest();
xhr.withCredentials = true;

alert("https://api.mercadopago.com/instore/qr/seller/collectors/"+usr_id+"/stores/"+id_suc+"/pos/"+id_cja+"/orders")
xhr.open("PUT", "https://api.mercadopago.com/instore/qr/seller/collectors/"+usr_id+"/stores/"+id_suc+"/pos/"+id_cja+"/orders",false);
xhr.setRequestHeader("Content-Type", "application/json");
xhr.setRequestHeader("Authorization", "Bearer "+ tkn);

xhr.send(data);

if ( (xhr.status == 204) ) {
    theRoot.setVar("RET" ,"204");
}