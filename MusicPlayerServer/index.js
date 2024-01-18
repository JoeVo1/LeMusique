import { Server } from 'socket.io'
import input from 'input'
import fs from 'fs/promises'
import sf from 'music-metadata'
import { Timer } from 'timer-node'
import express from 'express'
import http from 'http'

const app = express()
const server = http.createServer(app)

const io = new Server(server)
const timer = new Timer()
let songLength
const musicFiles = []
const musicLoc = "./music/"
const usernames = []
let curPlaying
timer.start()

io.on("connection",(socket)=>{
    const username = ""
    socket.on("ping",()=>{
        console.log("server pinged. Pinging client.");
        socket.emit("ping");
    })
    socket.on("user", (user)=>{
        if (user.includes(' ') || user.length > 20){
            socket.emit("disconnectReason", "Name Cannot include spaces or be longer than 20 characters.")
            socket.disconnect(true)
        }
        else if(user == "username"){
            socket.emit("disconnectReason", "Name must be changed from default name before joining.")
            socket.disconnect(true)
        }
        else {
            const username = user
            usernames.push(username)
            io.emit("join", (username + " Has joined the room."));
            console.log("\n" + username + " Has joined the room.")
        }
    })
    socket.on("listusers",()=>{
        socket.emit("listusers",(usernames))
    })
    socket.on("gettime",()=>{
        if(songLength == null || timer.ms() == null) {
            socket.emit("gettime", null)
            return
        }
        let info = [songLength, timer.ms()]
        socket.emit("gettime", info)
    })

    socket.on("disconnect", (res) => {
        const index = usernames.indexOf(username);
        if (index != null) {
            usernames.splice(index, 1);
            console.log("\nA client has disconnected. Reason: " + res);
        }
    });
    
})

server.listen(8008)

while(true){
    let inputtext = await input.text("Console");
    if(inputtext == "start"){
        StartMusicLoop()
    }
    else if(inputtext == "pause"){
        console.log("Paused.")
        timer.pause()
        io.emit("pause",(timer.ms()))
    }
    else if(inputtext == "resume"){
        console.log("Resumed.")
        io.emit("resume")
        timer.resume()
    }
}

function Random(min, max){
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function StartMusicLoop(){
    if(musicFiles.length === 0){
        console.log("\nRan out of music to play. Looping music.")
        await PushAllMusicFiles()
    }
    let random = Random(0, musicFiles.length - 1);
    timer.clear()
    timer.start()
    curPlaying = musicFiles[random]
    io.emit("start", curPlaying)
    let curPlayingPath = musicLoc + curPlaying
    songLength = (await sf.parseFile(curPlayingPath)).format.duration * 1000
    let index = usernames.indexOf(curPlaying);
    musicFiles.splice(index, 1);
    console.log("\nNow Playing: " + curPlaying + "\nSongs Left in loop:" + musicFiles.length)
    WaitForSongEnd()
}

async function PushAllMusicFiles(){
    (await fs.readdir(musicLoc)).forEach(file => {
        if(!file.endsWith(".wav")) {Console.log("\nFile Declined: " + file)}
        musicFiles.push(file)
    });
}

async function WaitForSongEnd (){
    let interval = setInterval(() => {
        if(timer.ms() < songLength) return
        else {
            console.log("\n" +curPlaying + " has finished playing.")
        StartMusicLoop()
        clearInterval(interval)
    }
    }, 500);
}