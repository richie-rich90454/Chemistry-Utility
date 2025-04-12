document.addEventListener("DOMContentLoaded",function(){
    fetch("/api/ptable", {
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        }
      }).then(response=>response.json()).then(data=>{
          console.log(data);
        }).catch(err=>console.error("Error fetching data:", err));  
});