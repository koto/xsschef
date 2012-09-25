alert('from ext');
s = document.createElement("DIV");
s.id = "xssme";
document.body.appendChild(s);
document.getElementById('xssme').innerHTML = "hello <img src=x onerror='alert(&quot;me too&quot;)'> here";
