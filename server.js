const express=require("express");
const path=require("path");
const{ v4: uuidv4 }=require("uuid");
const fs=require("fs");
const app=express();
const PORT=process.env.PORT||6002;
app.disable("x-powered-by");
const activeConnections=new Set();
app.use((req, res, next)=>{
    activeConnections.add(res);
    res.on("finish", ()=>activeConnections.delete(res));
    next();
});
app.use((req, res, next)=>{
    try{
        const base=req.headers.host?`http://${req.headers.host}`:"http://localhost";
        const parsed=new URL(req.url, base);
        req.url=parsed.pathname + parsed.search;
        next();
    }
    catch (err){
        console.warn("Bad request URL:", req.url);
        return res.status(400).send("Bad Request");
    }
});
const randomDirName=uuidv4();
const randomDirPath=path.join(__dirname, randomDirName);
try{
    fs.mkdirSync(randomDirPath,{ recursive: true, mode: 0o755 });
    const ptableSource=path.join(__dirname, "ptable.json");
    const ptableDest=path.join(randomDirPath, "ptable.json");
    if (!fs.existsSync(ptableSource)){
        throw new Error("ptable.json not found");
    }
    fs.copyFileSync(ptableSource, ptableDest, fs.constants.COPYFILE_FICLONE);
    fs.chmodSync(ptableDest, 0o644);
}
catch (err){
    console.error("Failed to initialize data:", err.message);
    process.exit(1);
}
app.get("/api/ptable", (req, res)=>{
    if (req.get("X-Requested-With")!=="XMLHttpRequest"){
        return res.status(403).json({
            error: "Forbidden",
            message: "Direct access to API is not allowed"
        });
    }
    const filePath=path.join(randomDirPath, "ptable.json");
    if (!fs.existsSync(filePath)){
        return res.status(500).json({
            error: "Server Error",
            message: "Data file not found"
        });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.sendFile(filePath,{
        headers:{
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
});
app.get("/ptable.json", (req,res)=>{
    return res.status(403).json({
        error: "Forbidden",
        message: "Direct access to file is not allowed"
    });
});
app.use(express.static(__dirname,{
    setHeaders: (res, filePath)=>{
        res.set("Cache-Control", filePath.endsWith(".html")?"no-store":"public, max-age=86400");
    }
}));
app.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, "index.html"),{
        headers:{ "Cache-Control": "no-store" }
    });
});
app.use((req, res, next)=>{
    if (/^https?:\/\//.test(req.originalUrl)){
        return res.status(400).send("Bad Request");
    }
    res.sendFile(path.join(__dirname, "index.html"),{
        headers:{ "Cache-Control": "no-store" }
    });
});
app.use((err, req, res, next)=>{
    console.error("Unexpected error:", err.stack||err);
    res.status(500).json({ error: "Internal Server Error" });
});
const server=app.listen(PORT, ()=>{
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Secure data path: ${randomDirPath}`);
});
let isShuttingDown=false;
const gracefulShutdown=async (signal)=>{
    if (isShuttingDown){
        console.log("Shutdown already in progress...");
        return;
    }
    isShuttingDown=true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    const shutdownTimeout=setTimeout(()=>{
        console.error("Forced shutdown due to timeout");
        process.exit(1);
    }, 10000);
    try{
        console.log("Stopping new connections...");
        server.close(async ()=>{
            console.log("Server closed. Cleaning up...");
            try{
                if (activeConnections.size > 0){
                    console.log(`Waiting for ${activeConnections.size} active connections to finish...`);
                    setTimeout(()=>{
                        activeConnections.forEach(conn=>conn.end());
                        activeConnections.clear();
                    }, 5000);
                }
                if (fs.existsSync(randomDirPath)){
                    await new Promise(resolve=>setTimeout(resolve, 100));
                    fs.rmSync(randomDirPath,{ recursive: true, force: true });
                    console.log(`Deleted temporary folder: ${randomDirPath}`);
                }
                clearTimeout(shutdownTimeout);
                console.log("Cleanup completed successfully");
                process.exit(0);
            }
            catch (err){
                console.error("Error during cleanup:", err);
                clearTimeout(shutdownTimeout);
                process.exit(1);
            }
        });
    }
    catch (err){
        console.error("Error during shutdown:", err);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
};
["SIGINT", "SIGTERM", "SIGQUIT"].forEach(signal=>{
    process.on(signal, ()=>gracefulShutdown(signal));
});
process.on("uncaughtException", (err)=>{
    console.error("Uncaught Exception:", err);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});
process.on("unhandledRejection", (reason, promise)=>{
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});
server.on("error", (err)=>{
    console.error("Server error:", err.message);
    gracefulShutdown("SERVER_ERROR");
});