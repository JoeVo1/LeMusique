import { io } from "https://cdn.socket.io/4.8.0/socket.io.esm.min.js"

let socket = null;
const host = window.location.host
let audioNode = document.getElementById("audio")
const volumeSlider = document.getElementById("volume")
const syncBtn = document.getElementById("sync")
const pingBtn = document.getElementById("ping")
const title = document.getElementById("name")
const songPos = document.getElementById("songpos")
const songLength = document.getElementById("songlength")
const listelements = document.getElementById("list").children
const myConsole = document.getElementById("_console")
const progressBar = document.getElementById("progress")
let persistentconsole = ""
let consoletimeoutID
let musiclist = [] 
let audioUrl = null
let volume = 0.5
let curplaying
let syncPrecision = 1000
let pingStart

socket = io(host)

socket.on("ping", ()=>{
    setConsole("ping recieved in: " + (Date.now() - pingStart) + "ms")
})

socket.on("sync", async(res)=>{
    syncAudio(res)
})

socket.on("pause", (res)=>{
    audioNode.pause()
    audioNode.currentTime = res * 0.001
    persistentconsole = "Paused by server"
    setConsole("Paused by server")
})

socket.on("resume", ()=>{
    audioNode.play()
    persistentconsole = ""
    setConsole("Resumed by server")
})

socket.on("listmusic", (res)=>{
    musiclist = res
    relist()
})

socket.on("start", async(res)=>{
    changeVolume(volumeSlider.value)
    socket.emit("sync")
    playAudio()
})

socket.on("connect", ()=>{
    setTitle("Connected to server.", false)
    socket.emit("sync")
    socket.emit("listmusic")
})

const playAudio = ()=>{
    audioNode.volume = volume
    const tryPlay = setInterval(() => {
        socket.emit("sync")
        audioNode.play()
        .then(()=>{clearInterval(tryPlay); socket.emit("sync")})
        .catch((e)=>{setConsole("Click to allow audio, or something went wrong.\n" +  "error: " + e)})
    }, 200);
}

const syncAudio = async(res) =>{
    console.log("shdauif")
    if(res.audio !=  curplaying){
        if(audioUrl != null) window.URL.revokeObjectURL(audioUrl);
        const buffer = await(fetch(`http://${host}/download/${res.audio}`))
        const blob = new Blob([await buffer.arrayBuffer()], { type: "audio/wav" });
        audioUrl = window.URL.createObjectURL(blob);
        audioNode.src = audioUrl;
        curplaying = res.audio
        setTitle(curplaying, true)
        playAudio()
        socket.emit("sync")
    }
    if(Math.abs(res.time - audioNode.currentTime * 1000) > syncPrecision){
        audioNode.currentTime = res.time * 0.001
    }
    setConsole("Synced time.")
}

const setTitle = (name, slice)=>{
    if(slice) {name = name.slice(0,name.length - 4)}
    if(name.length > 50) {name = name.slice(0, 50)}
    document.title = name
    title.innerText = name
}

const setConsole = async (title)=>{
    myConsole.innerHTML = title
    clearTimeout(consoletimeoutID)
    consoletimeoutID = setTimeout(() => {
        myConsole.innerHTML = persistentconsole
    }, 3000)
}

const relist = ()=>{
    if(musiclist.length == 0) return
    let i = 0
    musiclist.forEach(element => {
        element = element.slice(0, element.length - 4)
        listelements[i].innerHTML = element.length > 29 ? element.slice(0,29) + "..." : element
        listelements[i].style.marginBottom = "3px"
        i++
    });
    listelements[i - 1].style.marginBottom = "0px"
    for (let j = musiclist.length; j < listelements.length; j++) {
        listelements[j].innerHTML = ""
        listelements[j].style.marginBottom = "0px"
    }
}

const changeVolume = (value)=>{
    volume = value
    audioNode.volume = volume
    volumeSlider.value = volume
}

const UpdateProgressBar = ()=>{
    progressBar.value = audioNode.currentTime
}

const saveCookie = (value)=>{
    let d = new Date()
    d.setTime(d.getTime() + 604800000)
    document.cookie = `volume=${value};expires=`+d.toUTCString()+';path=/'
}

const getCookieVolume = ()=>{
    const cookie = document.cookie
    if(cookie == null || "") {return 0.5}
    const volume = parseFloat(cookie.slice(7))
    if(isNaN(volume)) return 0.5
    return volume
}

function convertTime(seconds) {
    var seconds = Math.floor(parseInt(seconds, 10))
    var hours   = Math.floor(seconds / 3600)
    var minutes = Math.floor((seconds - (hours * 3600)) / 60)
    var seconds = seconds - (hours * 3600) - (minutes * 60)
    seconds = (seconds >= 10 ? "" : "0") + seconds
    if ( !!hours ) {
      if ( !!minutes ) {
        return `${hours}:${minutes}:${seconds}`
      } else {
        return `${hours}:${seconds}:`
      }
    }
    if ( !!minutes ) {
      return `${minutes}:${seconds}`
    }
    return `0:${seconds}`
}

const postInit = ()=>{
    changeVolume(getCookieVolume())
    window.onfocus = ()=>{
        songPos.innerHTML = (convertTime(audioNode.currentTime))
        audioNode.ontimeupdate = ()=>{UpdateProgressBar(), songPos.innerHTML = (convertTime(audioNode.currentTime))}
    }
    window.onblur = ()=>{
        audioNode.ontimeupdate = null
    }
    volumeSlider.addEventListener("input", ()=>{
        changeVolume(volumeSlider.value)
    })
    
    volumeSlider.addEventListener("change", ()=>{
        saveCookie(volumeSlider.value)
    })
    
    syncBtn.addEventListener("click", ()=>{
        socket.emit("sync")
    })
    
    pingBtn.addEventListener("click", ()=>{
        pingStart = Date.now()
        socket.emit("ping")
    })
    audioNode.ondurationchange = ()=>{songLength.innerHTML = convertTime(audioNode.duration); progressBar.max = audioNode.duration}
}

postInit()