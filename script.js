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
        let elements=data;
        document.getElementById("lookup-button").addEventListener("click", function(){
            let input=document.getElementById("element-input").value.trim().toLowerCase();
            let element=elements.find(el=>
                el.symbol.toLowerCase()==input||el.name.toLowerCase()==input
            );
            if (element){
                let info=`<p><strong>Symbol:</strong> ${element.symbol}</p><p><strong>Name:</strong> ${element.name}</p><p><strong>Atomic Mass:</strong> ${element.atomicMass} u</p><p><strong>Atomic Number:</strong> ${element.atomicNumber}</p><p><strong>Electronegativity:</strong> ${element.electronegativity!==null?element.electronegativity:'N/A'}</p><p><strong>Electron Affinity:</strong> ${element.electronAffinity!==null?element.electronAffinity:'N/A'} kJ/mol</p><p><strong>Atomic Radius:</strong> ${element.atomicRadius!==null?element.atomicRadius:'N/A'} pm</p><p><strong>Ionization Energy:</strong> ${element.ionizationEnergy!==null?element.ionizationEnergy:'N/A'} kJ/mol</p><p><strong>Valence Electrons:</strong> ${element.valenceElectrons}</p><p><strong>Total Electrons:</strong> ${element.totalElectrons}</p><p><strong>Group:</strong> ${element.group}</p><p><strong>Period:</strong> ${element.period}</p><p><strong>Type:</strong> ${element.type}</p>`;
                document.getElementById("element-info").innerHTML=info;
            }
            else{
                document.getElementById("element-info").innerHTML="<p>Element not found</p>";
            }
        });
    })
    .catch(err=>{
        console.error("Error fetching data:", err);
        document.getElementById("element-info").innerHTML="<p>Error loading element data table</p>";
    });
});