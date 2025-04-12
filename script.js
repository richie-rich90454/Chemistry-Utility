document.addEventListener("DOMContentLoaded", function (){
    fetch("/api/ptable",{
        headers:{
            "X-Requested-With": "XMLHttpRequest"
        }
    })
    .then(response=>{
        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data=>{
        console.log(data);
    })
    .catch(err=>{
        console.error("Error fetching data:", err);
    });
});