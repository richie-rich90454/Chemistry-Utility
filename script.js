document.addEventListener("DOMContentLoaded", function(){
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
        function parseElement(formula, i){
            if (i<formula.length&&/[A-Z]/.test(formula[i])){
                let symbol=formula[i];
                i++;
                if (i<formula.length&&/[a-z]/.test(formula[i])){
                    symbol+=formula[i];
                    i++;
                }
                return [symbol, i];
            }
            else{
                throw new Error("Invalid element at position "+i);
            }
        }
        function parseNumber(formula, i){
            let number=0;
            while (i<formula.length&&/[0-9]/.test(formula[i])){
                number=number*10+parseInt(formula[i]);
                i++;
            }
            return [number>0?number:1, i];
        }
        function calculateMolarMass(formula, elements){
            let stack=[0];
            let i=0;
            while (i<formula.length){
                if (/[A-Z]/.test(formula[i])){
                    let [symbol, nextIndex]=parseElement(formula, i);
                    i=nextIndex;
                    let [count, numIndex]=parseNumber(formula, i);
                    i=numIndex;
                    let element=elements.find(el=>el.symbol==symbol);
                    if (element){
                        stack[stack.length-1]+=element.atomicMass*count;
                    }
                    else{
                        throw new Error("Element not found: "+symbol);
                    }
                }
                else if (formula[i]=="("){
                    stack.push(0);
                    i++;
                }
                else if (formula[i]==")"){
                    if (stack.length<2){
                        throw new Error("Unmatched \")\"");
                    }
                    let subgroupMass=stack.pop();
                    let [multiplier, numIndex]=parseNumber(formula, i+1);
                    i=numIndex;
                    stack[stack.length-1]+=subgroupMass*multiplier;
                }
                else{
                    throw new Error("Invalid character: "+formula[i]);
                }
            }
            if (stack.length>1){
                throw new Error("Unmatched \"(\"");
            }
            return stack[0];
        }
        function parseFormula(formula){
            let stack=[{}];
            let i=0;
            while (i<formula.length){
                if (/[A-Z]/.test(formula[i])){
                    let [symbol, nextIndex]=parseElement(formula, i);
                    i=nextIndex;
                    let [count, numIndex]=parseNumber(formula, i);
                    i=numIndex;
                    if (stack[stack.length-1][symbol]){
                        stack[stack.length-1][symbol]+=count;
                    }
                    else{
                        stack[stack.length-1][symbol]=count;
                    }
                }
                else if (formula[i]=="("){
                    stack.push({});
                    i++;
                }
                else if (formula[i]==")"){
                    if (stack.length<2){
                        throw new Error("Unmatched \")\"");
                    }
                    let subgroup=stack.pop();
                    let [multiplier, numIndex]=parseNumber(formula, i+1);
                    i=numIndex;
                    for (let element in subgroup){
                        if (stack[stack.length-1][element]){
                            stack[stack.length-1][element]+=subgroup[element]*multiplier;
                        }
                        else{
                            stack[stack.length-1][element]=subgroup[element]*multiplier;
                        }
                    }
                }
                else{
                    throw new Error("Invalid character: "+formula[i]);
                }
            }
            if (stack.length>1){
                throw new Error("Unmatched \"(\"");
            }
            return stack[0];
        }
        function parseEquation(equation){
            equation=equation.replace(/\s+/g,"");
            let parts=equation.split("->");
            if (parts.length!=2){
                throw new Error("Invalid equation format: missing \"->\"");
            }
            let reactants=parts[0].split("+");
            let products=parts[1].split("+");
            return {reactants, products};
        }
        function isBalanced(coeff, reactantsParsed, productsParsed, elements){
            let leftCounts={};
            let rightCounts={};
            for (let element of elements){
                leftCounts[element]=0;
                rightCounts[element]=0;
            }
            for (let i=0; i<reactantsParsed.length; i++){
                let compound=reactantsParsed[i];
                let c=coeff[i];
                for (let element in compound){
                    leftCounts[element]+=compound[element]*c;
                }
            }
            for (let i=0; i<productsParsed.length; i++){
                let compound=productsParsed[i];
                let c=coeff[reactantsParsed.length+i];
                for (let element in compound){
                    rightCounts[element]+=compound[element]*c;
                }
            }
            for (let element of elements){
                if (leftCounts[element]!=rightCounts[element]){
                    return false;
                }
            }
            return true;
        }
        function balanceEquation(equation){
            let {reactants, products}=parseEquation(equation);
            let allCompounds=[...reactants, ...products];
            let parsedCompounds=allCompounds.map(parseFormula);
            let elements=new Set();
            for (let compound of parsedCompounds){
                for (let element in compound){
                    elements.add(element);
                }
            }
            elements=Array.from(elements);
            let m=allCompounds.length;
            let maxCoeff=10;
            let coeff=new Array(m).fill(1);
            while (true){
                if (isBalanced(coeff, parsedCompounds.slice(0, reactants.length), parsedCompounds.slice(reactants.length), elements)){
                    let balancedEquation="";
                    for (let i=0; i<reactants.length; i++){
                        balancedEquation+=coeff[i]==1?"":coeff[i];
                        balancedEquation+=allCompounds[i]+" + ";
                    }
                    balancedEquation=balancedEquation.slice(0,-3);
                    balancedEquation+=" -> ";
                    for (let i=reactants.length; i<m; i++){
                        balancedEquation+=coeff[i]==1?"":coeff[i];
                        balancedEquation+=allCompounds[i]+" + ";
                    }
                    balancedEquation=balancedEquation.slice(0,-3);
                    return balancedEquation;
                }
                let i=m-1;
                while (i>=0&&coeff[i]==maxCoeff){
                    i--;
                }
                if (i<0){
                    throw new Error("No solution found within coefficient limit of "+maxCoeff);
                }
                coeff[i]++;
                for (let j=i+1; j<m; j++){
                    coeff[j]=1;
                }
            }
        }
        document.getElementById("lookup-button").addEventListener("click", function(){
            let input=document.getElementById("element-input").value.trim().toLowerCase();
            let element=elements.find(el=>
                el.symbol.toLowerCase()==input||el.name.toLowerCase()==input
            );
            if (element){
                let info=`<p><strong>Symbol:</strong> ${element.symbol}</p><p><strong>Name:</strong> ${element.name}</p><p><strong>Atomic Mass:</strong> ${element.atomicMass} u</p><p><strong>Atomic Number:</strong> ${element.atomicNumber}</p><p><strong>Electronegativity:</strong> ${element.electronegativity!==null?element.electronegativity:"N/A"}</p><p><strong>Electron Affinity:</strong> ${element.electronAffinity!==null?element.electronAffinity:"N/A"} kJ/mol</p><p><strong>Atomic Radius:</strong> ${element.atomicRadius!==null?element.atomicRadius:"N/A"} pm</p><p><strong>Ionization Energy:</strong> ${element.ionizationEnergy!==null?element.ionizationEnergy:"N/A"} kJ/mol</p><p><strong>Valence Electrons:</strong> ${element.valenceElectrons}</p><p><strong>Total Electrons:</strong> ${element.totalElectrons}</p><p><strong>Group:</strong> ${element.group}</p><p><strong>Period:</strong> ${element.period}</p><p><strong>Type:</strong> ${element.type}</p>`;
                document.getElementById("element-info").innerHTML=info;
            }
            else{
                document.getElementById("element-info").innerHTML="<p>Element not found</p>";
            }
        });
        document.getElementById("calculate-mass-button").addEventListener("click", function(){
            let formula=document.getElementById("formula-input").value.trim();
            if (formula==""){
                document.getElementById("mass-result").innerHTML="<p>Please enter a chemical formula</p>";
                return;
            }
            try{
                let totalMass=calculateMolarMass(formula, elements);
                document.getElementById("mass-result").innerHTML=`<p>Molar Mass: ${totalMass.toFixed(2)} g/mol</p>`;
            }
            catch (error){
                document.getElementById("mass-result").innerHTML=`<p>${error.message}</p>`;
            }
        });
        document.getElementById("balance-button").addEventListener("click", function(){
            let equation=document.getElementById("equation-input").value.trim();
            if (equation==""){
                document.getElementById("balance-result").innerHTML="<p>Please enter a chemical equation</p>";
                return;
            }
            try{
                let balancedEquation=balanceEquation(equation);
                document.getElementById("balance-result").innerHTML=`<p>Balanced Equation: ${balancedEquation}</p>`;
            }
            catch (error){
                document.getElementById("balance-result").innerHTML=`<p>${error.message}</p>`;
            }
        });
    })
    .catch(err=>{
        console.error("Error fetching data:", err);
        document.getElementById("element-info").innerHTML="<p>Error loading element data table</p>";
    });
});