importClass("XMLHttpRequest");
var xhr = new XMLHttpRequest();
xhr.withCredentials = true;

/*xhr.addEventListener("readystatechange", function() {
  if(this.readyState === 4) {
    console.log(this.responseText);
  }
});*/

xhr.open("DELETE", "https://api.mercadopago.com/instore/qr/seller/collectors/230594625/pos/SUC004POS001/orders");
xhr.setRequestHeader("Authorization", "Bearer TEST-1467122565000060-122617-284a9ea6388544d0a02c180f41c1ca99-230594625");

xhr.send();