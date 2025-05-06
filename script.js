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
        let R=8.314;
        let F=96485;
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
        function formatFormula(formula){
            let compound={};
            let regex=/([A-Z][a-z]*)(\d*)/g;
            let match;
            let lastIndex=0;
            while ((match=regex.exec(formula))!==null){
                let element=match[1];
                let subscript=match[2]?parseInt(match[2]):1;
                if (compound[element]){
                    throw new Error(`Oops, ${element} shows up twice in ${formula}`);
                }
                compound[element]=subscript;
                lastIndex=regex.lastIndex;
            }
            if (lastIndex!==formula.length){
                throw new Error(`Bad formula: ${formula}`);
            }
            return compound;
        }
        function parseEquation(equation){
            let sides=equation.split("->").map(side=>side.trim());
            if (sides.length!==2){
                throw new Error("Equation format is off, use \"->\" between sides");
            }
            let reactants=sides[0].split("+").map(r=>r.trim());
            let products=sides[1].split("+").map(p=>p.trim());
            return { reactants, products };
        }
        function isEquationBalanced(coefficients, reactantCompounds, productCompounds, elements){
            let reactantAtoms={};
            let productAtoms={};
            for (let element of elements){
                reactantAtoms[element]=0;
                productAtoms[element]=0;
            }
            for (let i=0;i<reactantCompounds.length;i++){
                let compound=reactantCompounds[i];
                let coeff=coefficients[i];
                for (let element in compound){
                    reactantAtoms[element]+=coeff*compound[element];
                }
            }
            for (let i=0;i<productCompounds.length;i++){
                let compound=productCompounds[i];
                let coeff=coefficients[reactantCompounds.length+i];
                for (let element in compound){
                    productAtoms[element]+=coeff*compound[element];
                }
            }
            for (let element of elements){
                if (reactantAtoms[element]!==productAtoms[element]){
                    return false;
                }
            }
            return true;
        }
        function balanceEquation(equation){
            let maxCoefficient=1250;
            document.getElementById("balance-result").innerHTML="Balancing...";
            let{ reactants, products }=parseEquation(equation);
            let allCompounds=[...reactants, ...products];
            let parsedCompounds=allCompounds.map(formatFormula);
            let elements=Array.from(
                parsedCompounds.reduce((set, comp)=>{
                    Object.keys(comp).forEach(el=>set.add(el));
                    return set;
                }, new Set())
            );
            function gcd(a, b){ return b?gcd(b, a%b):a;}
            function lcm(a, b){ return a/gcd(a, b)*b;}
            class Fraction{
                constructor(n, d){ this.n=n;this.d=d;this.normalize();}
                normalize(){
                    if (this.d<0){ this.n=-this.n;this.d=-this.d;}
                    let g=gcd(Math.abs(this.n), Math.abs(this.d));
                    this.n/=g;this.d/=g;
                }
                add(f){ return new Fraction(this.n*f.d+f.n*this.d, this.d*f.d);}
                sub(f){ return new Fraction(this.n*f.d-f.n*this.d, this.d*f.d);}
                mul(f){ return new Fraction(this.n*f.n, this.d*f.d);}
                div(f){ return new Fraction(this.n*f.d, this.d*f.n);}
            }
            let m=allCompounds.length;
            let n=elements.length;
            let M=elements.map(el=>parsedCompounds.map((comp, j)=>(j<reactants.length?1:-1)*(comp[el]||0)));
            let vars=m-1;
            let eqs=n;
            let A=Array.from({ length: eqs }, (_, i)=>{
                let row=[];
                for (let j=0;j<vars;j++){
                    row.push(new Fraction(M[i][j], 1));
                }
                row.push(new Fraction(-M[i][m-1], 1));
                return row;
            });
            let r=0;
            for (let c=0;c<vars&&r<eqs;c++){
                let pivot=r;
                while (pivot<eqs&&A[pivot][c].n==0) pivot++;
                if (pivot==eqs) continue;
                [A[r], A[pivot]]=[A[pivot], A[r]];
                let inv=new Fraction(A[r][c].d, A[r][c].n);
                for (let j=c;j<=vars;j++){
                    A[r][j]=A[r][j].mul(inv);
                }
                for (let i=0;i<eqs;i++){
                    if (i!==r&&A[i][c].n!==0){
                        let factor=A[i][c];
                        for (let j=c;j<=vars;j++){
                            A[i][j]=A[i][j].sub(factor.mul(A[r][j]));
                        }
                    }
                }
                r++;
            }
            let sol=Array(m);
            for (let j=0;j<vars;j++){
                let val=new Fraction(0, 1);
                for (let i=0;i<eqs;i++){
                    if (A[i][j].n==1&&A[i][j].d==1){
                        val=A[i][vars];
                        break;
                    }
                }
                sol[j]=val;
            }
            sol[m-1]=new Fraction(1, 1);
            let dens=sol.map(f=>f.d);
            let commonDen=dens.reduce((a, b)=>lcm(a, b), 1);
            let coeffs=sol.map(f=>f.n*(commonDen/f.d));
            coeffs=coeffs.map(c=>Math.round(c));
            if (coeffs.some(c=>c<0)){
                coeffs=coeffs.map(c=>-c);
            }
            let gAll=coeffs.reduce((a, b)=>gcd(a, b), coeffs[0]);
            coeffs=coeffs.map(c=>c/gAll);
            if (coeffs.some(c=>Math.abs(c) > maxCoefficient)){
                throw new Error(`No solution found with coefficients up to ${maxCoefficient}`);
            }
            let left=reactants.map((cmp, i)=>(coeffs[i]==1?"":coeffs[i])+cmp).join(" + ");
            let right=products.map((cmp, i)=>(coeffs[i+reactants.length]==1?"":coeffs[i+reactants.length])+cmp).join(" + ");
            return `${left} -> ${right}`;
        }
        function lookUpElement(){
            let input=document.getElementById("element-input").value.trim().toLowerCase();
            let element=elements.find(el=>el.symbol.toLowerCase()==input||el.name.toLowerCase()==input);
            if (element){
                let info=`<p><strong>Symbol:</strong> ${element.symbol}</p><p><strong>Name:</strong> ${element.name}</p><p><strong>Atomic Mass:</strong> ${element.atomicMass} u</p><p><strong>Atomic Number:</strong> ${element.atomicNumber}</p><p><strong>Electronegativity:</strong> ${element.electronegativity!==null?element.electronegativity:"N/A"}</p><p><strong>Electron Affinity:</strong> ${element.electronAffinity!==null?element.electronAffinity:"N/A"} kJ/mol</p><p><strong>Atomic Radius:</strong> ${element.atomicRadius!==null?element.atomicRadius:"N/A"} pm</p><p><strong>Ionization Energy:</strong> ${element.ionizationEnergy!==null?element.ionizationEnergy:"N/A"} kJ/mol</p><p><strong>Valence Electrons:</strong> ${element.valenceElectrons}</p><p><strong>Total Electrons:</strong> ${element.totalElectrons}</p><p><strong>Group:</strong> ${element.group}</p><p><strong>Period:</strong> ${element.period}</p><p><strong>Type:</strong> ${element.type}</p>`;
                document.getElementById("element-info").innerHTML=info;
            }
            else{
                document.getElementById("element-info").innerHTML="<p>Element not found</p>";
            }
        }
        function calculateMass(){
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
        }
        function balanceEquations(){
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
        }
        function parseBalancedEquation(equation){
            equation=equation.replace(/\s+/g, "");
            let parts=equation.split("->");
            if (parts.length!==2){
                throw new Error("Invalid equation format: missing \"->\"");
            }
            let reactants=parts[0].split("+").map(parseTerm);
            let products=parts[1].split("+").map(parseTerm);
            return {reactants, products};
        }
        function parseTerm(term){
            let match=term.match(/^(\d+)?(.+)$/);
            if (!match){
                throw new Error("Invalid term: "+term);
            }
            let coefficient=match[1]?parseInt(match[1]):1;
            let formula=match[2];
            return {formula, coefficient};
        }
        function getCalculationType(){
            let type=this.value;
            let equation=document.getElementById("stoich-equation-input").value.trim();
            if (equation==""){
                document.getElementById("stoich-inputs").innerHTML="<p>Please enter a balanced chemical equation.</p>";
                return;
            }
            try{
                let parsed=parseBalancedEquation(equation);
                let inputsDiv=document.getElementById("stoich-inputs");
                inputsDiv.innerHTML="";
                if (type=="product-from-reactant"){
                    let reactantSelect=`<select id="reactant-select">${parsed.reactants.map(r=>`<option value="${r.formula}">${r.formula}</option>`).join("")}</select>`;
                    let molesInput=`<input type="number" id="reactant-moles" placeholder="Moles of reactant" min="0" step="any">`;
                    let productSelect=`<select id="product-select">${parsed.products.map(p=>`<option value="${p.formula}">${p.formula}</option>`).join("")}</select>`;
                    inputsDiv.innerHTML=`<p>Select reactant: ${reactantSelect}</p><p>Enter moles: ${molesInput}</p><p>Select product: ${productSelect}</p>`;
                }
                else if (type=="reactant-from-product"){
                    let productSelect=`<select id="product-select">${parsed.products.map(p=>`<option value="${p.formula}">${p.formula}</option>`).join("")}</select>`;
                    let molesInput=`<input type="number" id="product-moles" placeholder="Moles of product" min="0" step="any">`;
                    let reactantSelect=`<select id="reactant-select">${parsed.reactants.map(r=>`<option value="${r.formula}">${r.formula}</option>`).join("")}</select>`;
                    inputsDiv.innerHTML=`<p>Select product: ${productSelect}</p><p>Enter moles: ${molesInput}</p><p>Select reactant: ${reactantSelect}</p>`;
                }
                else if (type=="limiting-reactant"){
                    let reactantInputs=parsed.reactants.map(r=>`<p>${r.formula}: <input type="number" id="moles-${r.formula}" placeholder="Moles of ${r.formula}" min="0" step="any"></p>`).join("");
                    let productSelect=`<select id="product-select">${parsed.products.map(p=>`<option value="${p.formula}">${p.formula}</option>`).join("")}</select>`;
                    inputsDiv.innerHTML=reactantInputs+`<p>Select product to calculate: ${productSelect}</p>`;
                }
            }
            catch (error){
                document.getElementById("stoich-inputs").innerHTML=`<p>Error parsing equation: ${error.message}</p>`;
            }
        }
        function calculateStoichiometry(){
            let type=document.getElementById("calculation-type").value;
            let equation=document.getElementById("stoich-equation-input").value.trim();
            if (equation==""){
                document.getElementById("stoich-result").innerHTML="<p>Please enter a balanced chemical equation.</p>";
                return;
            }
            try{
                let parsed=parseBalancedEquation(equation);
                if (type=="product-from-reactant"){
                    let reactantFormula=document.getElementById("reactant-select").value;
                    let molesReactant=parseFloat(document.getElementById("reactant-moles").value);
                    let productFormula=document.getElementById("product-select").value;
                    if (isNaN(molesReactant)||molesReactant<=0){
                        throw new Error("Invalid moles input");
                    }
                    let reactant=parsed.reactants.find(r=>r.formula==reactantFormula);
                    let product=parsed.products.find(p=>p.formula==productFormula);
                    if (!reactant||!product){
                        throw new Error("Selected compound not found");
                    }
                    let molesProduct=(molesReactant/reactant.coefficient)*product.coefficient;
                    document.getElementById("stoich-result").innerHTML=`<p>Moles of ${productFormula}: ${molesProduct.toFixed(2)}</p>`;
                }
                else if (type=="reactant-from-product"){
                    let productFormula=document.getElementById("product-select").value;
                    let molesProduct=parseFloat(document.getElementById("product-moles").value);
                    let reactantFormula=document.getElementById("reactant-select").value;
                    if (isNaN(molesProduct)||molesProduct<=0){
                        throw new Error("Invalid moles input");
                    }
                    let product=parsed.products.find(p=>p.formula==productFormula);
                    let reactant=parsed.reactants.find(r=>r.formula==reactantFormula);
                    if (!product||!reactant){
                        throw new Error("Selected compound not found");
                    }
                    let molesReactant=(molesProduct/product.coefficient)*reactant.coefficient;
                    document.getElementById("stoich-result").innerHTML=`<p>Moles of ${reactantFormula}: ${molesReactant.toFixed(2)}</p>`;
                }
                else if (type=="limiting-reactant"){
                    let reactantMoles={};
                    for (let r of parsed.reactants){
                        let moles=parseFloat(document.getElementById(`moles-${r.formula}`).value);
                        if (isNaN(moles)||moles<=0){
                            throw new Error(`Invalid moles for ${r.formula}`);
                        }
                        reactantMoles[r.formula]=moles;
                    }
                    let productFormula=document.getElementById("product-select").value;
                    let product=parsed.products.find(p=>p.formula==productFormula);
                    if (!product){
                        throw new Error("Selected product not found");
                    }
                    let minRatio=Infinity;
                    let limitingReactant=null;
                    for (let r of parsed.reactants){
                        let ratio=reactantMoles[r.formula]/r.coefficient;
                        if (ratio<minRatio){
                            minRatio=ratio;
                            limitingReactant=r.formula;
                        }
                    }
                    let molesProduct=minRatio*product.coefficient;
                    document.getElementById("stoich-result").innerHTML=`<p>Limiting reactant: ${limitingReactant}</p><p>Moles of ${productFormula}: ${molesProduct.toFixed(2)}</p>`;
                }
            }
            catch (error){
                document.getElementById("stoich-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateDilution(){
            try{
                let solveFor=document.getElementById("dilution-solve-for").value;
                let M1=parseFloat(document.getElementById("dilution-M1").value);
                let V1=parseFloat(document.getElementById("dilution-V1").value);
                let M2=parseFloat(document.getElementById("dilution-M2").value);
                let V2=parseFloat(document.getElementById("dilution-V2").value);
                let result, formula;
                switch(solveFor){
                    case "M1":
                        validateInputs([V1, M2, V2]);
                        result=(M2*V2)/V1;
                        formula="M<sub>1</sub>=(M<sub>2</sub> x V<sub>2</sub>)/V<sub>1</sub>";
                        break;
                    case "V1":
                        validateInputs([M1, M2, V2]);
                        result=(M2*V2)/M1;
                        formula="V<sub>1</sub>=(M<sub>2</sub> x V<sub>2</sub>)/M<sub>1</sub>";
                        break;
                    case "M2":
                        validateInputs([M1, V1, V2]);
                        result=(M1*V1)/V2;
                        formula="M<sub>2</sub>=(M<sub>1</sub> x V<sub>1</sub>)/V<sub>2</sub>";
                        break;
                    case "V2":
                        validateInputs([M1, V1, M2]);
                        result=(M1*V1)/M2;
                        formula="V<sub>2</sub>=(M<sub>1</sub> x V<sub>1</sub>)/M<sub>2</sub>";
                        break;
                    default:
                        throw new Error("Invalid calculation type");
                }
                document.getElementById("dilution-result").innerHTML=`<p>${formula}</p><p>Result: ${result.toFixed(4)} ${solveFor.startsWith("M")?"M":"L"}</p>`;
            }
            catch (error){
                document.getElementById("dilution-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateMassPercent(){
            try{
                let solute=parseFloat(document.getElementById("mass-solute").value);
                let solution=parseFloat(document.getElementById("mass-solution").value);
                let unit=document.getElementById("concentration-unit").value;
                validateInputs([solute, solution]);
                if (solution==0) throw new Error("Solution mass cannot be zero");
                let ratio=solute/solution;
                let result, unitText;
                switch(unit){
                    case "percent":
                        result=ratio*100;
                        unitText="%";
                        break;
                    case "ppm":
                        result=ratio*1e6;
                        unitText="ppm";
                        break;
                    case "ppb":
                        result=ratio*1e9;
                        unitText="ppb";
                        break;
                    default:
                        throw new Error("Invalid unit");
                }
                document.getElementById("mass-percent-result").innerHTML=`<p>Concentration: ${result.toFixed(4)} ${unitText}</p>`;
            }
            catch (error){
                document.getElementById("mass-percent-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateMixing(){
            try{
                let C1=parseFloat(document.getElementById("mix-C1").value);
                let V1=parseFloat(document.getElementById("mix-V1").value);
                let C2=parseFloat(document.getElementById("mix-C2").value);
                let V2=parseFloat(document.getElementById("mix-V2").value);
                validateInputs([C1, V1, C2, V2]);
                if (V1+V2==0) throw new Error("Total volume cannot be zero");
                let totalMoles=(C1*V1)+(C2*V2);
                let totalVolume=V1+V2;
                let C_final=totalMoles/totalVolume;
                document.getElementById("mixing-result").innerHTML=`<p>Final Concentration: ${C_final.toFixed(4)} M</p><p>Total Volume: ${totalVolume.toFixed(4)} L</p>`;
            }
            catch (error){
                document.getElementById("mixing-result").innerHTML=
                    `<p>Error: ${error.message}</p>`;
            }
        }
        function validateInputs(inputs){
            if (inputs.some(isNaN)){
                throw new Error("Please fill all required fields with valid numbers");
            }
        }
        function calculateIdealGasLaw(){
            try{
                let solveFor=document.getElementById("ideal-solve-for").value;
                let units=document.getElementById("ideal-R-units").value;
                let R=units=="atm-L"?0.0821: 8.314;
                let P=parseFloat(document.getElementById("ideal-P").value);
                let V=parseFloat(document.getElementById("ideal-V").value);
                let n=parseFloat(document.getElementById("ideal-n").value);
                let T=parseFloat(document.getElementById("ideal-T").value);
                let result, formula;
                if (solveFor=="P"){
                    if (isNaN(V)||isNaN(n)||isNaN(T)) throw new Error("Please provide V, n, T");
                    result=(n*R*T)/V;
                    formula="P=(nRT)/V";
                }
                else if (solveFor=="V"){
                    if (isNaN(P)||isNaN(n)||isNaN(T)) throw new Error("Please provide P, n, T");
                    result=(n*R*T)/P;
                    formula="V=(nRT)/P";
                }
                else if (solveFor=="n"){
                    if (isNaN(P)||isNaN(V)||isNaN(T)) throw new Error("Please provide P, V, T");
                    result=(P*V)/(R*T);
                    formula="n=(PV)/(RT)";
                }
                else if (solveFor=="T"){
                    if (isNaN(P)||isNaN(V)||isNaN(n)) throw new Error("Please provide P, V, n");
                    result=(P*V)/(n*R);
                    formula="T=(PV)/(nR)";
                }
                let unit=solveFor=="P"?(units=="atm-L"?"atm": "Pa"):solveFor=="V"?(units=="atm-L"?"L": "m³"):solveFor=="n"?"mol": "K";
                document.getElementById("ideal-result").innerHTML=`<p>${formula}</p><p>Result: ${result.toFixed(4)} ${unit}</p>`;
            }
            catch (error){
                document.getElementById("ideal-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateCombinedGasLaw(){
            try{
                let solveFor=document.getElementById("combined-solve-for").value;
                let P1=parseFloat(document.getElementById("combined-P1").value);
                let V1=parseFloat(document.getElementById("combined-V1").value);
                let T1=parseFloat(document.getElementById("combined-T1").value);
                let P2=parseFloat(document.getElementById("combined-P2").value);
                let V2=parseFloat(document.getElementById("combined-V2").value);
                let T2=parseFloat(document.getElementById("combined-T2").value);
                let result, formula;
                if (solveFor=="P1"){
                    if (isNaN(V1)||isNaN(T1)||isNaN(P2)||isNaN(V2)||isNaN(T2)) throw new Error("Please provide V<sub>1</sub>, T<sub>1</sub>, P<sub>2</sub>, V<sub>2</sub>, T<sub>2</sub>");
                    result=(P2*V2*T1)/(V1*T2);
                    formula="P<sub>1</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(V<sub>1</sub> T<sub>2</sub>)";
                }
                else if (solveFor=="V1"){
                    if (isNaN(P1)||isNaN(T1)||isNaN(P2)||isNaN(V2)||isNaN(T2)) throw new Error("Please provide P<sub>1</sub>, T<sub>1</sub>, P<sub>2</sub>, V<sub>2</sub>, T<sub>2</sub>");
                    result=(P2*V2*T1)/(P1*T2);
                    formula="V<sub>1</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(P<sub>1</sub> T<sub>2</sub>)";
                }
                else if (solveFor=="T1"){
                    if (isNaN(P1)||isNaN(V1)||isNaN(P2)||isNaN(V2)||isNaN(T2)) throw new Error("Please provide P<sub>1</sub>, V<sub>1</sub>, P<sub>2</sub>, V<sub>2</sub>, T<sub>2</sub>");
                    result=(P1*V1*T2)/(P2*V2);
                    formula="T<sub>1</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(P<sub>2</sub> V<sub>2</sub>)";
                }
                else if (solveFor=="P2"){
                    if (isNaN(P1)||isNaN(V1)||isNaN(T1)||isNaN(V2)||isNaN(T2)) throw new Error("Please provide P<sub>1</sub>, V<sub>1</sub>, T<sub>1</sub>, V<sub>2</sub>, T<sub>2</sub>");
                    result=(P1*V1*T2)/(V2*T1);
                    formula="P<sub>2</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(V<sub>2</sub> T<sub>1</sub>)";
                }
                else if (solveFor=="V2"){
                    if (isNaN(P1)||isNaN(V1)||isNaN(T1)||isNaN(P2)||isNaN(T2)) throw new Error("Please provide P<sub>1</sub>, V<sub>1</sub>, T<sub>1</sub>, P<sub>2</sub>, T<sub>2</sub>");
                    result=(P1*V1*T2)/(P2*T1);
                    formula="V<sub>2</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(P<sub>2</sub> T<sub>1</sub>)";
                }
                else if (solveFor=="T2"){
                    if (isNaN(P1)||isNaN(V1)||isNaN(T1)||isNaN(P2)||isNaN(V2)) throw new Error("Please provide P<sub>1</sub>, V<sub>1</sub>, T<sub>1</sub>, P<sub>2</sub>, V<sub>2</sub>");
                    result=(P2*V2*T1)/(P1*V1);
                    formula="T<sub>2</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(P<sub>1</sub> V<sub>1</sub>)";
                }
                let unit=solveFor.includes("P")?"pressure units":
                           solveFor.includes("V")?"volume units":
                           solveFor.includes("T")?"K": "";
                document.getElementById("combined-result").innerHTML=`<p>${formula}</p><p>Result: ${result.toFixed(4)} ${unit}</p>`;
            }
            catch (error){
                document.getElementById("combined-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateVanDerWaals(){
            try{
                let V=parseFloat(document.getElementById("vdw-V").value);
                let n=parseFloat(document.getElementById("vdw-n").value);
                let T=parseFloat(document.getElementById("vdw-T").value);
                let a=parseFloat(document.getElementById("vdw-a").value);
                let b=parseFloat(document.getElementById("vdw-b").value);
                if (isNaN(V)||isNaN(n)||isNaN(T)||isNaN(a)||isNaN(b)) throw new Error("Please provide all inputs");
                let R=0.0821;
                let P=(n*R*T)/(V-n*b)-a*(n/V)**2;
                document.getElementById("vdw-result").innerHTML=`<p>P=${P.toFixed(4)} atm</p>`;
            }
            catch (error){
                document.getElementById("vdw-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateHalfLife(){
            try{
                let solveFor=document.getElementById("half-life-solve-for").value;
                let N0=parseFloat(document.getElementById("initial-quantity").value);
                let t=parseFloat(document.getElementById("time-input").value);
                let t_half=parseFloat(document.getElementById("half-life-input").value);
                let Nt=parseFloat(document.getElementById("remaining-quantity").value);
                let result;
                switch (solveFor){
                    case "remaining":
                        if (isNaN(N0)||isNaN(t)||isNaN(t_half)) throw new Error("Missing inputs for initial quantity, time, or half-life");
                        result=N0*Math.pow(0.5, t/t_half);
                        document.getElementById("half-life-result").innerHTML=`<p>Remaining: ${result.toFixed(4)} (after ${t} units)</p>`;
                        break;
                    case "time":
                        if (isNaN(N0)||isNaN(t_half)||isNaN(Nt)) throw new Error("Missing inputs for initial quantity, half-life, or remaining quantity");
                        result=(Math.log(Nt/N0)/Math.log(0.5))*t_half;
                        document.getElementById("half-life-result").innerHTML=`<p>Time needed: ${result.toFixed(4)} units</p>`;
                        break;
                    case "half-life":
                        if (isNaN(N0)||isNaN(t)||isNaN(Nt)) throw new Error("Missing inputs for initial quantity, time, or remaining quantity");
                        result=t/(Math.log(Nt/N0)/Math.log(0.5));
                        document.getElementById("half-life-result").innerHTML=`<p>Half-life: ${result.toFixed(4)} units</p>`;
                        break;
                }
            }
            catch (error){
                document.getElementById("half-life-result").innerHTML=`<p>Error: ${error.message}</p>`;
            }
        }
        function calculateCellPotential(){
            let E1=parseFloat(document.getElementById("E1").value);
            let E2=parseFloat(document.getElementById("E2").value);
            if (isNaN(E1)||isNaN(E2)){
                document.getElementById("cell-potential-result").innerHTML="<p>Please enter valid numbers for both potentials.</p>";
                return;
            }
            let E_cathode=Math.max(E1, E2);
            let E_anode=Math.min(E1, E2);
            let E_cell=E_cathode-E_anode;
            let result=`<p>The half-reaction with E°=${E_cathode} V is the cathode, and the one with E°=${E_anode} V is the anode.</p><p>The standard cell potential E°_cell=${E_cell.toFixed(3)} V</p>`;
            document.getElementById("cell-potential-result").innerHTML=result;
        }
        function calculateNernst(){
            let E_standard=parseFloat(document.getElementById("E-standard").value);
            let T=parseFloat(document.getElementById("temperature").value);
            let n=parseFloat(document.getElementById("n-electrons").value);
            let Q=parseFloat(document.getElementById("Q-reaction").value);
            if (isNaN(E_standard)||isNaN(T)||isNaN(n)||isNaN(Q)||T<=0||n<=0||Q<=0){
                document.getElementById("nernst-result").innerHTML="<p>Please enter valid positive numbers for all fields.</p>";
                return;
            }
            let E=E_standard-(R*T/(n*F))*Math.log(Q);
            document.getElementById("nernst-result").innerHTML=`<p>The cell potential E=${E.toFixed(3)} V</p>`;
        }
        function calculateElectrolysis(){
            let solveFor=document.getElementById("electrolysis-solve-for").value;
            let m=parseFloat(document.getElementById("electrolysis-m").value);
            let I=parseFloat(document.getElementById("electrolysis-I").value);
            let t=parseFloat(document.getElementById("electrolysis-t").value);
            let z=parseFloat(document.getElementById("electrolysis-z").value);
            let M=parseFloat(document.getElementById("electrolysis-M").value);
            if (solveFor=="mass"&&(isNaN(I)||isNaN(t)||isNaN(z)||isNaN(M)||I<=0||t<=0||z<=0||M<=0)){
                document.getElementById("electrolysis-result").innerHTML="<p>Please enter valid positive numbers for I, t, z, and M.</p>";
                return;
            }
            else if (solveFor=="current"&&(isNaN(m)||isNaN(t)||isNaN(z)||isNaN(M)||m<=0||t<=0||z<=0||M<=0)){
                document.getElementById("electrolysis-result").innerHTML="<p>Please enter valid positive numbers for m, t, z, and M.</p>";
                return;
            }
            else if (solveFor=="time"&&(isNaN(m)||isNaN(I)||isNaN(z)||isNaN(M)||m<=0||I<=0||z<=0||M<=0)){
                document.getElementById("electrolysis-result").innerHTML="<p>Please enter valid positive numbers for m, I, z, and M.</p>";
                return;
            }
            if (solveFor=="mass"){
                let n=(I*t)/(F*z);
                let mass=n*M;
                document.getElementById("electrolysis-result").innerHTML=`<p>The mass deposited m=${mass.toFixed(3)} g</p>`;
            }
            else if (solveFor=="current"){
                let n=m/M;
                let current=(n*F*z)/t;
                document.getElementById("electrolysis-result").innerHTML=`<p>The current I=${current.toFixed(3)} A</p>`;
            }
            else if (solveFor=="time"){
                let n=m/M;
                let time=(n*F*z)/I;
                document.getElementById("electrolysis-result").innerHTML=`<p>The time t=${time.toFixed(3)} s</p>`;
            }
        }
        document.getElementById("element-input").addEventListener("keyup", lookUpElement);
        document.getElementById("formula-input").addEventListener("keyup", calculateMass);
        document.getElementById("balance-button").addEventListener("click", balanceEquations);
        document.getElementById("calculation-type").addEventListener("change", getCalculationType);
        document.getElementById("calculate-stoich-button").addEventListener("click", calculateStoichiometry);
        document.getElementById("calculate-dilution").addEventListener("click", calculateDilution);
        document.getElementById("calculate-mass-percent").addEventListener("click", calculateMassPercent);
        document.getElementById("calculate-mixing").addEventListener("click", calculateMixing);
        document.getElementById("calculate-ideal").addEventListener("click", calculateIdealGasLaw);
        document.getElementById("calculate-combined").addEventListener("click", calculateCombinedGasLaw);
        document.getElementById("calculate-vdw").addEventListener("click", calculateVanDerWaals);
        document.getElementById("ideal-R-units").addEventListener("change", function(){
            let units=this.value;
            if (units=="atm-L"){
                document.getElementById("ideal-P").placeholder="P (atm)";
                document.getElementById("ideal-V").placeholder="V (L)";
            }
            else if (units=="SI"){
                document.getElementById("ideal-P").placeholder="P (Pa)";
                document.getElementById("ideal-V").placeholder="V (m³)";
            }
        });
        document.getElementById("calculate-half-life").addEventListener("click", calculateHalfLife);
        document.getElementById("half-life-solve-for").addEventListener("change", function(){
            let solveFor=this.value;
            let remainingQuantityGroup=document.getElementById("remaining-quantity-group");
            remainingQuantityGroup.style.display=(solveFor=="time"||solveFor=="half-life")?"block":"none";
        });
        document.getElementById("calculate-cell-potential").addEventListener("click", calculateCellPotential);
        document.getElementById("calculate-nernst").addEventListener("click", calculateNernst);
        document.getElementById("calculate-electrolysis").addEventListener("click", calculateElectrolysis);
    })
    .catch(err=>{
        console.error("Error fetching data:", err);
        document.getElementById("element-info").innerHTML="<p>Error loading element data table</p>";
    });
});