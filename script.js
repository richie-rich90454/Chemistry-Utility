//Use: "terser script.js -o script.min.js --compress --mangle" to compress the file (make the min file)
document.addEventListener("DOMContentLoaded", function(){
    let headers=document.querySelectorAll(".main-groups h2");
    for (let i=0;i<headers.length;i++){
        headers[i].addEventListener("click", function(){
            let section=this.closest(".main-groups");
            let hasCollapsedClass=section.classList.contains("collapsed");
            if (hasCollapsedClass){
                section.classList.remove("collapsed");
                let children=section.querySelectorAll("*:not(h2)");
                for (let j=0;j<children.length;j++){
                    slideDown(children[j], 300);
                }
            }
            else{
                section.classList.add("collapsed");
                let children=section.querySelectorAll("*:not(h2)");
                for (let j=0;j<children.length;j++){
                    slideUp(children[j], 300);
                }
            }
        });
    }
    function slideDown(element, duration){
        element.style.display="block";
        element.style.height="0";
        element.style.overflow="hidden";
        let height=element.scrollHeight;
        element.style.transition="height "+duration+"ms";
        requestAnimationFrame(function(){
            element.style.height=height+"px";
            setTimeout(function(){
                element.style.height="";
                element.style.overflow="";
                element.style.transition="";
            }, duration);
        });
    }
    function slideUp(element, duration){
        element.style.height=element.scrollHeight+"px";
        element.style.overflow="hidden";
        element.style.transition="height "+duration+"ms";
        requestAnimationFrame(function(){
            element.style.height="0";
            setTimeout(function(){
                element.style.display="none";
                element.style.height="";
                element.style.overflow="";
                element.style.transition="";
            }, duration);
        });
    }

    let inputs=document.querySelectorAll("input, select");
    for (let i=0;i<inputs.length;i++){
        inputs[i].addEventListener("focus", function(){
            this.style.borderColor="var(--primary-blue)";
            this.style.boxShadow="0 0 5px rgba(28, 148, 233, .5)";
        });
        inputs[i].addEventListener("blur", function(){
            let hasErrorClass=this.classList.contains("error");
            if (!hasErrorClass){
                this.style.borderColor="#DDD";
                this.style.boxShadow="none";
            }
        });
    }

    let buttons=document.querySelectorAll("button:not(.clear-button)");
    for (let i=0;i<buttons.length;i++){
        buttons[i].addEventListener("mouseenter", function(){
            this.style.backgroundColor="var(--dark-blue)";
            this.style.transform="translateY(-2px)";
            this.style.boxShadow="0 4px 8px var(--shadow-color)";
        });
        buttons[i].addEventListener("mouseleave", function(){
            this.style.backgroundColor="var(--primary-blue)";
            this.style.transform="translateY(0)";
            this.style.boxShadow="0 2px 4px var(--shadow-color)";
        });
    }

    let clearButtons=document.querySelectorAll(".clear-button");
    for (let i=0;i<clearButtons.length;i++){
        clearButtons[i].addEventListener("click", function(){
            let sectionId=this.dataset.section;
            let section=document.getElementById(sectionId);
            let inputs=section.querySelectorAll("input");
            for (let j=0;j<inputs.length;j++){
                inputs[j].value="";
                inputs[j].classList.remove("error");
            }
            let selects=section.querySelectorAll("select");
            for (let j=0;j<selects.length;j++){
                selects[j].selectedIndex=0;
            }
            let result=section.querySelector(".result");
            if (result){
                result.innerHTML="";
                result.classList.remove("show");
            }
        });
    }

    fetch("/api/ptable",{
        headers:{
            "X-Requested-With": "XMLHttpRequest"
        }
    })
    .then(function(response){
        let isResponseOk=response.ok;
        if (!isResponseOk){
            throw new Error("HTTP error! status: "+response.status);
        }
        return response.json();
    })
    .then(function(data){
        let gasConstant=8.314;
        let faradayConstant=96485;
        let elementsData=data;

        function parseElement(formula, index){
            let formulaLength=formula.length;
            let currentChar=formula[index];
            let isUpperCase=/[A-Z]/.test(currentChar);
            if (index<formulaLength&&isUpperCase){
                let symbol=currentChar;
                index=index+1;
                if (index<formulaLength){
                    let nextChar=formula[index];
                    let isLowerCase=/[a-z]/.test(nextChar);
                    if (isLowerCase){
                        symbol=symbol+nextChar;
                        index=index+1;
                    }
                }
                return [symbol, index];
            }
            else{
                throw new Error("Invalid element at position "+index);
            }
        }

        function parseNumber(formula, index){
            let number=0;
            let formulaLength=formula.length;
            while (index<formulaLength){
                let currentChar=formula[index];
                let isDigit=/[0-9]/.test(currentChar);
                if (!isDigit){
                    break;
                }
                number=number*10+parseInt(currentChar);
                index=index+1;
            }
            let finalNumber=number>0?number:1;
            return [finalNumber, index];
        }

        function calculateMolarMass(formula, elements){
            let massStack=[0];
            let index=0;
            let formulaLength=formula.length;
            while (index<formulaLength){
                let currentChar=formula[index];
                let isUpperCase=/[A-Z]/.test(currentChar);
                if (isUpperCase){
                    let elementResult=parseElement(formula, index);
                    let symbol=elementResult[0];
                    index=elementResult[1];
                    let numberResult=parseNumber(formula, index);
                    let count=numberResult[0];
                    index=numberResult[1];
                    let element=null;
                    for (let i=0;i<elements.length;i++){
                        if (elements[i].symbol==symbol){
                            element=elements[i];
                            break;
                        }
                    }
                    if (element!==null){
                        let stackTopIndex=massStack.length-1;
                        massStack[stackTopIndex]=massStack[stackTopIndex]+(element.atomicMass*count);
                    }
                    else{
                        throw new Error("Element not found: "+symbol);
                    }
                }
                else if (currentChar=="("){
                    massStack.push(0);
                    index=index+1;
                }
                else if (currentChar==")"){
                    let stackLength=massStack.length;
                    if (stackLength<2){
                        throw new Error("Unmatched \")\"");
                    }
                    let subgroupMass=massStack.pop();
                    let numberResult=parseNumber(formula, index+1);
                    let multiplier=numberResult[0];
                    index=numberResult[1];
                    let stackTopIndex=massStack.length-1;
                    massStack[stackTopIndex]=massStack[stackTopIndex]+(subgroupMass*multiplier);
                }
                else{
                    throw new Error("Invalid character: "+currentChar);
                }
            }
            let stackLength=massStack.length;
            if (stackLength>1){
                throw new Error("Unmatched \"(\"");
            }
            return massStack[0];
        }

        function formatFormula(formula){
            let compound ={};
            let regex=/([A-Z][a-z]*)(\d*)/g;
            let match;
            let lastIndex=0;
            while ((match=regex.exec(formula))!==null){
                let element=match[1];
                let subscript=match[2]?parseInt(match[2]):1;
                if (compound[element]){
                    throw new Error("Oops, "+element+" shows up twice in "+formula);
                }
                compound[element]=subscript;
                lastIndex=regex.lastIndex;
            }
            if (lastIndex!==formula.length){
                throw new Error("Bad formula: "+formula);
            }
            return compound;
        }

        function parseEquation(equation){
            let sides=equation.split("->");
            let trimmedSides=[];
            for (let i=0;i<sides.length;i++){
                trimmedSides.push(sides[i].trim());
            }
            if (trimmedSides.length!==2){
                throw new Error("Equation format is off, use \"->\" between sides");
            }
            let reactants=trimmedSides[0].split("+");
            let trimmedReactants=[];
            for (let i=0;i<reactants.length;i++){
                trimmedReactants.push(reactants[i].trim());
            }
            let products=trimmedSides[1].split("+");
            let trimmedProducts=[];
            for (let i=0;i<products.length;i++){
                trimmedProducts.push(products[i].trim());
            }
            return{ reactants: trimmedReactants, products: trimmedProducts };
        }

        function balanceEquation(equation){
            let maxCoefficient=1250;
            let balanceResult=document.getElementById("balance-result");
            balanceResult.innerHTML="Balancing...";
            balanceResult.classList.add("show");
            let equationParts=parseEquation(equation);
            let reactants=equationParts.reactants;
            let products=equationParts.products;
            let allCompounds=reactants.concat(products);
            let parsedCompounds=[];
            for (let i=0;i<allCompounds.length;i++){
                parsedCompounds.push(formatFormula(allCompounds[i]));
            }
            let uniqueElements=[];
            let elementSet=new Set();
            for (let i=0;i<parsedCompounds.length;i++){
                let compound=parsedCompounds[i];
                let compoundKeys=Object.keys(compound);
                for (let j=0;j<compoundKeys.length;j++){
                    elementSet.add(compoundKeys[j]);
                }
            }
            uniqueElements=Array.from(elementSet);

            function calculateGCD(a, b){
                if (b==0){
                    return a;
                }
                return calculateGCD(b, a%b);
            }

            function calculateLCM(a, b){
                return (a/calculateGCD(a, b))*b;
            }
            function Fraction(numerator, denominator){
                this.numerator=numerator;
                this.denominator=denominator;
                this.normalize();
            }
            Fraction.prototype.normalize=function(){
                if (this.denominator<0){
                    this.numerator=-this.numerator;
                    this.denominator=-this.denominator;
                }
                let gcdValue=calculateGCD(Math.abs(this.numerator), Math.abs(this.denominator));
                this.numerator=this.numerator/gcdValue;
                this.denominator=this.denominator/gcdValue;
            };
            Fraction.prototype.add=function(fraction){
                let newNumerator=(this.numerator*fraction.denominator)+(fraction.numerator*this.denominator);
                let newDenominator=this.denominator*fraction.denominator;
                return new Fraction(newNumerator, newDenominator);
            };
            Fraction.prototype.sub=function(fraction){
                let newNumerator=(this.numerator*fraction.denominator)-(fraction.numerator*this.denominator);
                let newDenominator=this.denominator*fraction.denominator;
                return new Fraction(newNumerator, newDenominator);
            };
            Fraction.prototype.mul=function(fraction){
                let newNumerator=this.numerator*fraction.numerator;
                let newDenominator=this.denominator*fraction.denominator;
                return new Fraction(newNumerator, newDenominator);
            };
            Fraction.prototype.div=function(fraction){
                let newNumerator=this.numerator*fraction.denominator;
                let newDenominator=this.denominator*fraction.numerator;
                return new Fraction(newNumerator, newDenominator);
            };
            let compoundCount=allCompounds.length;
            let elementCount=uniqueElements.length;
            let coefficientMatrix=[];
            for (let i=0;i<elementCount;i++){
                let element=uniqueElements[i];
                let row=[];
                for (let j=0;j<compoundCount;j++){
                    let sign=j<reactants.length?1:-1;
                    let compound=parsedCompounds[j];
                    let elementCountInCompound=compound[element]||0;
                    row.push(sign*elementCountInCompound);
                }
                coefficientMatrix.push(row);
            }

            let variableCount=compoundCount-1;
            let equationCount=elementCount;
            let augmentedMatrix=[];
            for (let i=0;i<equationCount;i++){
                let row=[];
                for (let j=0;j<variableCount;j++){
                    row.push(new Fraction(coefficientMatrix[i][j], 1));
                }
                row.push(new Fraction(-coefficientMatrix[i][compoundCount-1], 1));
                augmentedMatrix.push(row);
            }

            let rank=0;
            for (let col=0;col<variableCount&&rank<equationCount;col++){
                let pivotRow=rank;
                while (pivotRow<equationCount&&augmentedMatrix[pivotRow][col].numerator==0){
                    pivotRow=pivotRow+1;
                }
                if (pivotRow==equationCount){
                    continue;
                }
                let temp=augmentedMatrix[rank];
                augmentedMatrix[rank]=augmentedMatrix[pivotRow];
                augmentedMatrix[pivotRow]=temp;
                let pivot=augmentedMatrix[rank][col];
                let inverse=new Fraction(pivot.denominator, pivot.numerator);
                for (let j=col;j<=variableCount;j++){
                    augmentedMatrix[rank][j]=augmentedMatrix[rank][j].mul(inverse);
                }
                for (let i=0;i<equationCount;i++){
                    if (i!==rank&&augmentedMatrix[i][col].numerator!==0){
                        let factor=augmentedMatrix[i][col];
                        for (let j=col;j<=variableCount;j++){
                            augmentedMatrix[i][j]=augmentedMatrix[i][j].sub(factor.mul(augmentedMatrix[rank][j]));
                        }
                    }
                }
                rank=rank+1;
            }

            let solution=new Array(compoundCount);
            for (let j=0;j<variableCount;j++){
                let value=new Fraction(0, 1);
                for (let i=0;i<equationCount;i++){
                    if (augmentedMatrix[i][j].numerator==1&&augmentedMatrix[i][j].denominator==1){
                        value=augmentedMatrix[i][variableCount];
                        break;
                    }
                }
                solution[j]=value;
            }
            solution[compoundCount-1]=new Fraction(1, 1);

            let denominators=[];
            for (let i=0;i<solution.length;i++){
                denominators.push(solution[i].denominator);
            }
            let commonDenominator=denominators[0];
            for (let i=1;i<denominators.length;i++){
                commonDenominator=calculateLCM(commonDenominator, denominators[i]);
            }

            let coefficients=[];
            for (let i=0;i<solution.length;i++){
                let fraction=solution[i];
                let coefficient=fraction.numerator*(commonDenominator/fraction.denominator);
                coefficients.push(Math.round(coefficient));
            }

            let hasNegative=false;
            for (let i=0;i<coefficients.length;i++){
                if (coefficients[i]<0){
                    hasNegative=true;
                    break;
                }
            }
            if (hasNegative){
                for (let i=0;i<coefficients.length;i++){
                    coefficients[i]=-coefficients[i];
                }
            }

            let gcdAll=coefficients[0];
            for (let i=1;i<coefficients.length;i++){
                gcdAll=calculateGCD(gcdAll, coefficients[i]);
            }
            for (let i=0;i<coefficients.length;i++){
                coefficients[i]=coefficients[i]/gcdAll;
            }

            let hasLargeCoefficient=false;
            for (let i=0;i<coefficients.length;i++){
                if (Math.abs(coefficients[i])>maxCoefficient){
                    hasLargeCoefficient=true;
                    break;
                }
            }
            if (hasLargeCoefficient){
                throw new Error("No solution found with coefficients up to "+maxCoefficient);
            }
            let leftSide="";
            for (let i=0;i<reactants.length;i++){
                let coefficient=coefficients[i];
                let term=coefficient==1?reactants[i]:coefficient+reactants[i];
                leftSide=leftSide+(i>0?" + ":"")+term;
            }
            let rightSide="";
            for (let i=0;i<products.length;i++){
                let coefficient=coefficients[i+reactants.length];
                let term=coefficient==1?products[i]:coefficient+products[i];
                rightSide=rightSide+(i>0?" + ":"")+term;
            }
            return leftSide+" -> "+rightSide;
        }
        function lookUpElement(){
            let input=document.getElementById("element-input");
            let inputValue=input.value.trim().toLowerCase();
            input.classList.remove("error");
            let element=null;
            for (let i=0;i<elementsData.length;i++){
                let currentElement=elementsData[i];
                if (currentElement.symbol.toLowerCase()==inputValue||currentElement.name.toLowerCase()==inputValue){
                    element=currentElement;
                    break;
                }
            }
            let elementInfo=document.getElementById("element-info");
            if (element!==null){
                let info="<p><strong>Symbol:</strong> "+element.symbol+"</p>"+"<p><strong>Name:</strong> "+element.name+"</p>"+"<p><strong>Atomic Mass:</strong> "+element.atomicMass+" u</p>"+"<p><strong>Atomic Number:</strong> "+element.atomicNumber+"</p>"+"<p><strong>Electronegativity:</strong> "+(element.electronegativity!==null?element.electronegativity:"N/A")+"</p>"+"<p><strong>Electron Affinity:</strong> "+(element.electronAffinity!==null?element.electronAffinity:"N/A")+" kJ/mol</p>"+"<p><strong>Atomic Radius:</strong> "+(element.atomicRadius!==null?element.atomicRadius:"N/A")+" pm</p>"+"<p><strong>Ionization Energy:</strong> "+(element.ionizationEnergy!==null?element.ionizationEnergy:"N/A")+" kJ/mol</p>"+"<p><strong>Valence Electrons:</strong> "+element.valenceElectrons+"</p>"+"<p><strong>Total Electrons:</strong> "+element.totalElectrons+"</p>"+"<p><strong>Group:</strong> "+element.group+"</p>"+"<p><strong>Period:</strong> "+element.period+"</p>"+"<p><strong>Type:</strong> "+element.type+"</p>";
                elementInfo.innerHTML=info;
                elementInfo.classList.add("show");
            }
            else{
                elementInfo.innerHTML="<p>Element not found</p>";
                elementInfo.classList.add("show");
                input.classList.add("error");
            }
        }
        function calculateMass(){
            let input=document.getElementById("formula-input");
            let formula=input.value.trim();
            input.classList.remove("error");
            let massResult=document.getElementById("mass-result");
            if (formula==""){
                massResult.innerHTML="<p>Please enter a chemical formula</p>";
                massResult.classList.add("show");
                input.classList.add("error");
                return;
            }
            try{
                let totalMass=calculateMolarMass(formula, elementsData);
                massResult.innerHTML="<p>Molar Mass: "+totalMass.toFixed(2)+" g/mol</p>";
                massResult.classList.add("show");
            }
            catch (error){
                massResult.innerHTML="<p>"+error.message+"</p>";
                massResult.classList.add("show");
                input.classList.add("error");
            }
        }
        function balanceEquations(){
            let input=document.getElementById("equation-input");
            let equation=input.value.trim();
            input.classList.remove("error");
            let balanceResult=document.getElementById("balance-result");
            if (equation==""){
                balanceResult.innerHTML="<p>Please enter a chemical equation</p>";
                balanceResult.classList.add("show");
                input.classList.add("error");
                return;
            }
            try{
                let balancedEquation=balanceEquation(equation);
                balanceResult.innerHTML="<p>Balanced Equation: "+balancedEquation+"</p>";
                balanceResult.classList.add("show");
            }
            catch (error){
                balanceResult.innerHTML="<p>"+error.message+"</p>";
                balanceResult.classList.add("show");
                input.classList.add("error");
            }
        }
        function parseBalancedEquation(equation){
            let cleanedEquation=equation.replace(/\s+/g, "");
            let parts=cleanedEquation.split("->");
            if (parts.length!==2){
                throw new Error("Invalid equation format: missing \"->\"");
            }
            let reactants=parts[0].split("+");
            let products=parts[1].split("+");
            let parsedReactants=[];
            let parsedProducts=[];
            for (let i=0;i<reactants.length;i++){
                parsedReactants.push(parseTerm(reactants[i]));
            }
            for (let i=0;i<products.length;i++){
                parsedProducts.push(parseTerm(products[i]));
            }
            return{ reactants: parsedReactants, products: parsedProducts };
        }
        function parseTerm(term){
            let match=term.match(/^(\d+)?(.+)$/);
            if (!match){
                throw new Error("Invalid term: "+term);
            }
            let coefficient=match[1]?parseInt(match[1]):1;
            let formula=match[2];
            return{ formula: formula, coefficient: coefficient };
        }
        function getCalculationType(){
            let select=document.getElementById("calculation-type");
            let type=select.value;
            let input=document.getElementById("stoich-equation-input");
            let equation=input.value.trim();
            let inputsDiv=document.getElementById("stoich-inputs");
            if (equation==""){
                inputsDiv.innerHTML="<p>Please enter a balanced chemical equation.</p>";
                inputsDiv.classList.add("show");
                input.classList.add("error");
                return;
            }
            try{
                let parsed=parseBalancedEquation(equation);
                input.classList.remove("error");
                inputsDiv.innerHTML="";
                if (type=="product-from-reactant"){
                    let reactantOptions="";
                    for (let i=0;i<parsed.reactants.length;i++){
                        let reactant=parsed.reactants[i];
                        reactantOptions=reactantOptions+"<option value=\""+reactant.formula+"\">"+reactant.formula+"</option>";
                    }
                    let reactantSelect="<select id=\"reactant-select\">"+reactantOptions+"</select>";
                    let molesInput="<input type=\"number\" id=\"reactant-moles\" placeholder=\"Moles of reactant\" min=\"0\" step=\"any\">";
                    let productOptions="";
                    for (let i=0;i<parsed.products.length;i++){
                        let product=parsed.products[i];
                        productOptions=productOptions+"<option value=\""+product.formula+"\">"+product.formula+"</option>";
                    }
                    let productSelect="<select id=\"product-select\">"+productOptions+"</select>";
                    inputsDiv.innerHTML="<p>Select reactant: "+reactantSelect+"</p><p>Enter moles: "+molesInput+"</p><p>Select product: "+productSelect+"</p>";
                    inputsDiv.classList.add("show");
                }
                else if (type=="reactant-from-product"){
                    let productOptions="";
                    for (let i=0;i<parsed.products.length;i++){
                        let product=parsed.products[i];
                        productOptions=productOptions+"<option value=\""+product.formula+"\">"+product.formula+"</option>";
                    }
                    let productSelect="<select id=\"product-select\">"+productOptions+"</select>";
                    let molesInput="<input type=\"number\" id=\"product-moles\" placeholder=\"Moles of product\" min=\"0\" step=\"any\">";
                    let reactantOptions="";
                    for (let i=0;i<parsed.reactants.length;i++){
                        let reactant=parsed.reactants[i];
                        reactantOptions=reactantOptions+"<option value=\""+reactant.formula+"\">"+reactant.formula+"</option>";
                    }
                    let reactantSelect="<select id=\"reactant-select\">"+reactantOptions+"</select>";
                    inputsDiv.innerHTML="<p>Select product: "+productSelect+"</p><p>Enter moles: "+molesInput+"</p><p>Select reactant: "+reactantSelect+"</p>";
                    inputsDiv.classList.add("show");
                }
                else if (type=="limiting-reactant"){
                    let reactantInputs="";
                    for (let i=0;i<parsed.reactants.length;i++){
                        let reactant=parsed.reactants[i];
                        reactantInputs=reactantInputs+"<p>"+reactant.formula+": <input type=\"number\" id=\"moles-"+reactant.formula+"\" placeholder=\"Moles of "+reactant.formula+"\" min=\"0\" step=\"any\"></p>";
                    }
                    let productOptions="";
                    for (let i=0;i<parsed.products.length;i++){
                        let product=parsed.products[i];
                        productOptions=productOptions+"<option value=\""+product.formula+"\">"+product.formula+"</option>";
                    }
                    let productSelect="<select id=\"product-select\">"+productOptions+"</select>";
                    inputsDiv.innerHTML=reactantInputs+"<p>Select product to calculate: "+productSelect+"</p>";
                    inputsDiv.classList.add("show");
                }
            }
            catch (error){
                inputsDiv.innerHTML="<p>Error parsing equation: "+error.message+"</p>";
                inputsDiv.classList.add("show");
                input.classList.add("error");
            }
        }
        function calculateStoichiometry(){
            let select=document.getElementById("calculation-type");
            let type=select.value;
            let input=document.getElementById("stoich-equation-input");
            let equation=input.value.trim();
            let resultDiv=document.getElementById("stoich-result");
            input.classList.remove("error");
            if (equation==""){
                resultDiv.innerHTML="<p>Please enter a balanced chemical equation.</p>";
                resultDiv.classList.add("show");
                input.classList.add("error");
                return;
            }
            try{
                let parsed=parseBalancedEquation(equation);
                input.classList.remove("error");
                if (type=="product-from-reactant"){
                    let reactantSelect=document.getElementById("reactant-select");
                    let reactantFormula=reactantSelect.value;
                    let molesInput=document.getElementById("reactant-moles");
                    let molesReactant=parseFloat(molesInput.value);
                    let productSelect=document.getElementById("product-select");
                    let productFormula=productSelect.value;
                    let isMolesValid=!isNaN(molesReactant)&&molesReactant>0;
                    if (!isMolesValid){
                        molesInput.classList.add("error");
                        throw new Error("Invalid moles input");
                    }
                    molesInput.classList.remove("error");
                    let reactant=null;
                    for (let i=0;i<parsed.reactants.length;i++){
                        if (parsed.reactants[i].formula==reactantFormula){
                            reactant=parsed.reactants[i];
                            break;
                        }
                    }
                    let product=null;
                    for (let i=0;i<parsed.products.length;i++){
                        if (parsed.products[i].formula==productFormula){
                            product=parsed.products[i];
                            break;
                        }
                    }
                    if (reactant==null||product==null){
                        throw new Error("Selected compound not found");
                    }
                    let molesProduct=(molesReactant/reactant.coefficient)*product.coefficient;
                    resultDiv.innerHTML="<p>Moles of "+productFormula+": "+molesProduct.toFixed(2)+"</p>";
                    resultDiv.classList.add("show");
                }
                else if (type=="reactant-from-product"){
                    let productSelect=document.getElementById("product-select");
                    let productFormula=productSelect.value;
                    let molesInput=document.getElementById("product-moles");
                    let molesProduct=parseFloat(molesInput.value);
                    let reactantSelect=document.getElementById("reactant-select");
                    let reactantFormula=reactantSelect.value;
                    let isMolesValid=!isNaN(molesProduct)&&molesProduct>0;
                    if (!isMolesValid){
                        molesInput.classList.add("error");
                        throw new Error("Invalid moles input");
                    }
                    molesInput.classList.remove("error");
                    let product=null;
                    for (let i=0;i<parsed.products.length;i++){
                        if (parsed.products[i].formula==productFormula){
                            product=parsed.products[i];
                            break;
                        }
                    }
                    let reactant=null;
                    for (let i=0;i<parsed.reactants.length;i++){
                        if (parsed.reactants[i].formula==reactantFormula){
                            reactant=parsed.reactants[i];
                            break;
                        }
                    }
                    if (product==null||reactant==null){
                        throw new Error("Selected compound not found");
                    }
                    let molesReactant=(molesProduct/product.coefficient)*reactant.coefficient;
                    resultDiv.innerHTML="<p>Moles of "+reactantFormula+": "+molesReactant.toFixed(2)+"</p>";
                    resultDiv.classList.add("show");
                }
                else if (type=="limiting-reactant"){
                    let reactantMoles ={};
                    for (let i=0;i<parsed.reactants.length;i++){
                        let reactant=parsed.reactants[i];
                        let molesInput=document.getElementById("moles-"+reactant.formula);
                        let moles=parseFloat(molesInput.value);
                        let isMolesValid=!isNaN(moles)&&moles>0;
                        if (!isMolesValid){
                            molesInput.classList.add("error");
                            throw new Error("Invalid moles for "+reactant.formula);
                        }
                        molesInput.classList.remove("error");
                        reactantMoles[reactant.formula]=moles;
                    }
                    let productSelect=document.getElementById("product-select");
                    let productFormula=productSelect.value;
                    let product=null;
                    for (let i=0;i<parsed.products.length;i++){
                        if (parsed.products[i].formula==productFormula){
                            product=parsed.products[i];
                            break;
                        }
                    }
                    if (product==null){
                        throw new Error("Selected product not found");
                    }
                    let minRatio=Infinity;
                    let limitingReactant=null;
                    for (let i=0;i<parsed.reactants.length;i++){
                        let reactant=parsed.reactants[i];
                        let ratio=reactantMoles[reactant.formula]/reactant.coefficient;
                        if (ratio<minRatio){
                            minRatio=ratio;
                            limitingReactant=reactant.formula;
                        }
                    }
                    let molesProduct=minRatio*product.coefficient;
                    resultDiv.innerHTML="<p>Limiting reactant: "+limitingReactant+"</p><p>Moles of "+productFormula+": "+molesProduct.toFixed(2)+"</p>";
                    resultDiv.classList.add("show");
                }
            }
            catch (error){
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
                input.classList.add("error");
            }
        }
        function calculateDilution(){
            try{
                let select=document.getElementById("dilution-solve-for");
                let solveFor=select.value;
                let M1=parseFloat(document.getElementById("dilution-M1").value);
                let V1=parseFloat(document.getElementById("dilution-V1").value);
                let M2=parseFloat(document.getElementById("dilution-M2").value);
                let V2=parseFloat(document.getElementById("dilution-V2").value);
                let result, formula;
                let inputs=document.querySelectorAll("#dilution-calc input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                if (solveFor=="M1"){
                    validateInputs([V1, M2, V2], ["dilution-V1", "dilution-M2", "dilution-V2"]);
                    result=(M2*V2)/V1;
                    formula="M<sub>1</sub>=(M<sub>2</sub> x V<sub>2</sub>)/V<sub>1</sub>";
                }
                else if (solveFor=="V1"){
                    validateInputs([M1, M2, V2], ["dilution-M1", "dilution-M2", "dilution-V2"]);
                    result=(M2*V2)/M1;
                    formula="V<sub>1</sub>=(M<sub>2</sub> x V<sub>2</sub>)/M<sub>1</sub>";
                }
                else if (solveFor=="M2"){
                    validateInputs([M1, V1, V2], ["dilution-M1", "dilution-V1", "dilution-V2"]);
                    result=(M1*V1)/V2;
                    formula="M<sub>2</sub>=(M<sub>1</sub> x V<sub>1</sub>)/V<sub>2</sub>";
                }
                else if (solveFor=="V2"){
                    validateInputs([M1, V1, M2], ["dilution-M1", "dilution-V1", "dilution-M2"]);
                    result=(M1*V1)/M2;
                    formula="V<sub>2</sub>=(M<sub>1</sub> x V<sub>1</sub>)/M<sub>2</sub>";
                }
                else{
                    throw new Error("Invalid calculation type");
                }
                let unit=solveFor.startsWith("M")?"M":"L";
                let resultDiv=document.getElementById("dilution-result");
                resultDiv.innerHTML="<p>"+formula+"</p><p>Result: "+result.toFixed(4)+" "+unit+"</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("dilution-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateMassPercent(){
            try{
                let solute=parseFloat(document.getElementById("mass-solute").value);
                let solution=parseFloat(document.getElementById("mass-solution").value);
                let select=document.getElementById("concentration-unit");
                let unit=select.value;
                let inputs=document.querySelectorAll("#mass-percent-calc input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                validateInputs([solute, solution], ["mass-solute", "mass-solution"]);
                if (solution==0){
                    throw new Error("Solution mass cannot be zero");
                }
                let ratio=solute/solution;
                let result, unitText;
                if (unit=="percent"){
                    result=ratio*100;
                    unitText="%";
                }
                else if (unit=="ppm"){
                    result=ratio*1000000;
                    unitText="ppm";
                }
                else if (unit=="ppb"){
                    result=ratio*1000000000;
                    unitText="ppb";
                }
                else{
                    throw new Error("Invalid unit");
                }
                let resultDiv=document.getElementById("mass-percent-result");
                resultDiv.innerHTML="<p>Concentration: "+result.toFixed(4)+" "+unitText+"</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("mass-percent-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateMixing(){
            try{
                let C1=parseFloat(document.getElementById("mix-C1").value);
                let V1=parseFloat(document.getElementById("mix-V1").value);
                let C2=parseFloat(document.getElementById("mix-C2").value);
                let V2=parseFloat(document.getElementById("mix-V2").value);
                let inputs=document.querySelectorAll("#solution-mixing-calc input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                validateInputs([C1, V1, C2, V2], ["mix-C1", "mix-V1", "mix-C2", "mix-V2"]);
                if (V1+V2==0){
                    throw new Error("Total volume cannot be zero");
                }
                let totalMoles=(C1*V1)+(C2*V2);
                let totalVolume=V1+V2;
                let finalConcentration=totalMoles/totalVolume;
                let resultDiv=document.getElementById("mixing-result");
                resultDiv.innerHTML="<p>Final Concentration: "+finalConcentration.toFixed(4)+" M</p><p>Total Volume: "+totalVolume.toFixed(4)+" L</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("mixing-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function validateInputs(inputs, ids){
            for (let i=0;i<inputs.length;i++){
                if (isNaN(inputs[i])){
                    if (ids&&ids[i]){
                        let input=document.getElementById(ids[i]);
                        input.classList.add("error");
                    }
                    throw new Error("Please fill all required fields with valid numbers");
                }
            }
        }
        function calculateIdealGasLaw(){
            try{
                let select=document.getElementById("ideal-solve-for");
                let solveFor=select.value;
                let unitsSelect=document.getElementById("ideal-R-units");
                let units=unitsSelect.value;
                let R=units=="atm-L"?0.08206:8.314;
                let P=parseFloat(document.getElementById("ideal-P").value);
                let V=parseFloat(document.getElementById("ideal-V").value);
                let n=parseFloat(document.getElementById("ideal-n").value);
                let T=parseFloat(document.getElementById("ideal-T").value);
                let result, formula;
                let inputs=document.querySelectorAll("#ideal-gas-law input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                if (solveFor=="P"){
                    validateInputs([V, n, T], ["ideal-V", "ideal-n", "ideal-T"]);
                    result=(n*R*T)/V;
                    formula="P=(nRT)/V";
                }
                else if (solveFor=="V"){
                    validateInputs([P, n, T], ["ideal-P", "ideal-n", "ideal-T"]);
                    result=(n*R*T)/P;
                    formula="V=(nRT)/P";
                }
                else if (solveFor=="n"){
                    validateInputs([P, V, T], ["ideal-P", "ideal-V", "ideal-T"]);
                    result=(P*V)/(R*T);
                    formula="n=(PV)/(RT)";
                }
                else if (solveFor=="T"){
                    validateInputs([P, V, n], ["ideal-P", "ideal-V", "ideal-n"]);
                    result=(P*V)/(n*R);
                    formula="T=(PV)/(nR)";
                }
                let unit;
                if (solveFor=="P"){
                    unit=units=="atm-L"?"atm":"Pa";
                }
                else if (solveFor=="V"){
                    unit=units=="atm-L"?"L":"m³";
                }
                else if (solveFor=="n"){
                    unit="mol";
                }
                else{
                    unit="K";
                }
                let resultDiv=document.getElementById("ideal-result");
                resultDiv.innerHTML="<p>"+formula+"</p><p>Result: "+result.toFixed(4)+" "+unit+"</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("ideal-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateCombinedGasLaw(){
            try{
                let select=document.getElementById("combined-solve-for");
                let solveFor=select.value;
                let P1=parseFloat(document.getElementById("combined-P1").value);
                let V1=parseFloat(document.getElementById("combined-V1").value);
                let T1=parseFloat(document.getElementById("combined-T1").value);
                let P2=parseFloat(document.getElementById("combined-P2").value);
                let V2=parseFloat(document.getElementById("combined-V2").value);
                let T2=parseFloat(document.getElementById("combined-T2").value);
                let result, formula;
                let inputs=document.querySelectorAll("#combined-gas-law input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                if (solveFor=="P1"){
                    validateInputs([V1, T1, P2, V2, T2], ["combined-V1", "combined-T1", "combined-P2", "combined-V2", "combined-T2"]);
                    result=(P2*V2*T1)/(V1*T2);
                    formula="P<sub>1</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(V<sub>1</sub> T<sub>2</sub>)";
                }
                else if (solveFor=="V1"){
                    validateInputs([P1, T1, P2, V2, T2], ["combined-P1", "combined-T1", "combined-P2", "combined-V2", "combined-T2"]);
                    result=(P2*V2*T1)/(P1*T2);
                    formula="V<sub>1</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(P<sub>1</sub> T<sub>2</sub>)";
                }
                else if (solveFor=="T1"){
                    validateInputs([P1, V1, P2, V2, T2], ["combined-P1", "combined-V1", "combined-P2", "combined-V2", "combined-T2"]);
                    result=(P1*V1*T2)/(P2*V2);
                    formula="T<sub>1</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(P<sub>2</sub> V<sub>2</sub>)";
                }
                else if (solveFor=="P2"){
                    validateInputs([P1, V1, T1, V2, T2], ["combined-P1", "combined-V1", "combined-T1", "combined-V2", "combined-T2"]);
                    result=(P1*V1*T2)/(V2*T1);
                    formula="P<sub>2</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(V<sub>2</sub> T<sub>1</sub>)";
                }
                else if (solveFor=="V2"){
                    validateInputs([P1, V1, T1, P2, T2], ["combined-P1", "combined-V1", "combined-T1", "combined-P2", "combined-T2"]);
                    result=(P1*V1*T2)/(P2*T1);
                    formula="V<sub>2</sub>=(P<sub>1</sub> V<sub>1</sub> T<sub>2</sub>)/(P<sub>2</sub> T<sub>1</sub>)";
                }
                else if (solveFor=="T2"){
                    validateInputs([P1, V1, T1, P2, V2], ["combined-P1", "combined-V1", "combined-T1", "combined-P2", "combined-V2"]);
                    result=(P2*V2*T1)/(P1*V1);
                    formula="T<sub>2</sub>=(P<sub>2</sub> V<sub>2</sub> T<sub>1</sub>)/(P<sub>1</sub> V<sub>1</sub>)";
                }
                let unit;
                if (solveFor.includes("P")){
                    unit="pressure units";
                }
                else if (solveFor.includes("V")){
                    unit="volume units";
                }
                else if (solveFor.includes("T")){
                    unit="K";
                }
                else{
                    unit="";
                }
                let resultDiv=document.getElementById("combined-result");
                resultDiv.innerHTML="<p>"+formula+"</p><p>Result: "+result.toFixed(4)+" "+unit+"</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("combined-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateVanDerWaals(){
            try{
                let V=parseFloat(document.getElementById("vdw-V").value);
                let n=parseFloat(document.getElementById("vdw-n").value);
                let T=parseFloat(document.getElementById("vdw-T").value);
                let a=parseFloat(document.getElementById("vdw-a").value);
                let b=parseFloat(document.getElementById("vdw-b").value);
                let inputs=document.querySelectorAll("#van-der-waals input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                validateInputs([V, n, T, a, b], ["vdw-V", "vdw-n", "vdw-T", "vdw-a", "vdw-b"]);
                let R=0.08206;
                let P=(n*R*T)/(V-n*b)-a*Math.pow(n/V, 2);
                let resultDiv=document.getElementById("vdw-result");
                resultDiv.innerHTML="<p>P="+P.toFixed(4)+" atm</p>";
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("vdw-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateHalfLife(){
            try{
                let select=document.getElementById("half-life-solve-for");
                let solveFor=select.value;
                let N0=parseFloat(document.getElementById("initial-quantity").value);
                let t=parseFloat(document.getElementById("time-input").value);
                let t_half=parseFloat(document.getElementById("half-life-input").value);
                let Nt=parseFloat(document.getElementById("remaining-quantity").value);
                let inputs=document.querySelectorAll("#half-life-calc input");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.remove("error");
                }
                let result;
                if (solveFor=="remaining"){
                    validateInputs([N0, t, t_half], ["initial-quantity", "time-input", "half-life-input"]);
                    result=N0*Math.pow(0.5, t/t_half);
                    let resultDiv=document.getElementById("half-life-result");
                    resultDiv.innerHTML="<p>Remaining: "+result.toFixed(4)+" (after "+t+" units)</p>";
                    resultDiv.classList.add("show");
                }
                else if (solveFor=="time"){
                    validateInputs([N0, t_half, Nt], ["initial-quantity", "half-life-input", "remaining-quantity"]);
                    result=(Math.log(Nt/N0)/Math.log(0.5))*t_half;
                    let resultDiv=document.getElementById("half-life-result");
                    resultDiv.innerHTML="<p>Time needed: "+result.toFixed(4)+" units</p>";
                    resultDiv.classList.add("show");
                }
                else if (solveFor=="half-life"){
                    validateInputs([N0, t, Nt], ["initial-quantity", "time-input", "remaining-quantity"]);
                    result=t/(Math.log(Nt/N0)/Math.log(0.5));
                    let resultDiv=document.getElementById("half-life-result");
                    resultDiv.innerHTML="<p>Half-life: "+result.toFixed(4)+" units</p>";
                    resultDiv.classList.add("show");
                }
            }
            catch (error){
                let resultDiv=document.getElementById("half-life-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
            }
        }
        function calculateCellPotential(){
            let E1=parseFloat(document.getElementById("E1").value);
            let E2=parseFloat(document.getElementById("E2").value);
            let inputs=document.querySelectorAll("#cell-potential input");
            for (let i=0;i<inputs.length;i++){
                inputs[i].classList.remove("error");
            }
            let resultDiv=document.getElementById("cell-potential-result");
            if (isNaN(E1)||isNaN(E2)){
                resultDiv.innerHTML="<p>Please enter valid numbers for both potentials.</p>";
                resultDiv.classList.add("show");
                document.getElementById("E1").classList.add("error");
                document.getElementById("E2").classList.add("error");
                return;
            }
            let E_cathode=Math.max(E1, E2);
            let E_anode=Math.min(E1, E2);
            let E_cell=E_cathode-E_anode;
            let result="<p>The half-reaction with E°="+E_cathode+" V is the cathode, and the one with E°="+E_anode+" V is the anode.</p>"+"<p>The standard cell potential E°_cell="+E_cell.toFixed(3)+" V</p>";
            resultDiv.innerHTML=result;
            resultDiv.classList.add("show");
        }
        function calculateNernst(){
            let E_standard=parseFloat(document.getElementById("E-standard").value);
            let T=parseFloat(document.getElementById("temperature").value);
            let n=parseFloat(document.getElementById("n-electrons").value);
            let Q=parseFloat(document.getElementById("Q-reaction").value);
            let inputs=document.querySelectorAll("#nernst-equation input");
            for (let i=0;i<inputs.length;i++){
                inputs[i].classList.remove("error");
            }
            let resultDiv=document.getElementById("nernst-result");
            if (isNaN(E_standard)||isNaN(T)||isNaN(n)||isNaN(Q)||T<=0||n<=0||Q<=0){
                resultDiv.innerHTML="<p>Please enter valid positive numbers for all fields.</p>";
                resultDiv.classList.add("show");
                for (let i=0;i<inputs.length;i++){
                    inputs[i].classList.add("error");
                }
                return;
            }
            let E=E_standard-((gasConstant*T)/(n*faradayConstant))*Math.log(Q);
            resultDiv.innerHTML="<p>The cell potential E="+E.toFixed(3)+" V</p>";
            resultDiv.classList.add("show");
        }
        function calculateElectrolysis(){
            let select=document.getElementById("electrolysis-solve-for");
            let solveFor=select.value;
            let m=parseFloat(document.getElementById("electrolysis-m").value);
            let I=parseFloat(document.getElementById("electrolysis-I").value);
            let t=parseFloat(document.getElementById("electrolysis-t").value);
            let z=parseFloat(document.getElementById("electrolysis-z").value);
            let M=parseFloat(document.getElementById("electrolysis-M").value);
            let inputs=document.querySelectorAll("#electrolysis input");
            for (let i=0;i<inputs.length;i++){
                inputs[i].classList.remove("error");
            }
            let resultDiv=document.getElementById("electrolysis-result");
            if (solveFor=="mass"){
                if (isNaN(I)||isNaN(t)||isNaN(z)||isNaN(M)||I<=0||t<=0||z<=0||M<=0){
                    resultDiv.innerHTML="<p>Please enter valid positive numbers for I, t, z, and M.</p>";
                    resultDiv.classList.add("show");
                    document.getElementById("electrolysis-I").classList.add("error");
                    document.getElementById("electrolysis-t").classList.add("error");
                    document.getElementById("electrolysis-z").classList.add("error");
                    document.getElementById("electrolysis-M").classList.add("error");
                    return;
                }
                let n=(I*t)/(faradayConstant*z);
                let mass=n*M;
                resultDiv.innerHTML="<p>The mass deposited m="+mass.toFixed(3)+" g</p>";
                resultDiv.classList.add("show");
            }
            else if (solveFor=="current"){
                if (isNaN(m)||isNaN(t)||isNaN(z)||isNaN(M)||m<=0||t<=0||z<=0||M<=0){
                    resultDiv.innerHTML="<p>Please enter valid positive numbers for m, t, z, and M.</p>";
                    resultDiv.classList.add("show");
                    document.getElementById("electrolysis-m").classList.add("error");
                    document.getElementById("electrolysis-t").classList.add("error");
                    document.getElementById("electrolysis-z").classList.add("error");
                    document.getElementById("electrolysis-M").classList.add("error");
                    return;
                }
                let n=m/M;
                let current=(n*faradayConstant*z)/t;
                resultDiv.innerHTML="<p>The current I="+current.toFixed(3)+" A</p>";
                resultDiv.classList.add("show");
            }
            else if (solveFor=="time"){
                if (isNaN(m)||isNaN(I)||isNaN(z)||isNaN(M)||m<=0||I<=0||z<=0||M<=0){
                    resultDiv.innerHTML="<p>Please enter valid positive numbers for m, I, z, and M.</p>";
                    resultDiv.classList.add("show");
                    document.getElementById("electrolysis-m").classList.add("error");
                    document.getElementById("electrolysis-I").classList.add("error");
                    document.getElementById("electrolysis-z").classList.add("error");
                    document.getElementById("electrolysis-M").classList.add("error");
                    return;
                }
                let n=m/M;
                let time=(n*faradayConstant*z)/I;
                resultDiv.innerHTML="<p>The time t="+time.toFixed(3)+" s</p>";
                resultDiv.classList.add("show");
            }
        }
        function predictBondType(){
            try{
                let element1Input=document.getElementById("element1-input");
                let element2Input=document.getElementById("element2-input");
                let resultDiv=document.getElementById("bond-type-result");
                element1Input.classList.remove("error");
                element2Input.classList.remove("error");
                resultDiv.classList.remove("show");
                let element1Value=element1Input.value.trim();
                let element2Value=element2Input.value.trim();
                if (!element1Value||!element2Value){
                    element1Input.classList.add("error");
                    element2Input.classList.add("error");
                    throw new Error("Please enter both element symbols");
                }
                element1Value=element1Value.charAt(0).toUpperCase()+element1Value.slice(1).toLowerCase();
                element2Value=element2Value.charAt(0).toUpperCase()+element2Value.slice(1).toLowerCase();
                let element1=null;
                let element2=null;
                for (let i=0;i<elementsData.length;i++){
                    let currentElement=elementsData[i];
                    if (currentElement.symbol==element1Value){
                        element1=currentElement;
                    }
                    if (currentElement.symbol==element2Value){
                        element2=currentElement;
                    }
                    if (element1!==null&&element2!==null){
                        break;
                    }
                }
                if (!element1||!element2){
                    element1Input.classList.add("error");
                    element2Input.classList.add("error");
                    throw new Error("One or both elements not found in periodic table");
                }
                let en1=element1.electronegativity;
                let en2=element2.electronegativity;
                if (en1==null||en2==null||en1==undefined||en2==undefined){
                    resultDiv.innerHTML="<p>Bond prediction not possible due to unavailable electronegativity data</p>";
                    resultDiv.classList.add("show");
                    return;
                }
                let deltaEN=Math.abs(en1-en2).toFixed(2);
                let type1=element1.type.toLowerCase();
                let type2=element2.type.toLowerCase();
                let isMetal1=(type1=="lanthanide"||type1=="actinide"||(type1.indexOf("metal")!==-1&&type1!=="metalloid"&&type1!=="non-metal"));
                let isMetal2=(type2=="lanthanide"||type2=="actinide"||(type2.indexOf("metal")!==-1&&type2!=="metalloid"&&type2!=="non-metal"));
                let bondType;
                if (isMetal1&&isMetal2){
                    bondType="Metallic";
                }
                else if (isMetal1!==isMetal2||deltaEN>=1.7){
                    bondType="Ionic";
                }
                else if (deltaEN>=0.4){
                    bondType="Polar Covalent";
                }
                else{
                    bondType="Nonpolar Covalent";
                }
                let result="<p>"+element1.symbol+" ("+en1+") and "+element2.symbol+" ("+en2+") -> ΔEN="+deltaEN+" -> "+bondType+" bond</p>";
                resultDiv.innerHTML=result;
                resultDiv.classList.add("show");
            }
            catch (error){
                let resultDiv=document.getElementById("bond-type-result");
                resultDiv.innerHTML="<p>Error: "+error.message+"</p>";
                resultDiv.classList.add("show");
                document.getElementById("element1-input").classList.add("error");
                document.getElementById("element2-input").classList.add("error");
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
                document.getElementById("ideal-P").setAttribute("placeholder", "P (atm)");
                document.getElementById("ideal-V").setAttribute("placeholder", "V (L)");
            }
            else if (units=="SI"){
                document.getElementById("ideal-P").setAttribute("placeholder", "P (Pa)");
                document.getElementById("ideal-V").setAttribute("placeholder", "V (m³)");
            }
        });
        document.getElementById("calculate-half-life").addEventListener("click", calculateHalfLife);
        document.getElementById("half-life-solve-for").addEventListener("change", function(){
            let solveFor=this.value;
            let displayStyle=(solveFor=="time"||solveFor=="half-life")?"block":"none";
            document.getElementById("remaining-quantity-group").style.display=displayStyle;
        });
        document.getElementById("calculate-cell-potential").addEventListener("click", calculateCellPotential);
        document.getElementById("calculate-nernst").addEventListener("click", calculateNernst);
        document.getElementById("calculate-electrolysis").addEventListener("click", calculateElectrolysis);
        document.getElementById("calculate-bond-type").addEventListener("click", predictBondType);
    })
    .catch(function(error){
        console.error("Error fetching data:", error);
        let elementInfo=document.getElementById("element-info");
        elementInfo.innerHTML="<p>Error loading element data table</p>";
        elementInfo.classList.add("show");
    });
    let navLinks=document.querySelectorAll("nav a");
    let mainGroups=document.querySelectorAll(".main-groups");
    let navHeight=document.querySelector("nav").offsetHeight;
    for (let i=0;i<navLinks.length;i++){
        navLinks[i].addEventListener("click", function (event){
            event.preventDefault();
            for (let j=0;j<navLinks.length;j++){
                navLinks[j].classList.remove("active");
            }
            this.classList.add("active");
            let targetId=this.getAttribute("href");
            let targetElement=document.querySelector(targetId);
            if (targetElement){
                let targetPosition=targetElement.offsetTop-navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });
            }
        });
    }
    window.addEventListener("scroll", function (){
        let currentPosition=window.scrollY;
        for (let i=0;i<mainGroups.length;i++){
            let section=mainGroups[i];
            let sectionTop=section.offsetTop-navHeight-20;
            let sectionBottom=sectionTop+section.offsetHeight;
            if (currentPosition>=sectionTop&&currentPosition<sectionBottom){
                let id=section.getAttribute("id");
                for (let j=0;j<navLinks.length;j++){
                    navLinks[j].classList.remove("active");
                    if (navLinks[j].getAttribute("href")=="#"+id){
                        navLinks[j].classList.add("active");
                    }
                }
            }
        }
    });
});