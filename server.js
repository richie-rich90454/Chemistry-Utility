let express=require("express");
let path=require("path");
let app=express();
let PORT=6002;
app.get("/ptable.json", (req, res)=>{
    res.status(403).send("403 Forbidden");
});
app.get("/api/ptable", (req, res)=>{
    if (req.get("X-Requested-With")!=="XMLHttpRequest") {
      return res.status(403).send("403 Forbidden");
    }
    res.sendFile(path.join(__dirname, "ptable.json"));
});
app.use(express.static(__dirname));
app.listen(PORT, ()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
});