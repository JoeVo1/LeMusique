import { Server, Socket } from 'socket.io'

import fs from 'fs/promises'
import express from 'express'
import sf from 'music-metadata'
import Console from './utils/console'
import Timer from './utils/timer'

let loop = true
let songLength: number
let musicFiles : string[] = []
let curPlaying : string
let playlist = ""
let fullPath = ""
const musicLoc = "./music/"
const path = import.meta.path.replace("index.ts", "")
const app = express()
const expressServer = app.listen(8085, ()=> console.log(colors.green, "Server online.\n"))
const colors = {red: "\x1b[31m%s\x1b[0m", green: "\x1b[32m%s\x1b[0m", yellow: "\x1b[33m%s\x1b[0m"}
const io = new Server(expressServer,{
    cors: {origin: "*"}
})
try{
    const json = JSON.parse(await Bun.file("./config.json").text())
    fullPath = json.fullPath
    const i = json.fullPath.split("/")
    playlist = i[i.findIndex((element: string)=>{return element == "music"}) + 1]
}
catch(e){console.log(colors.red, e)}
console.log("Current playlist set to: " + playlist + "\n")

app.use(express.static("Client"))
app.get("/download/:id", (req, res)=>{
    res.sendFile(`${path}/music/${playlist}/${req.params.id}`)
})

app.get("/favicon.ico", (req, res)=>{
    res.sendFile(`${path}/icons/favicon.png`)
})

let timer = new Timer(()=>{StartMusicLoop()})
const input = new Console
input.listen()

io.on("connection",(socket)=>{
    console.log(colors.green, "New connection:", "There are now " + io.engine.clientsCount + " connections.")
    socket.on("ping",()=>{
        console.log("server pinged. Pinging client.\n");
        socket.emit("ping");
    })

    socket.on("listmusic", ()=>{
        socket.emit("listmusic", musicFiles)
    })

    socket.on("disconnect", (res) => {
        console.log(colors.red, "A client has disconnected.", "Reason: " + res + "\nThere are now: " + io.engine.clientsCount + " connections.\n");
    });
    
    socket.on("sync", ()=>{
        if(timer.paused) return
        socket.emit("sync", ({"time":timer.getTime(), "audio":curPlaying}))
    })

    socket.on("download", async ()=>{
        const files = await fs.readdir(fullPath)
        files.forEach(file => {
            socket.emit("download", file);
        });
    })
})

input.on("start", ()=>{
    StartMusicLoop()
})
input.on("restart", ()=>{
    musicFiles = []
    StartMusicLoop()
})
input.on("pause", ()=>{
    timer.pause()
    console.log(colors.yellow, "Paused.\n")
    io.emit("pause", (timer.getTime()))
})
input.on("resume", ()=>{
    timer.resume()
    console.log(colors.green, "Resumed.\n")
    io.emit("resume")
})
input.on("loop", ()=>{
    loop = !loop
    console.log("loop set to: " + loop + "\n")
})
input.on("help", ()=>{
    console.log("start, pause, resume, loop\n")
})
input.on("changesrc", async (args)=>{
    if(args == null || args.length == 0){console.log("Current playlist is: " + (playlist == null ? "none" : playlist) + "\n"); return}
    try{
        await fs.readdir(musicLoc + args[0] + "/")
        fullPath = musicLoc + args[0] + "/"
        playlist = args[0]
        Bun.write("./config.json", JSON.stringify({"fullPath" : fullPath}))
        musicFiles = []
        console.log(colors.green, "Path successfully set to:", fullPath + "\n")
    }
    catch(e){
        console.log(colors.red, "Something failed:", e)
    }
})
input.on("any", ()=>{
    console.log("Not a command.\n")
})

const Randomize = (array : string [])=>{
    let currentIndex = array.length;

    while (currentIndex != 0) {
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array
}

const StartMusicLoop = async()=>{
    musicFiles = musicFiles.slice(1)
    if(musicFiles.length == 0){
        if(!loop){console.log(colors.yellow, "Loop ended.\n")}
        console.log("Ran out of music to play. Looping music.\n")
        if (await PushAllMusicFiles() == false) return;
        musicFiles = Randomize(musicFiles)
    }
    curPlaying = musicFiles[0]
    console.log("Now Playing: " + curPlaying + "\nSongs Left in loop: " + musicFiles.length + "\n")
    io.emit("start", curPlaying)
    io.emit("listmusic", musicFiles)
    const length = (await sf.parseFile(fullPath + curPlaying)).format.duration
    if(length == null) return
    songLength = length * 1000
    timer.play(songLength)
}

const PushAllMusicFiles = async()=>{
    if(fullPath == ""){console.log(colors.yellow, "Path not set. use 'changesrc'.\n")}
    let files = await fs.readdir(fullPath)
    if(files.length === 0) {
        console.log(colors.red, "There was a problem reading the music folder. Is it empty?")
        return false;
    }
    (files).forEach(file => {
        if(!file.endsWith(".wav")) {console.log(colors.yellow, "\nFile Declined: " + file + "\n")}
        musicFiles.push(file)
    });
    return true;
}
