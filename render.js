//Use: "terser render.js -o render.min.js --compress --mangle" to compress the file (make the min file)
document.addEventListener("DOMContentLoaded", function(){
    let navLinks=document.querySelectorAll("nav a");
    let mainGroups=document.querySelectorAll(".main-groups");
    let navHeight=document.querySelector("nav").getBoundingClientRect().height;
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