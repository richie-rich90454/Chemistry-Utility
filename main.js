let {app, BrowserWindow}=require("electron")
let path=require("path")
let Fastify=require("fastify")
let fs=require("fs")
let mainWindow
let fastifyServer
let PORT=6005
function createWindow(){
    mainWindow=new BrowserWindow({
        width: 1500,
        height: 1000,
        minWidth: 800,
        minHeight: 800,
        webPreferences:{
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            sandbox: false
        },
        title: "Chemistry Utility",
        icon: path.join(__dirname, "favicon.png"),
        backgroundColor: "#EBEBEB",
        autoHideMenuBar: true,
        fullscreenable: true,
        frame: true,
        titleBarStyle: "hiddenInset"
    })
    mainWindow.maximize();
    startFastifyServer().then(function(){
        mainWindow.loadURL("http://localhost:"+PORT)
    }).catch(function(err){
        console.error("Failed to start server:", err)
        process.exit(1)
    })
    if (process.env.NODE_ENV=="development"){
        mainWindow.webContents.openDevTools()
    }
    mainWindow.on("closed", function(){
        mainWindow=null
    })
}
async function startFastifyServer(){
    fastifyServer=Fastify({logger: false})
    fastifyServer.addHook("onSend", async function(request, reply, payload){
        reply.header("X-Powered-By", undefined)
        return payload
    })
    fastifyServer.addHook("onRequest", async function(request, reply){
        try{
            let base=request.headers.host ? "http://"+request.headers.host : "http://localhost"
            let parsed=new URL(request.raw.url, base)
            request.raw.url=parsed.pathname+parsed.search
        }
        catch(err){
            console.warn("Bad request URL:", request.raw.url)
            reply.code(400).send("Bad Request")
        }
    })
    fastifyServer.get("/api/ptable", async function(request, reply){
        if(request.headers["x-requested-with"]!=="XMLHttpRequest"){
            return reply.code(403).send({
                error: "Forbidden",
                message: "Direct access to API is not allowed"
            })
        }
        let filePath=path.join(__dirname, "ptable.json")
        if(!fs.existsSync(filePath)){
            return reply.code(500).send({
                error: "Server Error",
                message: "Data file not found"
            })
        }
        reply.header("X-Content-Type-Options", "nosniff")
        reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return reply.sendFile("ptable.json", __dirname)
    })
    fastifyServer.get("/ptable.json", async function(request, reply){
        reply.code(403).send({
            error: "Forbidden",
            message: "Direct access to file is not allowed"
        })
    })
    fastifyServer.register(require("@fastify/static"),{
        root: __dirname,
        setHeaders: function(res, filePath){
            res.setHeader(
                "Cache-Control",
                filePath.endsWith(".html") ? "no-store" : "public, max-age=86400"
            )
        }
    })
    fastifyServer.get("/", async function(request, reply){
        reply.header("Cache-Control", "no-store")
        return reply.sendFile("index.html")
    })
    fastifyServer.setNotFoundHandler(function(request, reply){
        if(/^https?:\/\//.test(request.raw.url)){
            return reply.code(400).send("Bad Request")
        }
        reply.header("Cache-Control", "no-store")
        return reply.sendFile("index.html")
    })
    fastifyServer.setErrorHandler(function(error, request, reply){
        console.error("Unexpected error:", error.stack || error)
        reply.code(500).send({error: "Internal Server Error"})
    })
    try{
        await fastifyServer.listen({port: PORT, host: "localhost"})
        console.log("Server running at http://localhost:"+PORT)
    }
    catch(err){
        console.error("Server error:", err)
        throw err
    }
}
app.whenReady().then(createWindow)
app.on("window-all-closed", function(){
    if(process.platform!=="darwin") app.quit()
})
app.on("activate", function(){
    if(mainWindow==null) createWindow()
})
process.on("uncaughtException", function(error){
    console.error("Uncaught Exception:", error)
})